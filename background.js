// Owns the focus session so it keeps running (and its blocks get lifted) no matter
// how many dashboard tabs are open, closed, or reloaded.

const storageKey = "momentumSettings";
const sessionKey = "momentumSession";
const assistantStorageKey = "momentumAssistant";
const ringingKey = "momentumRinging";
const taskCheckKey = "momentumTaskCheck";
const badgeAlarmName = "badge-tick";
const alarmName = "focus-end";
const clockAlarmPrefix = "clock-";
const snoozePrefix = "snooze-";
const blockRuleId = 1;
const snoozeMinutes = 5;
const ringSeconds = 60;
// An alarm that fires this late (the computer was asleep or Chrome closed) is skipped.
const staleAlarmMs = 15 * 60 * 1000;

let queue = Promise.resolve();

// Run one task at a time so a page message and the alarm can't both end a session.
function serial(task) {
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return run;
}

async function getStored(key) {
  const result = await chrome.storage.local.get(key);
  return result[key];
}

function remainingSeconds(session) {
  return session.paused
    ? session.remainingSeconds
    : Math.max(0, Math.ceil((session.endTime - Date.now()) / 1000));
}

function parseBlockedSites(text) {
  return [...new Set(
    String(text || "")
      .split(/[\s,]+/)
      .map((entry) => entry.trim().toLowerCase().replace(/^[a-z]+:\/\//, "").replace(/^www\./, "").split("/")[0])
      .filter((entry) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(entry)),
  )];
}

function setNotifications(blocked) {
  return new Promise((resolve) => {
    const done = () => {
      void chrome.runtime.lastError;
      resolve();
    };
    if (blocked) {
      chrome.contentSettings.notifications.set({ primaryPattern: "<all_urls>", setting: "block" }, done);
    } else {
      chrome.contentSettings.notifications.clear({}, done);
    }
  });
}

async function appendAssistantMessage(text) {
  const messages = (await getStored(assistantStorageKey)) || [];
  messages.push({ role: "assistant", text });
  await chrome.storage.local.set({ [assistantStorageKey]: messages.slice(-40) });
}

// Bring site and notification blocking in line with the current settings and session.
// Blocking only applies while focusing; breaks are free.
async function applyBlocks() {
  const [settings = {}, session] = await Promise.all([getStored(storageKey), getStored(sessionKey)]);
  const focusing = Boolean(session) && (session.phase || "focus") === "focus";
  const groups = Array.isArray(settings.blockGroups) ? settings.blockGroups : [];
  const domains = focusing && settings.blockSites && !session.sitesUnblocked
    ? parseBlockedSites(groups.filter((group) => group.enabled).flatMap((group) => group.sites || []).join("\n"))
    : [];
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [blockRuleId],
    addRules: domains.length
      ? [{
          id: blockRuleId,
          priority: 1,
          action: { type: "redirect", redirect: { extensionPath: "/blocked.html" } },
          condition: { requestDomains: domains, resourceTypes: ["main_frame"] },
        }]
      : [],
  }).catch(() => {});
  await setNotifications(focusing && settings.blockNotifications !== false);
}

// --- Toolbar badge: minutes left on the extension icon

const badgeColors = { focus: "#c8643f", break: "#3f8f5a" };

async function updateBadge() {
  const session = await getStored(sessionKey);
  if (!session) {
    await chrome.action.setBadgeText({ text: "" });
    await chrome.action.setTitle({ title: "Focus Plus" });
    await chrome.alarms.clear(badgeAlarmName);
    return;
  }
  const remaining = remainingSeconds(session);
  const minutes = Math.ceil(remaining / 60);
  const isBreak = session.phase && session.phase !== "focus";
  let text = remaining < 60 ? "<1" : String(minutes);
  if (session.paused) text = "❚❚";
  await chrome.action.setBadgeBackgroundColor({ color: isBreak ? badgeColors.break : badgeColors.focus });
  await chrome.action.setBadgeTextColor?.({ color: "#ffffff" });
  await chrome.action.setBadgeText({ text });
  const what = isBreak ? "Break" : `Focus: ${session.task}`;
  await chrome.action.setTitle({ title: `${what} · ${session.paused ? "paused" : `${minutes} min left`}` });
  if (session.paused) {
    await chrome.alarms.clear(badgeAlarmName);
  } else if (!(await chrome.alarms.get(badgeAlarmName))) {
    await chrome.alarms.create(badgeAlarmName, { periodInMinutes: 0.5 });
  }
}

// --- Focus sessions and focus/break cycles

function clampNumber(value, fallback, min, max) {
  const number = Math.round(Number(value));
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function cycleSettings(settings) {
  return {
    enabled: Boolean(settings.cyclesEnabled),
    breakMinutes: clampNumber(settings.breakMinutes, 5, 1, 60),
    longBreakMinutes: clampNumber(settings.longBreakMinutes, 15, 1, 120),
    rounds: clampNumber(settings.roundsBeforeLongBreak, 4, 2, 12),
    autoStartFocus: settings.autoStartFocus !== false,
  };
}

function notify(id, title, message, buttons) {
  chrome.notifications.create(id, {
    type: "basic",
    iconUrl: "icons/icon128.png",
    title,
    message,
    ...(buttons ? { buttons } : {}),
  }, () => void chrome.runtime.lastError);
}

// Start one phase (a focus round or a break) of the current session.
async function startPhase(fields) {
  const totalSeconds = Math.round(fields.minutes * 60);
  const session = {
    id: crypto.randomUUID(),
    phase: "focus",
    round: 1,
    ...fields,
    totalSeconds,
    endTime: Date.now() + totalSeconds * 1000,
    paused: false,
    remainingSeconds: totalSeconds,
  };
  delete session.minutes;
  await chrome.storage.local.set({ [sessionKey]: session });
  await chrome.alarms.create(alarmName, { when: session.endTime });
  await applyBlocks();
  await updateBadge();
}

async function startSession({ task, minutes, taskId }) {
  await startPhase({ task, taskId: taskId || null, focusMinutes: minutes, minutes, phase: "focus", round: 1 });
}

async function pauseSession() {
  const session = await getStored(sessionKey);
  if (!session || session.paused) return;
  await chrome.alarms.clear(alarmName);
  await chrome.storage.local.set({
    [sessionKey]: { ...session, paused: true, remainingSeconds: remainingSeconds(session) },
  });
  await updateBadge();
}

async function resumeSession() {
  const session = await getStored(sessionKey);
  if (!session || !session.paused) return;
  const endTime = Date.now() + session.remainingSeconds * 1000;
  await chrome.storage.local.set({ [sessionKey]: { ...session, paused: false, endTime } });
  await chrome.alarms.create(alarmName, { when: endTime });
  await updateBadge();
}

async function clearSession() {
  await chrome.storage.local.remove(sessionKey);
  await chrome.alarms.clear(alarmName);
  await applyBlocks();
  await updateBadge();
}

async function recordFocus(session, completed, remaining) {
  const settings = (await getStored(storageKey)) || {};
  const history = Array.isArray(settings.focusHistory) ? settings.focusHistory : [];
  history.push({
    task: session.task,
    plannedMinutes: Math.round(session.totalSeconds / 60),
    actualSeconds: completed ? session.totalSeconds : Math.max(0, session.totalSeconds - remaining),
    completed,
    timestamp: new Date().toISOString(),
  });
  await chrome.storage.local.set({
    [storageKey]: { ...settings, focusHistory: history, updatedAt: Math.max(Date.now(), (settings.updatedAt || 0) + 1) },
  });
  return settings;
}

// `completed` is true when the timer ran out, false when the user stopped it.
async function endSession(completed) {
  const session = await getStored(sessionKey);
  if (!session) return;
  const remaining = remainingSeconds(session);
  if (completed && remaining > 1) return;

  const phase = session.phase || "focus";
  if (phase !== "focus") {
    // A break ended (or was cut short).
    const settings = (await getStored(storageKey)) || {};
    const cycles = cycleSettings(settings);
    if (completed && cycles.enabled && cycles.autoStartFocus) {
      await startPhase({ ...nextFocusFields(session), minutes: session.focusMinutes });
      if (settings.notifyOnComplete !== false) {
        notify(`focus-phase-${session.id}`, "Back to focus", `Round ${session.round + 1} on "${session.task}".`);
      }
      await playSound(settings.focusEndSound ?? "chime", 2);
      return;
    }
    await clearSession();
    if (completed) {
      if (settings.notifyOnComplete !== false) {
        notify(`focus-phase-${session.id}`, "Break's over", `Start your next round on "${session.task}" when you're ready.`);
      }
      await playSound(settings.focusEndSound ?? "chime", 2);
    }
    return;
  }

  const settings = await recordFocus(session, completed, remaining);
  if (!completed) {
    await clearSession();
    return;
  }

  const minutes = Math.round(session.totalSeconds / 60);
  await appendAssistantMessage(`Nice work! You finished a ${minutes}-minute focus session on "${session.task}".`);
  const openTask = session.taskId && (settings.tasks || []).find((task) => task.id === session.taskId && !task.completed);
  if (openTask) await chrome.storage.local.set({ [taskCheckKey]: { taskId: openTask.id, text: openTask.text } });

  const cycles = cycleSettings(settings);
  let message = `${minutes} minutes on "${session.task}". Time for a short break.`;
  if (cycles.enabled) {
    const longBreak = session.round % cycles.rounds === 0;
    const breakMinutes = longBreak ? cycles.longBreakMinutes : cycles.breakMinutes;
    await startPhase({
      task: session.task,
      taskId: session.taskId,
      focusMinutes: session.focusMinutes,
      round: session.round,
      phase: longBreak ? "longBreak" : "break",
      minutes: breakMinutes,
    });
    message = `${minutes} minutes on "${session.task}". Take a ${breakMinutes}-minute ${longBreak ? "long " : ""}break.`;
  } else {
    await clearSession();
  }
  if (settings.notifyOnComplete !== false) {
    notify(
      `focus-done-${session.id}`,
      cycles.enabled ? `Round ${session.round} done` : "Focus session complete",
      message,
      openTask ? [{ title: "Mark task done" }] : undefined,
    );
  }
  await playSound(settings.focusEndSound ?? "chime", 4);
}

function nextFocusFields(session) {
  return {
    task: session.task,
    taskId: session.taskId,
    focusMinutes: session.focusMinutes,
    phase: "focus",
    round: session.round + 1,
  };
}

// End a break early and start the next focus round now.
async function skipBreak() {
  const session = await getStored(sessionKey);
  if (!session || (session.phase || "focus") === "focus") return;
  await startPhase({ ...nextFocusFields(session), minutes: session.focusMinutes });
}

async function markTaskDone(taskId) {
  const settings = (await getStored(storageKey)) || {};
  const tasks = Array.isArray(settings.tasks) ? settings.tasks : [];
  if (tasks.some((task) => task.id === taskId)) {
    await chrome.storage.local.set({
      [storageKey]: {
        ...settings,
        tasks: tasks.map((task) => (task.id === taskId ? { ...task, completed: true } : task)),
        updatedAt: Math.max(Date.now(), (settings.updatedAt || 0) + 1),
      },
    });
  }
  const check = await getStored(taskCheckKey);
  if (check?.taskId === taskId) await chrome.storage.local.remove(taskCheckKey);
}

// Keyboard shortcuts (see "commands" in manifest.json).
async function runCommand(command) {
  const session = await getStored(sessionKey);
  if (command === "toggle-focus") {
    if (!session) {
      const settings = (await getStored(storageKey)) || {};
      await startSession({ task: settings.focus || "Untitled focus", minutes: clampNumber(settings.focusMinutes, 25, 1, 720) });
    } else if (session.paused) {
      await resumeSession();
    } else {
      await pauseSession();
    }
  }
  if (command === "stop-focus" && session) await endSession(false);
}

async function unblockSites() {
  const session = await getStored(sessionKey);
  if (session) await chrome.storage.local.set({ [sessionKey]: { ...session, sitesUnblocked: true } });
  await applyBlocks();
}

// Finish a session that ran out while the browser was closed, and clear any leftover blocks.
async function reconcile() {
  const session = await getStored(sessionKey);
  if (session && !session.paused) {
    if (remainingSeconds(session) <= 0) {
      await endSession(true);
      return;
    }
    await chrome.alarms.create(alarmName, { when: session.endTime });
  }
  await applyBlocks();
  await updateBadge();
}

// --- Sounds (played by offscreen.html, since a service worker has no audio)

async function ensureOffscreen() {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["AUDIO_PLAYBACK"],
    justification: "Play alarm and focus-end sounds.",
  }).catch(() => {});
}

async function playSound(sound, seconds) {
  if (!sound || sound === "none") return;
  const settings = (await getStored(storageKey)) || {};
  await ensureOffscreen();
  await chrome.runtime.sendMessage({
    target: "offscreen",
    type: "play",
    sound,
    seconds,
    volume: settings.alarmVolume ?? 70,
  }).catch(() => {});
}

async function closeOffscreen() {
  if (await chrome.offscreen.hasDocument()) await chrome.offscreen.closeDocument().catch(() => {});
}

// --- Alarm clock

function nextOccurrence(alarm, from = new Date()) {
  const [hours, minutes] = String(alarm.time || "").split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  const next = new Date(from);
  next.setHours(hours, minutes, 0, 0);
  if (next <= from) next.setDate(next.getDate() + 1);
  if (alarm.repeat === "weekdays") {
    while (next.getDay() === 0 || next.getDay() === 6) next.setDate(next.getDate() + 1);
  }
  return next;
}

// Keep one chrome alarm per enabled alarm, set to its next occurrence.
async function scheduleClockAlarms() {
  const settings = (await getStored(storageKey)) || {};
  const wanted = new Map();
  (Array.isArray(settings.alarms) ? settings.alarms : [])
    .filter((alarm) => alarm.enabled)
    .forEach((alarm) => {
      const next = nextOccurrence(alarm);
      if (next) wanted.set(clockAlarmPrefix + alarm.id, next.getTime());
    });
  const existing = await chrome.alarms.getAll();
  for (const alarm of existing) {
    if (alarm.name.startsWith(clockAlarmPrefix) && !wanted.has(alarm.name)) await chrome.alarms.clear(alarm.name);
  }
  for (const [name, when] of wanted) {
    const current = existing.find((alarm) => alarm.name === name);
    if (!current || Math.abs(current.scheduledTime - when) > 1000) await chrome.alarms.create(name, { when });
  }
}

function formatTime(time, use24Hour) {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: !use24Hour });
}

async function ringAlarm(alarm) {
  const settings = (await getStored(storageKey)) || {};
  const label = alarm.label || "Alarm";
  await chrome.storage.local.set({ [ringingKey]: { id: alarm.id, label, time: alarm.time } });
  chrome.notifications.create(`alarm-${alarm.id}`, {
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: `⏰ ${label}`,
    message: `It's ${formatTime(alarm.time, settings.use24Hour)}.`,
    buttons: [{ title: "Stop" }, { title: `Snooze ${snoozeMinutes} min` }],
    requireInteraction: true,
    priority: 2,
  }, () => void chrome.runtime.lastError);
  await playSound(settings.alarmSound ?? "bell", ringSeconds);
}

async function onClockAlarm(id, scheduledTime, snoozed) {
  if (Date.now() - scheduledTime > staleAlarmMs) {
    await scheduleClockAlarms();
    return;
  }
  const settings = (await getStored(storageKey)) || {};
  const alarms = Array.isArray(settings.alarms) ? settings.alarms : [];
  const alarm = alarms.find((candidate) => candidate.id === id);
  if (!alarm || (!alarm.enabled && !snoozed)) return;
  await ringAlarm(alarm);
  if (!snoozed && alarm.repeat === "once") {
    // A one-time alarm switches itself off after ringing.
    const updated = alarms.map((candidate) => (candidate.id === id ? { ...candidate, enabled: false } : candidate));
    await chrome.storage.local.set({
      [storageKey]: { ...settings, alarms: updated, updatedAt: Math.max(Date.now(), (settings.updatedAt || 0) + 1) },
    });
  }
  await scheduleClockAlarms();
}

// `alarmId` comes from a notification button; without it, act on whatever is ringing.
async function stopAlarm(alarmId) {
  const ringing = await getStored(ringingKey);
  const id = alarmId ?? ringing?.id;
  if (!alarmId || ringing?.id === alarmId) {
    await chrome.storage.local.remove(ringingKey);
    await closeOffscreen();
  }
  if (id) chrome.notifications.clear(`alarm-${id}`);
  return id;
}

async function snoozeAlarm(alarmId) {
  const id = await stopAlarm(alarmId);
  if (id) await chrome.alarms.create(snoozePrefix + id, { when: Date.now() + snoozeMinutes * 60 * 1000 });
}

// Playback finished on its own (a short sound, or a ring nobody stopped).
async function soundDone() {
  await chrome.storage.local.remove(ringingKey);
  await closeOffscreen();
}

const handlers = {
  "focus:start": startSession,
  "focus:pause": pauseSession,
  "focus:resume": resumeSession,
  "focus:stop": () => endSession(false),
  "focus:complete": () => endSession(true),
  "focus:unblock": unblockSites,
  "focus:skipBreak": skipBreak,
  "task:done": ({ taskId }) => markTaskDone(taskId),
  "alarm:stop": () => stopAlarm(),
  "alarm:snooze": () => snoozeAlarm(),
  "sound:preview": ({ sound }) => playSound(sound, 2.5),
  "sound:done": soundDone,
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handler = handlers[message?.type];
  if (!handler) return false;
  serial(() => handler(message)).then(() => sendResponse({ ok: true }), (error) => sendResponse({ ok: false, error: String(error) }));
  return true;
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === alarmName) serial(() => endSession(true));
  if (alarm.name === badgeAlarmName) serial(updateBadge);
  if (alarm.name.startsWith(clockAlarmPrefix)) {
    serial(() => onClockAlarm(alarm.name.slice(clockAlarmPrefix.length), alarm.scheduledTime, false));
  }
  if (alarm.name.startsWith(snoozePrefix)) {
    serial(() => onClockAlarm(alarm.name.slice(snoozePrefix.length), alarm.scheduledTime, true));
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes[storageKey] || changes[sessionKey]) serial(applyBlocks);
  if (changes[storageKey]) serial(scheduleClockAlarms);
});

chrome.notifications.onClicked.addListener((id) => {
  if (id.startsWith("alarm-")) {
    serial(() => stopAlarm(id.slice("alarm-".length)));
    return;
  }
  // Clicking the "session complete" notification opens the dashboard.
  if (!id.startsWith("focus-done-")) return;
  chrome.notifications.clear(id);
  chrome.tabs.create({});
});

chrome.notifications.onButtonClicked.addListener((id, buttonIndex) => {
  if (id.startsWith("focus-done-")) {
    // The only button on a finished-session notification is "Mark task done".
    chrome.notifications.clear(id);
    serial(async () => {
      const check = await getStored(taskCheckKey);
      if (check) await markTaskDone(check.taskId);
    });
    return;
  }
  if (!id.startsWith("alarm-")) return;
  const alarmId = id.slice("alarm-".length);
  serial(() => (buttonIndex === 0 ? stopAlarm(alarmId) : snoozeAlarm(alarmId)));
});

chrome.notifications.onClosed.addListener((id, byUser) => {
  if (id.startsWith("alarm-") && byUser) serial(() => stopAlarm(id.slice("alarm-".length)));
});

chrome.commands.onCommand.addListener((command) => serial(() => runCommand(command)));

chrome.runtime.onStartup.addListener(() => serial(reconcile));
chrome.runtime.onInstalled.addListener(() => serial(reconcile));
chrome.runtime.onStartup.addListener(() => serial(scheduleClockAlarms));
chrome.runtime.onInstalled.addListener(() => serial(scheduleClockAlarms));
