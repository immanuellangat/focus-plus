// Owns the focus session so it keeps running (and its blocks get lifted) no matter
// how many dashboard tabs are open, closed, or reloaded.

const storageKey = "momentumSettings";
const sessionKey = "momentumSession";
const assistantStorageKey = "momentumAssistant";
const alarmName = "focus-end";
const blockRuleId = 1;

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

// Bring site and notification blocking in line with the current settings and session.
async function applyBlocks() {
  const [settings = {}, session] = await Promise.all([getStored(storageKey), getStored(sessionKey)]);
  const groups = Array.isArray(settings.blockGroups) ? settings.blockGroups : [];
  const domains = session && settings.blockSites && !session.sitesUnblocked
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
  await setNotifications(Boolean(session) && settings.blockNotifications !== false);
}

async function appendAssistantMessage(text) {
  const messages = (await getStored(assistantStorageKey)) || [];
  messages.push({ role: "assistant", text });
  await chrome.storage.local.set({ [assistantStorageKey]: messages.slice(-40) });
}

async function startSession({ task, minutes }) {
  const totalSeconds = Math.round(minutes * 60);
  const session = {
    id: crypto.randomUUID(),
    task,
    totalSeconds,
    endTime: Date.now() + totalSeconds * 1000,
    paused: false,
    remainingSeconds: totalSeconds,
  };
  await chrome.storage.local.set({ [sessionKey]: session });
  await chrome.alarms.create(alarmName, { when: session.endTime });
  await applyBlocks();
}

async function pauseSession() {
  const session = await getStored(sessionKey);
  if (!session || session.paused) return;
  await chrome.alarms.clear(alarmName);
  await chrome.storage.local.set({
    [sessionKey]: { ...session, paused: true, remainingSeconds: remainingSeconds(session) },
  });
}

async function resumeSession() {
  const session = await getStored(sessionKey);
  if (!session || !session.paused) return;
  const endTime = Date.now() + session.remainingSeconds * 1000;
  await chrome.storage.local.set({ [sessionKey]: { ...session, paused: false, endTime } });
  await chrome.alarms.create(alarmName, { when: endTime });
}

async function endSession(completed) {
  const session = await getStored(sessionKey);
  if (!session) return;
  const remaining = remainingSeconds(session);
  if (completed && remaining > 1) return;

  const settings = (await getStored(storageKey)) || {};
  const history = Array.isArray(settings.focusHistory) ? settings.focusHistory : [];
  history.push({
    task: session.task,
    plannedMinutes: Math.round(session.totalSeconds / 60),
    actualSeconds: completed ? session.totalSeconds : Math.max(0, session.totalSeconds - remaining),
    completed,
    timestamp: new Date().toISOString(),
  });
  await chrome.storage.local.set({ [storageKey]: { ...settings, focusHistory: history, updatedAt: Date.now() } });
  await chrome.storage.local.remove(sessionKey);
  await chrome.alarms.clear(alarmName);
  if (completed) {
    await appendAssistantMessage(
      `Nice work! You finished a ${Math.round(session.totalSeconds / 60)}-minute focus session on "${session.task}".`,
    );
  }
  await applyBlocks();
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
}

const handlers = {
  "focus:start": startSession,
  "focus:pause": pauseSession,
  "focus:resume": resumeSession,
  "focus:stop": () => endSession(false),
  "focus:complete": () => endSession(true),
  "focus:unblock": unblockSites,
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handler = handlers[message?.type];
  if (!handler) return false;
  serial(() => handler(message)).then(() => sendResponse({ ok: true }), (error) => sendResponse({ ok: false, error: String(error) }));
  return true;
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === alarmName) serial(() => endSession(true));
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes[storageKey] || changes[sessionKey])) serial(applyBlocks);
});

chrome.runtime.onStartup.addListener(() => serial(reconcile));
chrome.runtime.onInstalled.addListener(() => serial(reconcile));
