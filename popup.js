// Toolbar popup: start or control a focus session from any page.
// background.js owns the session; this only sends requests and shows the stored state.

const storageKey = "momentumSettings";
const sessionKey = "momentumSession";

const $ = (selector) => document.querySelector(selector);
let settings = {};
let session = null;
let tickId = null;

const phaseLabels = { focus: "Focus", break: "Short break", longBreak: "Long break" };

function remainingSeconds(current) {
  return current.paused
    ? current.remainingSeconds
    : Math.max(0, Math.ceil((current.endTime - Date.now()) / 1000));
}

function formatCountdown(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function send(message) {
  return chrome.runtime.sendMessage(message).catch(() => {});
}

function openTasks() {
  return (settings.tasks || []).filter((task) => !task.completed);
}

function renderStats() {
  const stats = focusStats(settings.focusHistory);
  const streak = stats.streak ? ` · 🔥 ${stats.streak}` : "";
  $("#popup-stats").textContent = `Today ${formatMinutes(stats.todayMinutes)}${streak}`;
}

function renderIdle() {
  const task = $("#popup-task");
  if (document.activeElement !== task) task.value = settings.focus || "";
  $("#popup-task-list").replaceChildren(
    ...openTasks().map((item) => {
      const option = document.createElement("option");
      option.value = item.text;
      return option;
    }),
  );
  const minutes = String(settings.focusMinutes || 25);
  const select = $("#popup-minutes");
  if (![...select.options].some((option) => option.value === minutes)) {
    select.add(new Option(`${minutes} min`, minutes));
  }
  select.value = minutes;
  $("#popup-cycles").checked = Boolean(settings.cyclesEnabled);
}

function tick() {
  if (!session) return;
  $("#popup-time").textContent = formatCountdown(remainingSeconds(session));
}

function renderSession() {
  $("#popup-idle").hidden = Boolean(session);
  $("#popup-running").hidden = !session;
  clearInterval(tickId);
  if (!session) {
    renderIdle();
    return;
  }
  const phase = session.phase || "focus";
  const isBreak = phase !== "focus";
  const round = settings.cyclesEnabled && phase === "focus" ? ` · round ${session.round}` : "";
  $("#popup-phase").textContent = `${phaseLabels[phase] || "Focus"}${round}${session.paused ? " · paused" : ""}`;
  $("#popup-phase").classList.toggle("break", isBreak);
  $("#popup-task-name").textContent = isBreak ? `Next: ${session.task}` : session.task;
  $("#popup-pause").textContent = session.paused ? "Resume" : "Pause";
  $("#popup-skip").hidden = !isBreak;
  tick();
  tickId = setInterval(tick, 1000);
}

$("#popup-start").addEventListener("click", async () => {
  const task = $("#popup-task").value.trim() || "Untitled focus";
  const minutes = Number($("#popup-minutes").value) || 25;
  const linked = openTasks().find((item) => item.text === task);
  // Remember these choices the same way the dashboard does.
  await chrome.storage.local.set({
    [storageKey]: {
      ...settings,
      focus: task,
      focusMinutes: minutes,
      cyclesEnabled: $("#popup-cycles").checked,
      updatedAt: Math.max(Date.now(), (settings.updatedAt || 0) + 1),
    },
  });
  await send({ type: "focus:start", task, minutes, taskId: linked?.id });
});

$("#popup-pause").addEventListener("click", () => send({ type: session?.paused ? "focus:resume" : "focus:pause" }));
$("#popup-stop").addEventListener("click", () => send({ type: "focus:stop" }));
$("#popup-skip").addEventListener("click", () => send({ type: "focus:skipBreak" }));
$("#popup-open").addEventListener("click", () => {
  chrome.tabs.create({});
  window.close();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes[storageKey]) {
    settings = changes[storageKey].newValue || {};
    renderStats();
    if (!session) renderIdle();
  }
  if (changes[sessionKey]) {
    session = changes[sessionKey].newValue || null;
    renderSession();
  }
});

chrome.storage.local.get([storageKey, sessionKey, proStorageKey]).then((stored) => {
  settings = stored[storageKey] || {};
  session = stored[sessionKey] || null;
  const accent = proStatus(stored[proStorageKey]).active && accentColors[settings.accent];
  if (accent) document.documentElement.style.setProperty("--accent", accent.hex);
  renderStats();
  renderSession();
});
