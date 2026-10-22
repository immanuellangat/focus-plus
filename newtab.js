const storageKey = "momentumSettings";
const assistantStorageKey = "momentumAssistant";

const quotes = [
  "The secret of getting ahead is getting started.",
  "Small steps every day add up to big results.",
  "Focus on being productive instead of busy.",
  "What you do today can improve all your tomorrows.",
  "Great things are done by a series of small things brought together.",
  "Start where you are. Use what you have. Do what you can.",
  "Done is better than perfect.",
  "Discipline is choosing what you want most over what you want now.",
  "One task at a time, one day at a time.",
  "Progress, not perfection.",
  "You don't have to be great to start, but you have to start to be great.",
  "Energy flows where attention goes.",
  "Today is a fresh page. Write something you're proud of.",
  "Consistency beats intensity.",
  "The best time to begin was yesterday. The next best time is now.",
  "Do the hard thing first; the rest gets easier.",
  "Your future self is watching. Make them proud.",
  "Quiet focus builds loud results.",
  "Don't wait for motivation. Build momentum.",
  "A little progress each day adds up.",
  "Be stubborn about your goals and flexible about your methods.",
  "Fall seven times, stand up eight.",
  "Clarity comes from action, not thought.",
  "Protect your focus like it's your most valuable asset.",
  "Slow progress is still progress.",
  "Make it simple. Make it happen.",
  "The only way out is through.",
  "Every expert was once a beginner.",
  "Show up, even when it's hard.",
  "Breathe. Reset. Begin again.",
  "Work hard in silence; let your results speak.",
  "Your habits shape your days, and your days shape your life.",
  "Focus is a muscle. Train it daily.",
  "Choose progress over comfort.",
  "Dream big, start small, act now.",
  "Success is the sum of small efforts repeated day after day.",
  "Turn your can't into can and your dreams into plans.",
  "Don't count the days; make the days count.",
  "Action is the foundation of all success.",
  "Be kind to yourself on the way to your goals.",
  "Doing something imperfectly beats doing nothing perfectly.",
  "Stay patient and trust your journey.",
  "What gets scheduled gets done.",
  "Distraction is the enemy of greatness.",
  "Little by little, a little becomes a lot.",
  "Rest when you need to, but never quit.",
  "You are capable of more than you think.",
  "Make today so good that yesterday gets jealous.",
  "Courage starts with showing up.",
  "The harder you work, the luckier you get.",
  "Focus on the step in front of you, not the whole staircase.",
  "Own your morning, own your day.",
  "Your only limit is the one you set yourself.",
  "Create the life you can't wait to wake up to.",
  "Mistakes are proof that you are trying.",
  "Set the intention, then do the work.",
  "Calm mind, clear goals, steady hands.",
  "If it matters to you, make time for it.",
  "A good day starts with a good plan.",
  "Finish what you start.",
  "Believe you can and you're halfway there.",
  "Let your focus be your superpower.",
  "This too is part of the process.",
  "Win the morning, win the day.",
  "Keep going. You're closer than you think.",
];

const defaults = {
  name: "",
  focus: "",
  use24Hour: false,
  tasks: [],
  aiProvider: "chatgpt",
  openaiApiKey: "",
  openaiModel: "gpt-4o-mini",
  deepseekApiKey: "",
  deepseekModel: "deepseek-chat",
  geminiApiKey: "",
  geminiModel: "gemini-flash-latest",
  musicVolume: 35,
  musicTrack: "rain",
  focusHistory: [],
  links: [],
  blockNotifications: true,
  blockSites: false,
  stashOnFocus: false,
  notifyOnComplete: true,
  alarms: [],
  alarmSound: "bell",
  focusEndSound: "chime",
  alarmVolume: 70,
  focusMinutes: 25,
  cyclesEnabled: false,
  breakMinutes: 5,
  longBreakMinutes: 15,
  roundsBeforeLongBreak: 4,
  autoStartFocus: true,
  dailyGoalMinutes: 120,
  blockGroups: [
    { id: "social", emoji: "📱", name: "Social Media", enabled: true, sites: ["facebook.com", "instagram.com", "x.com", "twitter.com", "tiktok.com", "snapchat.com", "reddit.com", "pinterest.com", "linkedin.com", "threads.net", "tumblr.com"] },
    { id: "entertainment", emoji: "🎬", name: "Entertainment", enabled: true, sites: ["youtube.com", "netflix.com", "twitch.tv", "hulu.com", "disneyplus.com", "primevideo.com", "spotify.com", "9gag.com"] },
    { id: "news", emoji: "📰", name: "News", enabled: false, sites: ["cnn.com", "bbc.com", "nytimes.com", "foxnews.com", "theguardian.com", "news.google.com", "washingtonpost.com"] },
    { id: "shopping", emoji: "🛒", name: "Shopping", enabled: false, sites: ["amazon.com", "ebay.com", "aliexpress.com", "temu.com", "shein.com", "etsy.com"] },
    { id: "email", emoji: "✉️", name: "Email", enabled: false, sites: ["mail.google.com", "outlook.com", "mail.yahoo.com"] },
  ],
  customFocusMinutes: 30,
};

let settings = { ...defaults };
let assistantMessages = [];

function readStoredValue(key, callback) {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    chrome.storage.local.get(key, callback);
    return;
  }

  try {
    const value = window.localStorage.getItem(key);
    callback({ [key]: value ? JSON.parse(value) : undefined });
  } catch {
    callback({});
  }
}

function writeStoredValue(key, value) {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    chrome.storage.local.set({ [key]: value });
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The dashboard still works for the current page when storage is unavailable.
  }
}

function parseBlockedSites(text) {
  return [...new Set(
    String(text || "")
      .split(/[\s,]+/)
      .map((entry) => entry.trim().toLowerCase().replace(/^[a-z]+:\/\//, "").replace(/^www\./, "").split("/")[0])
      .filter((entry) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(entry)),
  )];
}

const canRunSessions = typeof chrome !== "undefined" && Boolean(chrome.runtime?.id);

// background.js owns the session and applies site/notification blocking from storage,
// so the page only asks for changes and renders what is stored.
function sendFocusMessage(message) {
  if (!canRunSessions) return Promise.resolve();
  return chrome.runtime.sendMessage(message).catch(() => {});
}

const elements = {
  clock: document.querySelector("#clock"),
  date: document.querySelector("#date"),
  focus: document.querySelector("#focus"),
  greeting: document.querySelector("#greeting"),
  list: document.querySelector("#todo-list"),
  count: document.querySelector("#task-count"),
  name: document.querySelector("#name"),
  twentyFourHour: document.querySelector("#twenty-four-hour"),
  panel: document.querySelector("#settings-panel"),
  backdrop: document.querySelector("#settings-backdrop"),
  assistantButton: document.querySelector("#assistant-button"),
  assistantPanel: document.querySelector("#assistant-panel"),
  assistantMessages: document.querySelector("#assistant-messages"),
  assistantInput: document.querySelector("#assistant-input"),
  assistantModeLabel: document.querySelector("#assistant-mode-label"),
  aiProvider: document.querySelector("#ai-provider"),
  chatgptSettings: document.querySelector("#chatgpt-settings"),
  deepseekSettings: document.querySelector("#deepseek-settings"),
  geminiSettings: document.querySelector("#gemini-settings"),
  openaiKey: document.querySelector("#openai-key"),
  openaiModel: document.querySelector("#openai-model"),
  deepseekKey: document.querySelector("#deepseek-key"),
  deepseekModel: document.querySelector("#deepseek-model"),
  geminiKey: document.querySelector("#gemini-key"),
  geminiModel: document.querySelector("#gemini-model"),
  musicButton: document.querySelector("#music-button"),
  musicVolume: document.querySelector("#music-volume"),
  soundsToggle: document.querySelector("#sounds-toggle"),
  soundsCaret: document.querySelector("#sounds-caret"),
  mediaPanel: document.querySelector("#media-panel"),
  mediaList: document.querySelector("#media-list"),
  mediaPlayer: document.querySelector("#media-player"),
  mediaOpen: document.querySelector("#media-open"),
  soundsDropdown: document.querySelector("#sounds-dropdown"),
  soundsGrid: document.querySelector("#sounds-grid"),
  soundsNow: document.querySelector("#sounds-now"),
  focusStartRow: document.querySelector("#focus-start-row"),
  focusDuration: document.querySelector("#focus-duration"),
  focusCustomDuration: document.querySelector("#focus-custom-duration"),
  focusStart: document.querySelector("#focus-start"),
  focusCountdown: document.querySelector("#focus-countdown"),
  focusCountdownTime: document.querySelector("#focus-countdown-time"),
  focusCountdownTask: document.querySelector("#focus-countdown-task"),
  focusPause: document.querySelector("#focus-pause"),
  focusStop: document.querySelector("#focus-stop"),
  focusHistoryList: document.querySelector("#focus-history-list"),
  focusDndIndicator: document.querySelector("#focus-dnd-indicator"),
  blockNotifications: document.querySelector("#block-notifications"),
  blockSites: document.querySelector("#block-sites"),
  stashOnFocus: document.querySelector("#stash-on-focus"),
  notifyOnComplete: document.querySelector("#notify-on-complete"),
  stashNow: document.querySelector("#stash-now"),
  stashRestore: document.querySelector("#stash-restore"),
  stashClear: document.querySelector("#stash-clear"),
  stashList: document.querySelector("#stash-list"),
  blockerButton: document.querySelector("#blocker-button"),
  blockerDropdown: document.querySelector("#blocker-dropdown"),
  blockerMaster: document.querySelector("#blocker-master"),
  blockerGroups: document.querySelector("#blocker-groups"),
  blockerAddForm: document.querySelector("#blocker-add-form"),
  blockerAddName: document.querySelector("#blocker-add-name"),
  linksButton: document.querySelector("#links-button"),
  alarmList: document.querySelector("#alarm-list"),
  alarmForm: document.querySelector("#alarm-form"),
  alarmTime: document.querySelector("#alarm-time"),
  alarmLabel: document.querySelector("#alarm-label"),
  alarmRepeat: document.querySelector("#alarm-repeat"),
  alarmSound: document.querySelector("#alarm-sound"),
  focusEndSound: document.querySelector("#focus-end-sound"),
  alarmVolume: document.querySelector("#alarm-volume"),
  nextAlarm: document.querySelector("#next-alarm"),
  nextAlarmChip: document.querySelector("#next-alarm-chip"),
  ringingBanner: document.querySelector("#ringing-banner"),
  ringingLabel: document.querySelector("#ringing-label"),
  ringingStop: document.querySelector("#ringing-stop"),
  ringingSnooze: document.querySelector("#ringing-snooze"),
  focusPhase: document.querySelector("#focus-phase"),
  focusSkip: document.querySelector("#focus-skip"),
  cycleSummary: document.querySelector("#cycle-summary"),
  breakMinutes: document.querySelector("#break-minutes"),
  longBreakMinutes: document.querySelector("#long-break-minutes"),
  roundsBeforeLong: document.querySelector("#rounds-before-long"),
  autoStartFocus: document.querySelector("#auto-start-focus"),
  dailyGoal: document.querySelector("#daily-goal"),
  statsToday: document.querySelector("#stats-today"),
  statsStreak: document.querySelector("#stats-streak"),
  goalBar: document.querySelector("#goal-bar"),
  goalFill: document.querySelector("#goal-fill"),
  statsWeek: document.querySelector("#stats-week"),
  taskCheck: document.querySelector("#task-check"),
  taskCheckLabel: document.querySelector("#task-check-label"),
  taskCheckDone: document.querySelector("#task-check-done"),
  taskCheckDismiss: document.querySelector("#task-check-dismiss"),
  linksDropdown: document.querySelector("#links-dropdown"),
};

let audioContext = null;
let activeSources = [];
let noiseGain = null;
let streamAudio = null;
let musicPlaying = false;

function createNoiseBuffer(context, smoothing) {
  const bufferSize = context.sampleRate * 4;
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
  const data = buffer.getChannelData(0);
  let lastSample = 0;
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;
  for (let i = 0; i < bufferSize; i += 1) {
    const white = Math.random() * 2 - 1;
    if (smoothing === "pink") {
      // Paul Kellet's filter turns white noise into softer, more natural pink noise.
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
      continue;
    }
    if (smoothing === null) {
      data[i] = white;
      continue;
    }
    // Low-pass smoothing turns sharp white noise into a softer, rounder tone.
    lastSample = (lastSample + smoothing * white) / (1 + smoothing);
    data[i] = lastSample;
  }
  return buffer;
}

const tracks = {
  // Real recordings (bundled in sounds/) with synthesized noise as a fallback.
  rain: { type: "sample", url: "sounds/rain.ogg", gain: 6, fallback: { type: "noise", smoothing: 0.02, gain: 3.5 } },
  // Pink noise is softer and more natural than raw white noise.
  white: { type: "noise", smoothing: "pink", gain: 1.4 },
  wind: { type: "sample", url: "sounds/wind.ogg", gain: 2.2, fallback: { type: "noise", smoothing: 0.08, gain: 1.6 } },
  ocean: { type: "sample", url: "sounds/ocean.ogg", gain: 2, fallback: { type: "noise", smoothing: 0.03, gain: 3 } },
  beach: { type: "sample", url: "sounds/beach.ogg", gain: 2, fallback: { type: "noise", smoothing: 0.05, gain: 2.2 } },
  forest: { type: "sample", url: "sounds/forest.ogg", gain: 2, fallback: { type: "noise", smoothing: 0.08, gain: 1.6 } },
  stream: { type: "sample", url: "sounds/stream.ogg", gain: 2, fallback: { type: "noise", smoothing: 0.1, gain: 1.4 } },
  train: { type: "sample", url: "sounds/train.ogg", gain: 2, fallback: { type: "noise", smoothing: 0.02, gain: 3 } },
  thunder: { type: "sample", url: "sounds/thunder.ogg", gain: 1.5, fallback: { type: "noise", smoothing: 0.05, gain: 3 } },
  // Synthesized from soft embers plus random pops, so there is no background hiss.
  fire: { type: "fire", gain: 1.6 },
  // A calm low tone with slow vibrato, built from oscillators instead of noise.
  tone: { type: "tone" },
  // Free, publicly streamed lofi/chillout internet radio (requires a connection).
  chill: { type: "stream", url: "https://ice1.somafm.com/groovesalad-128-mp3", label: "SomaFM Groove Salad" },
};

function createFireBuffer(context) {
  const seconds = 20;
  const rate = context.sampleRate;
  const length = rate * seconds;
  const buffer = context.createBuffer(2, length, rate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel);
    // Very quiet, slowly drifting low rumble of the embers.
    let brown = 0;
    let slow = 0;
    for (let i = 0; i < length; i += 1) {
      brown = (brown + (Math.random() * 2 - 1) * 0.02) / 1.02;
      if (i % 2000 === 0) slow = 0.6 + Math.random() * 0.4;
      data[i] = brown * 0.9 * slow;
    }
    // Crackles: short decaying bursts at random times, some loud pops, some tiny snaps.
    const count = seconds * 22;
    for (let n = 0; n < count; n += 1) {
      const start = Math.floor(Math.random() * length);
      const loud = Math.random() < 0.12;
      const amp = loud ? 0.5 + Math.random() * 0.4 : 0.05 + Math.random() * 0.22;
      const duration = Math.floor(rate * (loud ? 0.012 + Math.random() * 0.02 : 0.002 + Math.random() * 0.008));
      const decay = 5 / duration;
      let previous = 0;
      for (let i = 0; i < duration; i += 1) {
        const white = Math.random() * 2 - 1;
        // High-passing each burst keeps the pops crisp rather than muddy.
        const crisp = white - previous * 0.6;
        previous = white;
        data[(start + i) % length] += crisp * amp * Math.exp(-i * decay);
      }
    }
  }
  return buffer;
}

function buildFireNode(context, config) {
  const source = context.createBufferSource();
  source.buffer = createFireBuffer(context);
  source.loop = true;
  const shaper = context.createGain();
  shaper.gain.value = config.gain;
  source.connect(shaper);
  return { source, output: shaper, nodes: [source] };
}

function buildNoiseNode(context, config) {
  const source = context.createBufferSource();
  source.buffer = createNoiseBuffer(context, config.smoothing);
  source.loop = true;
  const shaper = context.createGain();
  shaper.gain.value = config.gain;
  source.connect(shaper);
  return { source, output: shaper, nodes: [source] };
}

async function loadLoopBuffer(context, url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("sample not found");
  const decoded = await context.decodeAudioData(await response.arrayBuffer());
  const fade = Math.min(Math.floor(decoded.sampleRate * 2), Math.floor(decoded.length / 3));
  const length = decoded.length - fade;
  const looped = context.createBuffer(decoded.numberOfChannels, length, decoded.sampleRate);
  for (let channel = 0; channel < decoded.numberOfChannels; channel += 1) {
    const input = decoded.getChannelData(channel);
    const output = looped.getChannelData(channel);
    output.set(input.subarray(0, length));
    // Crossfade the tail into the start so the loop has no audible seam.
    for (let i = 0; i < fade; i += 1) {
      const mix = i / fade;
      output[i] = input[i] * Math.sin((mix * Math.PI) / 2) + input[length + i] * Math.cos((mix * Math.PI) / 2);
    }
  }
  return looped;
}

function buildSampleNode(context, buffer, config) {
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const shaper = context.createGain();
  shaper.gain.value = config.gain;
  source.connect(shaper);
  return { source, output: shaper, nodes: [source] };
}

function buildToneNode(context) {
  const carrier = context.createOscillator();
  carrier.type = "sine";
  carrier.frequency.value = 110;

  const lfo = context.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.15;
  const lfoGain = context.createGain();
  lfoGain.gain.value = 4;
  lfo.connect(lfoGain).connect(carrier.frequency);

  const shaper = context.createGain();
  shaper.gain.value = 0.5;
  carrier.connect(shaper);

  return { source: carrier, output: shaper, nodes: [carrier, lfo] };
}

function setMusicVolume(percent) {
  const volume = Math.max(0, Math.min(100, percent)) / 100;
  if (noiseGain) noiseGain.gain.value = volume;
  if (streamAudio) streamAudio.volume = volume;
}

function startStream(config) {
  streamAudio = new Audio(config.url);
  streamAudio.crossOrigin = "anonymous";
  streamAudio.volume = Number(elements.musicVolume.value) / 100;
  streamAudio.play().catch(() => {
    addAssistantMessage("error", "Couldn't reach the online chill radio stream. Check your internet connection and try again.");
    stopMusic();
    updateMusicButtonUi();
  });
  musicPlaying = true;
}

const sampleCache = {};
let musicStartToken = 0;

function playBuilt(built) {
  noiseGain = audioContext.createGain();
  setMusicVolume(Number(elements.musicVolume.value));
  built.output.connect(noiseGain).connect(audioContext.destination);
  built.nodes.forEach((node) => node.start());
  activeSources = built.nodes;
}

function startMusic() {
  clearMediaPlayer();
  const config = tracks[settings.musicTrack] || tracks.rain;

  if (config.type === "stream") {
    startStream(config);
    return;
  }

  audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === "suspended") audioContext.resume();
  musicPlaying = true;
  musicStartToken += 1;
  const token = musicStartToken;

  if (config.type === "sample") {
    const loading = sampleCache[config.url] || (sampleCache[config.url] = loadLoopBuffer(audioContext, config.url));
    loading
      .then((buffer) => buildSampleNode(audioContext, buffer, config))
      .catch(() => {
        delete sampleCache[config.url];
        return buildNoiseNode(audioContext, config.fallback);
      })
      .then((built) => {
        if (token === musicStartToken && musicPlaying) playBuilt(built);
      });
    return;
  }

  if (config.type === "fire") {
    playBuilt(buildFireNode(audioContext, config));
    return;
  }

  playBuilt(config.type === "tone" ? buildToneNode(audioContext) : buildNoiseNode(audioContext, config));
}

function stopMusic() {
  musicStartToken += 1;
  activeSources.forEach((node) => {
    node.stop();
    node.disconnect();
  });
  activeSources = [];
  if (streamAudio) {
    streamAudio.pause();
    streamAudio.src = "";
    streamAudio = null;
  }
  musicPlaying = false;
}

const soundTiles = [
  { id: "rain", name: "Rainfall", emoji: "🌧️", color: "#1d5b73, #0b2c3d" },
  { id: "wind", name: "Wind", emoji: "💨", color: "#5e7b8a, #2b3d48" },
  { id: "white", name: "Noise", emoji: "📻", color: "#4a4a4a, #151515" },
  { id: "ocean", name: "Ocean", emoji: "🌊", color: "#1b6fa0, #0a2a47" },
  { id: "beach", name: "Beach", emoji: "🏖️", color: "#c9a574, #7d5f3c" },
  { id: "forest", name: "Forest", emoji: "🌲", color: "#2f6d3f, #123b22" },
  { id: "stream", name: "Stream", emoji: "🏞️", color: "#3f8f8a, #174a4d" },
  { id: "train", name: "Train", emoji: "🚂", color: "#6b6b7a, #2c2c36" },
  { id: "thunder", name: "Thunder", emoji: "⛈️", color: "#3b3f6b, #14152e" },
  { id: "fire", name: "Fire", emoji: "🔥", color: "#c4561f, #4a1a0a" },
  { id: "tone", name: "Calm tone", emoji: "🎶", color: "#6b3fa0, #2a1650" },
  { id: "chill", name: "Chill radio", emoji: "🎧", color: "#a0523f, #4a1f16" },
];

const soundPhotos = {
  rain: "1515694346937-94d85e41e6f0",
  wind: "1470071459604-3b5ec3a7fe05",
  white: "1478760329108-5c3ed9d495a0",
  ocean: "1505118380757-91f5f5632de0",
  beach: "1507525428034-b723cf961d3e",
  forest: "1448375240586-882707db888b",
  stream: "1433086966358-54859d0ed716",
  train: "1527684651001-731c474bbb5a",
  thunder: "1429552077091-836152271555",
  fire: "1525811902-f2342640856e",
  tone: "1506126613408-eca07ce68773",
  chill: "1511671782779-c97d3d27a1d4",
};

const mediaChoices = {
  youtube: [
    { id: "jfKfPfyJRdk", name: "Lofi Girl radio", emoji: "\u{1F4DA}" },
    { id: "rUxyKA_-grg", name: "Lofi beats to sleep", emoji: "\u{1F4A4}" },
    { id: "5yx6BWlEVcY", name: "Chillhop radio", emoji: "\u{1F43E}" },
    { id: "Dx5qFachd3A", name: "Relaxing jazz piano", emoji: "\u{1F3B7}" },
    { id: "WJ3-F02-F_Y", name: "Relaxing piano", emoji: "\u{1F3B9}" },
    { id: "eKFTSSKCzWA", name: "Nature sounds", emoji: "\u{1F332}" },
  ],
  spotify: [
    { id: "37i9dQZF1DWZeKCadgRdKQ", name: "Deep Focus", emoji: "\u{1F3AF}" },
    { id: "37i9dQZF1DWWQRwui0ExPn", name: "Lofi Beats", emoji: "\u{1F4DA}" },
    { id: "37i9dQZF1DX4sWSpwq3LiO", name: "Peaceful Piano", emoji: "\u{1F3B9}" },
    { id: "37i9dQZF1DX3Ogo9pFvBkY", name: "Ambient Relaxation", emoji: "\u{1F30C}" },
    { id: "37i9dQZF1DWV7EzJMK2FUI", name: "Jazz in the Background", emoji: "\u{1F3B7}" },
    { id: "37i9dQZF1DX4PP3DA4J0N8", name: "Nature Sounds", emoji: "\u{1F332}" },
  ],
};

function mediaUrls(kind, id) {
  return kind === "youtube"
    ? {
        embed: `https://immanuellangat.github.io/focus-plus/player.html?v=${id}`,
        page: `https://www.youtube.com/watch?v=${id}`,
      }
    : {
        embed: `https://open.spotify.com/embed/playlist/${id}?theme=0`,
        page: `https://open.spotify.com/playlist/${id}`,
      };
}

function clearMediaPlayer() {
  elements.mediaPlayer.replaceChildren();
  elements.mediaOpen.hidden = true;
  elements.mediaList.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", "false"));
}

function playMedia(kind, choice, button) {
  if (musicPlaying) {
    stopMusic();
    updateMusicButtonUi();
  }
  clearMediaPlayer();
  const urls = mediaUrls(kind, choice.id);
  const frame = document.createElement("iframe");
  frame.src = urls.embed;
  frame.title = choice.name;
  frame.allow = "autoplay; encrypted-media; fullscreen";
  frame.className = kind === "youtube" ? "media-frame video" : "media-frame";
  elements.mediaPlayer.append(frame);
  elements.mediaOpen.href = urls.page;
  elements.mediaOpen.textContent = kind === "youtube" ? "Not loading? Open on YouTube" : "Open in Spotify";
  elements.mediaOpen.hidden = false;
  button.setAttribute("aria-pressed", "true");
}

function showSoundsTab(tab) {
  document.querySelectorAll(".sounds-tab").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === tab)));
  const isMedia = tab !== "sounds";
  elements.soundsGrid.hidden = isMedia;
  elements.mediaPanel.hidden = !isMedia;
  if (!isMedia) return;
  const playing = elements.mediaList.dataset.kind === tab && elements.mediaPlayer.firstChild;
  elements.mediaList.dataset.kind = tab;
  const previous = playing ? elements.mediaList.querySelector("[aria-pressed='true']")?.dataset.id : null;
  elements.mediaList.replaceChildren(
    ...mediaChoices[tab].map((choice) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "media-choice";
      button.dataset.id = choice.id;
      button.setAttribute("aria-pressed", String(choice.id === previous));
      button.textContent = `${choice.emoji} ${choice.name}`;
      button.addEventListener("click", () => playMedia(tab, choice, button));
      item.append(button);
      return item;
    }),
  );
  if (!playing) clearMediaPlayer();
}

document.querySelectorAll(".sounds-tab").forEach((tab) => tab.addEventListener("click", () => showSoundsTab(tab.dataset.tab)));

function renderSounds() {
  elements.soundsGrid.replaceChildren(
    ...soundTiles.map((tile) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "sound-tile";
      button.setAttribute("aria-pressed", String(settings.musicTrack === tile.id));
      const art = document.createElement("span");
      art.className = "sound-tile-art";
      const photo = soundPhotos[tile.id];
      const gradient = `linear-gradient(135deg, ${tile.color})`;
      art.style.background = photo
        ? `linear-gradient(rgba(0,0,0,0.25), rgba(0,0,0,0.45)), url("https://images.unsplash.com/photo-${photo}?auto=format&fit=crop&w=200&h=200&q=60") center / cover, ${gradient}`
        : gradient;
      art.textContent = tile.emoji;
      const name = document.createElement("span");
      name.className = "sound-tile-name";
      name.textContent = tile.name;
      button.append(art, name);
      button.addEventListener("click", () => chooseSound(tile.id));
      item.append(button);
      return item;
    }),
  );
  const current = soundTiles.find((tile) => tile.id === settings.musicTrack);
  elements.soundsNow.textContent = musicPlaying && current ? `Now playing: ${current.name}` : "";
}

function chooseSound(id) {
  const wasPlaying = musicPlaying;
  settings.musicTrack = id;
  save();
  if (wasPlaying) stopMusic();
  startMusic();
  updateMusicButtonUi();
}

function updateMusicButtonUi() {
  elements.musicButton.setAttribute("aria-pressed", String(musicPlaying));
  elements.musicButton.setAttribute("aria-label", musicPlaying ? "Pause focus music" : "Play focus music");
  const icon = musicPlaying ? "⏸" : "▶";
  elements.musicButton.querySelector("span").textContent = icon;
  elements.soundsToggle.textContent = icon;
  elements.soundsToggle.setAttribute("aria-label", musicPlaying ? "Pause focus music" : "Play focus music");
  elements.musicVolume.hidden = !musicPlaying;
  renderSounds();
}

function toggleMusic() {
  if (musicPlaying) {
    stopMusic();
  } else {
    startMusic();
  }
  updateMusicButtonUi();
}

function getGreeting(hour) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function renderClock() {
  const now = new Date();
  const timeOptions = { hour: "numeric", minute: "2-digit", hour12: !settings.use24Hour };
  elements.clock.textContent = now.toLocaleTimeString([], timeOptions);
  elements.date.textContent = now.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  elements.greeting.textContent = `${getGreeting(now.getHours())}${settings.name ? `, ${settings.name}` : ""}.`;
  renderNextAlarm();
}

// --- Alarm clock (background.js schedules and rings; the page edits and displays)

const repeatLabels = { once: "Once", daily: "Every day", weekdays: "Weekdays" };
const ringingStorageKey = "momentumRinging";

function nextAlarmOccurrence(alarm, from = new Date()) {
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

function formatAlarmTime(date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: !settings.use24Hour });
}

function timeOfDay(time) {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function renderNextAlarm() {
  const upcoming = settings.alarms
    .filter((alarm) => alarm.enabled)
    .map((alarm) => ({ alarm, at: nextAlarmOccurrence(alarm) }))
    .filter((entry) => entry.at)
    .sort((a, b) => a.at - b.at)[0];
  if (!upcoming) {
    elements.nextAlarmChip.hidden = true;
    elements.nextAlarm.textContent = settings.alarms.length ? "All alarms are off." : "No alarms yet. Add one below.";
    return;
  }
  const isToday = upcoming.at.toDateString() === new Date().toDateString();
  const day = isToday ? "" : `${upcoming.at.toLocaleDateString([], { weekday: "short" })} `;
  const label = upcoming.alarm.label ? ` · ${upcoming.alarm.label}` : "";
  elements.nextAlarmChip.textContent = `⏰ ${day}${formatAlarmTime(upcoming.at)}`;
  elements.nextAlarmChip.hidden = false;
  elements.nextAlarm.textContent = `Next alarm: ${day}${formatAlarmTime(upcoming.at)}${label}`;
}

function renderAlarms() {
  elements.alarmList.replaceChildren(
    ...settings.alarms.map((alarm) => {
      const item = document.createElement("li");
      item.className = `alarm-item${alarm.enabled ? "" : " off"}`;

      const time = document.createElement("span");
      time.className = "alarm-time";
      time.textContent = formatAlarmTime(timeOfDay(alarm.time));

      const meta = document.createElement("span");
      meta.className = "alarm-meta";
      meta.textContent = [alarm.label, repeatLabels[alarm.repeat] || "Once"].filter(Boolean).join(" · ");

      const toggle = document.createElement("input");
      toggle.type = "checkbox";
      toggle.checked = alarm.enabled;
      toggle.setAttribute("aria-label", `Alarm at ${time.textContent} on`);
      toggle.addEventListener("change", () => {
        alarm.enabled = toggle.checked;
        save();
        renderAlarms();
      });

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "delete-alarm";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Delete alarm at ${time.textContent}`);
      remove.addEventListener("click", () => {
        settings.alarms = settings.alarms.filter((candidate) => candidate.id !== alarm.id);
        save();
        renderAlarms();
      });

      item.append(time, meta, toggle, remove);
      return item;
    }),
  );
  renderNextAlarm();
}

const taskCheckStorageKey = "momentumTaskCheck";

function renderTaskCheck(check) {
  const task = check && settings.tasks.find((item) => item.id === check.taskId && !item.completed);
  elements.taskCheck.hidden = !task;
  elements.taskCheck.dataset.taskId = task ? task.id : "";
  if (task) elements.taskCheckLabel.textContent = `Done with "${task.text}"?`;
}

function clearTaskCheck() {
  if (typeof chrome !== "undefined" && chrome.storage?.local) chrome.storage.local.remove(taskCheckStorageKey);
  elements.taskCheck.hidden = true;
}

elements.taskCheckDone.addEventListener("click", () => {
  const task = settings.tasks.find((item) => item.id === elements.taskCheck.dataset.taskId);
  if (task) {
    task.completed = true;
    save();
    renderTasks();
  }
  clearTaskCheck();
});
elements.taskCheckDismiss.addEventListener("click", clearTaskCheck);

function renderRinging(ringing) {
  elements.ringingBanner.hidden = !ringing;
  if (ringing) elements.ringingLabel.textContent = `${ringing.label} · ${formatAlarmTime(timeOfDay(ringing.time))}`;
}

elements.alarmForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!elements.alarmTime.value) return;
  settings.alarms.push({
    id: crypto.randomUUID(),
    time: elements.alarmTime.value,
    label: elements.alarmLabel.value.trim(),
    repeat: elements.alarmRepeat.value,
    enabled: true,
  });
  settings.alarms.sort((a, b) => a.time.localeCompare(b.time));
  elements.alarmLabel.value = "";
  save();
  renderAlarms();
});

elements.alarmSound.addEventListener("change", () => {
  settings.alarmSound = elements.alarmSound.value;
  save();
});

elements.focusEndSound.addEventListener("change", () => {
  settings.focusEndSound = elements.focusEndSound.value;
  save();
});

elements.alarmVolume.addEventListener("change", () => {
  settings.alarmVolume = Number(elements.alarmVolume.value);
  save();
});

document.querySelectorAll(".sound-preview").forEach((button) => {
  button.addEventListener("click", () => {
    const sound = document.getElementById(button.dataset.for).value;
    if (sound !== "none") sendFocusMessage({ type: "sound:preview", sound });
  });
});

elements.ringingStop.addEventListener("click", () => sendFocusMessage({ type: "alarm:stop" }));
elements.ringingSnooze.addEventListener("click", () => sendFocusMessage({ type: "alarm:snooze" }));

const sessionStorageKey = "momentumSession";
let focusSession = null;
let focusTickId = null;
let completionRequestedFor = null;

function formatCountdown(totalSeconds) {
  const clamped = Math.max(0, totalSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatHistoryTimestamp(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function renderStats() {
  const stats = focusStats(settings.focusHistory);
  elements.statsToday.textContent = `Today ${formatMinutes(stats.todayMinutes)} · Last 7 days ${formatMinutes(stats.weekMinutes)}`;
  elements.statsStreak.textContent = stats.streak ? `🔥 ${stats.streak}-day streak` : "";
  const goal = Number(settings.dailyGoalMinutes) || 0;
  elements.goalBar.hidden = goal <= 0;
  if (goal > 0) {
    const percent = Math.min(100, Math.round((stats.todayMinutes / goal) * 100));
    elements.goalFill.style.width = `${percent}%`;
    elements.goalBar.classList.toggle("reached", stats.todayMinutes >= goal);
    elements.goalBar.setAttribute("aria-valuemax", String(goal));
    elements.goalBar.setAttribute("aria-valuenow", String(Math.min(goal, stats.todayMinutes)));
    elements.goalBar.title = `${stats.todayMinutes} of ${goal} minutes today`;
  }
  const busiest = Math.max(30, ...stats.days.map((day) => day.minutes));
  elements.statsWeek.replaceChildren(
    ...stats.days.map((day, index) => {
      const item = document.createElement("li");
      item.className = index === 6 ? "today" : "";
      item.title = `${day.date.toLocaleDateString([], { weekday: "long" })}: ${formatMinutes(day.minutes)}`;
      const bar = document.createElement("span");
      bar.className = "stats-bar";
      bar.style.height = `${Math.max(day.minutes ? 8 : 3, Math.round((day.minutes / busiest) * 100))}%`;
      const label = document.createElement("span");
      label.className = "stats-day";
      label.textContent = day.label;
      item.append(bar, label);
      return item;
    }),
  );
}

function renderFocusHistory() {
  renderStats();
  elements.focusHistoryList.replaceChildren();

  if (!settings.focusHistory.length) {
    const empty = document.createElement("li");
    empty.className = "focus-history-empty";
    empty.textContent = "No focus sessions yet. Start one above to build your history.";
    elements.focusHistoryList.append(empty);
    return;
  }

  settings.focusHistory
    .slice()
    .reverse()
    .forEach((entry) => {
      const item = document.createElement("li");
      item.className = `focus-history-item ${entry.completed ? "completed" : "stopped"}`;

      const task = document.createElement("span");
      task.className = "focus-history-task";
      task.textContent = entry.task || "Untitled focus";

      const meta = document.createElement("span");
      meta.className = "focus-history-meta";
      const statusText = entry.completed
        ? `${entry.plannedMinutes} min ✓`
        : `stopped at ${formatCountdown(entry.actualSeconds)}`;
      meta.textContent = `${statusText} · ${formatHistoryTimestamp(entry.timestamp)}`;

      item.append(task, meta);
      elements.focusHistoryList.append(item);
    });
}

function sessionRemainingSeconds(session) {
  return session.paused
    ? session.remainingSeconds
    : Math.max(0, Math.ceil((session.endTime - Date.now()) / 1000));
}

function tickFocusCountdown() {
  if (!focusSession) return;
  const remaining = sessionRemainingSeconds(focusSession);
  elements.focusCountdownTime.textContent = formatCountdown(remaining);
  if (remaining <= 0 && !focusSession.paused && completionRequestedFor !== focusSession.id) {
    // The background alarm also ends it; whichever arrives second is ignored.
    completionRequestedFor = focusSession.id;
    sendFocusMessage({ type: "focus:complete" });
  }
}

function renderFocusSession() {
  const running = Boolean(focusSession);
  elements.focusStartRow.hidden = running;
  elements.focusCountdown.hidden = !running;
  elements.focus.disabled = running;
  elements.focusDuration.disabled = running;
  elements.focusCustomDuration.disabled = running;
  const phase = focusSession?.phase || "focus";
  const isBreak = running && phase !== "focus";
  elements.focusDndIndicator.hidden = !(running && !isBreak && settings.blockNotifications);

  if (!running) {
    clearInterval(focusTickId);
    focusTickId = null;
    elements.focusPause.textContent = "Pause";
    return;
  }

  elements.focusPause.textContent = focusSession.paused ? "Resume" : "Pause";
  elements.focusSkip.hidden = !isBreak;
  elements.focusPhase.textContent = phaseLabel(focusSession);
  elements.focusPhase.classList.toggle("break", isBreak);
  elements.focusCountdownTask.textContent = isBreak ? `Next: "${focusSession.task}"` : `Focusing on "${focusSession.task}"`;
  tickFocusCountdown();
  if (!focusTickId) focusTickId = setInterval(tickFocusCountdown, 1000);
}

function phaseLabel(session) {
  if (session.phase === "break") return "Short break";
  if (session.phase === "longBreak") return "Long break";
  return settings.cyclesEnabled ? `Focus · round ${session.round || 1}` : "Focus";
}

function togglePauseFocusSession() {
  if (!focusSession) return;
  sendFocusMessage({ type: focusSession.paused ? "focus:resume" : "focus:pause" });
}

const stashStorageKey = "momentumTabStash";
let stashedTabs = [];

function renderStash() {
  elements.stashList.replaceChildren(
    ...stashedTabs.map((tab) => {
      const item = document.createElement("li");
      item.textContent = tab.title || tab.url;
      item.title = tab.url;
      return item;
    }),
  );
  elements.stashRestore.hidden = stashedTabs.length === 0;
  elements.stashClear.hidden = stashedTabs.length === 0;
  elements.stashNow.textContent = "Stash open tabs now";
}

function stashOpenTabs() {
  if (typeof chrome === "undefined" || !chrome.tabs?.query) {
    elements.stashNow.textContent = "Only works in the installed extension";
    return;
  }
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    const stashable = (tabs || []).filter(
      (tab) => !tab.active && !tab.pinned && /^https?:/i.test(tab.url || ""),
    );
    if (!stashable.length) {
      elements.stashNow.textContent = "No other tabs to stash";
      return;
    }
    stashedTabs = stashedTabs.concat(stashable.map((tab) => ({ title: tab.title, url: tab.url })));
    writeStoredValue(stashStorageKey, stashedTabs);
    chrome.tabs.remove(stashable.map((tab) => tab.id));
    renderStash();
  });
}

function restoreStashedTabs() {
  if (typeof chrome === "undefined" || !chrome.tabs?.create) return;
  stashedTabs.forEach((tab) => chrome.tabs.create({ url: tab.url, active: false }));
  stashedTabs = [];
  writeStoredValue(stashStorageKey, stashedTabs);
  renderStash();
}

function startFocusSession(taskId) {
  const task = elements.focus.value.trim() || "Untitled focus";
  let minutes = 25;
  if (elements.focusDuration.value === "custom") {
    const rawVal = elements.focusCustomDuration.value.trim();
    const customVal = Number(rawVal);
    if (!rawVal || isNaN(customVal) || customVal <= 0) {
      elements.focusCustomDuration.focus();
      return;
    }
    minutes = Math.min(Math.max(Math.round(customVal), 1), 720);
    settings.customFocusMinutes = minutes;
  } else {
    minutes = Number(elements.focusDuration.value) || 25;
  }

  if (!canRunSessions) {
    elements.focusStart.textContent = "Only works in the installed extension";
    return;
  }

  // Typing the name of an open task links the session to it too.
  const linkedId = taskId || settings.tasks.find((item) => !item.completed && item.text === task)?.id;
  settings.focus = task;
  settings.focusMinutes = minutes;
  save();
  if (settings.stashOnFocus) stashOpenTabs();
  sendFocusMessage({ type: "focus:start", task, minutes, taskId: linkedId });
}

function startFocusFromTask(task) {
  if (focusSession) return;
  elements.focus.value = task.text;
  startFocusSession(task.id);
}

const syncStorageKey = "momentumSyncedSettings";
const localOnlySettingKeys = ["openaiApiKey", "deepseekApiKey", "geminiApiKey", "focusHistory"];

function syncedSettingsSubset() {
  const subset = { ...settings };
  localOnlySettingKeys.forEach((key) => delete subset[key]);
  return subset;
}

let syncTimer = null;

// chrome.storage.sync caps each item at 8 KB, so the settings JSON is split across
// numbered items ("momentumSyncedSettings:0", ":1", ...) plus a ":meta" item.
const syncChunkSize = 3000;
const syncMetaKey = `${syncStorageKey}:meta`;

function writeSyncedSettings() {
  clearTimeout(syncTimer);
  syncTimer = null;
  // API keys and history stay on this device; everything else follows the Google account.
  // A failed sync write (size or rate quota) is harmless: local data carries a newer
  // updatedAt, so it wins over the stale synced copy on the next load.
  const json = JSON.stringify(syncedSettingsSubset());
  const chunks = Math.max(1, Math.ceil(json.length / syncChunkSize));
  const items = { [syncMetaKey]: { chunks } };
  for (let i = 0; i < chunks; i += 1) {
    items[`${syncStorageKey}:${i}`] = json.slice(i * syncChunkSize, (i + 1) * syncChunkSize);
  }
  chrome.storage.sync.set(items, () => {
    if (chrome.runtime.lastError) return;
    // Drop chunks left over from a longer earlier write, and the old single-item copy.
    chrome.storage.sync.get(null, (all) => {
      const stale = Object.keys(all || {}).filter((key) => key === syncStorageKey
        || (key.startsWith(`${syncStorageKey}:`) && Number(key.slice(syncStorageKey.length + 1)) >= chunks));
      if (stale.length) chrome.storage.sync.remove(stale, () => void chrome.runtime.lastError);
    });
  });
}

// Always move updatedAt forward, past any copy already seen, so a computer whose clock
// runs ahead can't make its older synced copy look newer than edits made here.
function nextUpdatedAt(current) {
  return Math.max(Date.now(), (current || 0) + 1);
}

function save() {
  settings.updatedAt = nextUpdatedAt(settings.updatedAt);
  writeStoredValue(storageKey, settings);

  if (typeof chrome !== "undefined" && chrome.storage?.sync) {
    // Batch rapid edits (typing, sliders) to stay under chrome.storage.sync's write quota.
    clearTimeout(syncTimer);
    syncTimer = setTimeout(writeSyncedSettings, 2000);
  }
}

window.addEventListener("pagehide", () => {
  if (syncTimer) writeSyncedSettings();
});

function readSyncedSettings(callback) {
  if (typeof chrome === "undefined" || !chrome.storage?.sync) {
    callback({});
    return;
  }
  chrome.storage.sync.get(null, (all) => {
    if (chrome.runtime.lastError || !all) {
      callback({});
      return;
    }
    const meta = all[syncMetaKey];
    if (!meta) {
      // Written by an older build as a single item.
      callback(all[syncStorageKey] || {});
      return;
    }
    let json = "";
    for (let i = 0; i < meta.chunks; i += 1) json += all[`${syncStorageKey}:${i}`] ?? "";
    try {
      callback(JSON.parse(json));
    } catch {
      // A partial or corrupt copy; local data is used instead.
      callback({});
    }
  });
}

function saveAssistant() {
  writeStoredValue(assistantStorageKey, assistantMessages.slice(-40));
}

let assistantPending = false;

function renderAssistant() {
  elements.assistantMessages.replaceChildren();
  const shown = assistantPending ? [...assistantMessages, { role: "pending", text: "Thinking…" }] : assistantMessages;
  shown.forEach((message) => {
    const paragraph = document.createElement("p");
    paragraph.className = `assistant-message ${message.role}`;
    paragraph.textContent = message.text;
    elements.assistantMessages.append(paragraph);
  });
  elements.assistantMessages.scrollTop = elements.assistantMessages.scrollHeight;
}

const aiProviderLabels = {
  chatgpt: "ChatGPT",
  deepseek: "DeepSeek",
  gemini: "Gemini",
  offline: "Offline coach",
};

function currentAiApiKey() {
  if (settings.aiProvider === "chatgpt") return settings.openaiApiKey;
  if (settings.aiProvider === "deepseek") return settings.deepseekApiKey;
  if (settings.aiProvider === "gemini") return settings.geminiApiKey;
  return "";
}

function updateAssistantModeLabel() {
  elements.assistantModeLabel.textContent = aiProviderLabels[settings.aiProvider] || "Offline coach";
}

function updateAiProviderVisibility() {
  elements.chatgptSettings.hidden = settings.aiProvider !== "chatgpt";
  elements.deepseekSettings.hidden = settings.aiProvider !== "deepseek";
  elements.geminiSettings.hidden = settings.aiProvider !== "gemini";
}

function welcomeMessage() {
  if (settings.aiProvider === "offline") {
    return "I’m your private, offline focus coach. Ask me for a plan, a task suggestion, or a little momentum.";
  }
  const providerName = aiProviderLabels[settings.aiProvider];
  return currentAiApiKey()
    ? `I’m connected to ${providerName}. Ask me for a plan, a task suggestion, or a little momentum.`
    : `I’m your online assistant, powered by ${providerName}. Add your ${providerName} API key in Settings to start chatting, or switch to the offline coach.`;
}

function createAssistantReply(message) {
  const lowerMessage = message.toLowerCase();
  const openTasks = settings.tasks.filter((task) => !task.completed);
  const focus = settings.focus || "your most important task";

  if (lowerMessage.includes("plan") || lowerMessage.includes("start")) {
    const firstTask = openTasks[0]?.text || focus;
    return `Try this 25-minute sprint:\n1. Start with "${firstTask}".\n2. Remove one distraction.\n3. Work until the timer ends, then take a five-minute break.`;
  }
  if (lowerMessage.includes("task") || lowerMessage.includes("todo")) {
    return openTasks.length
      ? `You have ${openTasks.length} open ${openTasks.length === 1 ? "task" : "tasks"}. The best next step is "${openTasks[0].text}".`
      : "Your task list is clear. Capture one small next step for today's focus.";
  }
  if (lowerMessage.includes("motivat") || lowerMessage.includes("stuck") || lowerMessage.includes("focus")) {
    return `Keep it small: spend five minutes on "${focus}", then decide whether to continue. Starting is the hard part.`;
  }
  if (lowerMessage.includes("hello") || lowerMessage.includes("hi")) {
    return `Hi${settings.name ? ` ${settings.name}` : ""}! Your focus today is "${focus}". How can I help you move it forward?`;
  }
  return `I’m an offline focus coach, so I can help with plans, tasks, and momentum. Try asking “How should I start?”`;
}

function addAssistantMessage(role, text) {
  assistantMessages.push({ role, text });
  saveAssistant();
  renderAssistant();
}

function buildCoachSystemPrompt() {
  const openTasks = settings.tasks.filter((task) => !task.completed).map((task) => task.text);
  return `You are a warm, concise productivity coach embedded in a browser new-tab dashboard. The user's name is "${settings.name || "unknown"}", their focus for today is "${settings.focus || "not set"}", and their open tasks are: ${openTasks.length ? openTasks.join(", ") : "none"}. Keep replies under 100 words.`;
}

// Earlier turns to send as context: only real chat turns, never errors or the message being sent.
function conversationHistory() {
  return assistantMessages.filter((entry) => entry.role === "user" || entry.role === "assistant").slice(-8);
}

async function fetchOpenAiCompatibleReply({ endpoint, apiKey, model, message, previous }) {
  const systemPrompt = buildCoachSystemPrompt();

  const history = previous.map((entry) => ({
    role: entry.role,
    content: entry.text,
  }));

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...history, { role: "user", content: message }],
      max_tokens: 220,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Request failed (${response.status})`);
  }

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error("The assistant returned an empty response.");
  return reply;
}

async function fetchGeminiReply({ apiKey, model, message, previous }) {
  const systemPrompt = buildCoachSystemPrompt();

  const history = previous.map((entry) => ({
    role: entry.role === "user" ? "user" : "model",
    parts: [{ text: entry.text }],
  }));

  const primaryModel = model || "gemini-flash-latest";
  const fallbackModel = "gemini-flash-lite-latest";

  async function sendRequest(targetModel) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent`;
    return fetch(endpoint, {
      method: "POST",
      // A header keeps the key out of URLs, logs and error messages.
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
        contents: [...history, { role: "user", parts: [{ text: message }] }],
        generationConfig: { maxOutputTokens: 600 },
      }),
    });
  }

  let response = await sendRequest(primaryModel);

  // If primary model is unavailable or overloaded (e.g. 503, 429, or high demand), attempt automatic fallback
  if (!response.ok && primaryModel !== fallbackModel) {
    const errData = await response.clone().json().catch(() => ({}));
    const errMsg = (errData?.error?.message || "").toLowerCase();
    if (response.status === 503 || response.status === 429 || errMsg.includes("demand") || errMsg.includes("overloaded") || errMsg.includes("resource") || errMsg.includes("not found")) {
      const fallbackResponse = await sendRequest(fallbackModel);
      if (fallbackResponse.ok) {
        response = fallbackResponse;
      }
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Request failed (${response.status})`);
  }

  const data = await response.json();
  const reply = data.candidates?.[0]?.content?.parts?.map((part) => part.text).filter(Boolean).join("").trim();
  if (!reply) throw new Error("The assistant returned an empty response.");
  return reply;
}

function fetchAiReply(message, previous) {
  if (settings.aiProvider === "chatgpt") {
    return fetchOpenAiCompatibleReply({
      endpoint: "https://api.openai.com/v1/chat/completions",
      apiKey: settings.openaiApiKey,
      model: settings.openaiModel || "gpt-4o-mini",
      message,
      previous,
    });
  }
  if (settings.aiProvider === "deepseek") {
    return fetchOpenAiCompatibleReply({
      endpoint: "https://api.deepseek.com/chat/completions",
      apiKey: settings.deepseekApiKey,
      model: settings.deepseekModel || "deepseek-chat",
      message,
      previous,
    });
  }
  if (settings.aiProvider === "gemini") {
    return fetchGeminiReply({
      apiKey: settings.geminiApiKey,
      model: settings.geminiModel || "gemini-flash-latest",
      message,
      previous,
    });
  }
  return Promise.reject(new Error("No online assistant selected."));
}

async function handleAssistantMessage(message) {
  const previous = conversationHistory();
  addAssistantMessage("user", message);

  if (settings.aiProvider === "offline") {
    addAssistantMessage("assistant", createAssistantReply(message));
    return;
  }

  const providerName = aiProviderLabels[settings.aiProvider];
  if (!currentAiApiKey()) {
    addAssistantMessage(
      "error",
      `Add your ${providerName} API key in Settings to chat online, or switch to the offline coach.`,
    );
    return;
  }

  assistantPending = true;
  renderAssistant();

  try {
    const reply = await fetchAiReply(message, previous);
    assistantPending = false;
    addAssistantMessage("assistant", reply);
  } catch (error) {
    assistantPending = false;
    addAssistantMessage("error", `${providerName} request failed: ${error.message}`);
  }
}

function renderTasks() {
  elements.list.replaceChildren();
  const remaining = settings.tasks.filter((task) => !task.completed).length;
  elements.count.textContent = `${remaining} ${remaining === 1 ? "task" : "tasks"} left`;

  settings.tasks.forEach((task) => {
    const item = document.createElement("li");
    item.className = `todo-item${task.completed ? " completed" : ""}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.setAttribute("aria-label", `Complete ${task.text}`);
    checkbox.addEventListener("change", () => {
      task.completed = checkbox.checked;
      save();
      renderTasks();
    });

    const label = document.createElement("label");
    label.textContent = task.text;

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-task";
    deleteButton.type = "button";
    deleteButton.textContent = "×";
    deleteButton.setAttribute("aria-label", `Delete ${task.text}`);
    deleteButton.addEventListener("click", () => {
      settings.tasks = settings.tasks.filter((candidate) => candidate.id !== task.id);
      save();
      renderTasks();
    });

    const focusing = focusSession?.taskId === task.id;
    if (focusing) item.classList.add("focusing");
    const playButton = document.createElement("button");
    playButton.type = "button";
    playButton.className = "focus-task";
    playButton.textContent = focusing ? "🎯" : "▶";
    playButton.hidden = task.completed;
    playButton.disabled = Boolean(focusSession);
    playButton.title = focusing ? "Focusing on this task" : "Start a focus session on this task";
    playButton.setAttribute("aria-label", focusing ? `Focusing on ${task.text}` : `Focus on ${task.text}`);
    playButton.addEventListener("click", () => startFocusFromTask(task));

    item.append(checkbox, label, playButton, deleteButton);
    elements.list.append(item);
  });
}

function toggleSettings(open) {
  elements.panel.hidden = !open;
  elements.backdrop.hidden = !open;
  if (open) elements.name.focus();
}

function faviconLetter(label, url) {
  const source = label.trim() || url.replace(/^https?:\/\/(www\.)?/i, "");
  return source.charAt(0).toUpperCase() || "?";
}

function renderLinks() {
  document.querySelectorAll(".links-list").forEach((list) => {
    list.replaceChildren();

    if (!settings.links.length) {
      const empty = document.createElement("li");
      empty.className = "links-empty";
      empty.textContent = "No links yet — add one below.";
      list.append(empty);
      return;
    }

    settings.links.forEach((link) => {
      const item = document.createElement("li");
      item.className = "links-item";

      const favicon = document.createElement("span");
      favicon.className = "link-favicon";
      favicon.setAttribute("aria-hidden", "true");
      favicon.textContent = faviconLetter(link.label, link.url);

      const anchor = document.createElement("a");
      anchor.href = link.url;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = link.label || link.url;
      anchor.addEventListener("click", (event) => {
        // The Chrome new-tab override page can swallow a plain target="_blank"
        // navigation, so open the tab explicitly through the extension API
        // (falling back to window.open on a normal web page).
        event.preventDefault();
        if (typeof chrome !== "undefined" && chrome.tabs?.create) {
          chrome.tabs.create({ url: link.url });
        } else {
          window.open(link.url, "_blank", "noopener,noreferrer");
        }
      });

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "delete-link";
      deleteButton.textContent = "×";
      deleteButton.setAttribute("aria-label", `Remove ${link.label || link.url}`);
      deleteButton.addEventListener("click", () => {
        settings.links = settings.links.filter((candidate) => candidate.id !== link.id);
        save();
        renderLinks();
      });

      item.append(favicon, anchor, deleteButton);
      list.append(item);
    });
  });
}

function addLink(rawLabel, rawUrl) {
  const label = rawLabel.trim();
  let url = rawUrl.trim();
  if (!url) return;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  settings.links.push({ id: crypto.randomUUID(), label, url });
  save();
  renderLinks();
}

document.querySelector("#todo-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.querySelector("#todo-input");
  const text = input.value.trim();
  if (!text) return;
  settings.tasks.push({ id: crypto.randomUUID(), text, completed: false });
  input.value = "";
  save();
  renderTasks();
});

elements.focus.addEventListener("change", () => {
  settings.focus = elements.focus.value.trim();
  save();
});

elements.focusDuration.addEventListener("change", () => {
  const isCustom = elements.focusDuration.value === "custom";
  elements.focusCustomDuration.hidden = !isCustom;
  if (isCustom) {
    elements.focusCustomDuration.focus();
  }
});

elements.focusCustomDuration.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    startFocusSession();
  }
});

elements.focusStart.addEventListener("click", () => startFocusSession());
elements.focusSkip.addEventListener("click", () => sendFocusMessage({ type: "focus:skipBreak" }));
elements.focusPause.addEventListener("click", () => togglePauseFocusSession());
elements.focusStop.addEventListener("click", () => sendFocusMessage({ type: "focus:stop" }));

document.querySelector("#clear-focus-history").addEventListener("click", () => {
  settings.focusHistory = [];
  save();
  renderFocusHistory();
});

elements.name.addEventListener("input", () => {
  settings.name = elements.name.value.trim();
  save();
  renderClock();
});

elements.twentyFourHour.addEventListener("change", () => {
  settings.use24Hour = elements.twentyFourHour.checked;
  save();
  renderClock();
  renderAlarms();
});

function setBlockSitesEnabled(enable) {
  const apply = () => {
    settings.blockSites = enable;
    save();
    renderBlocker();
  };
  if (enable && typeof chrome !== "undefined" && chrome.permissions?.request) {
    chrome.permissions.request({ origins: ["<all_urls>"] }, (granted) => {
      if (granted) {
        apply();
      } else {
        renderBlocker();
      }
    });
  } else {
    apply();
  }
}

elements.blockSites.addEventListener("change", () => setBlockSitesEnabled(elements.blockSites.checked));
elements.blockerMaster.addEventListener("change", () => setBlockSitesEnabled(elements.blockerMaster.checked));

const expandedBlockerGroups = new Set();

function renderBlocker() {
  elements.blockSites.checked = settings.blockSites;
  elements.blockerMaster.checked = settings.blockSites;
  elements.blockerGroups.replaceChildren(
    ...settings.blockGroups.map((group) => {
      const item = document.createElement("li");
      item.className = "blocker-group";

      const row = document.createElement("div");
      row.className = "blocker-group-row";
      const name = document.createElement("span");
      name.className = "blocker-group-name";
      name.textContent = `${group.emoji || "📁"} ${group.name}`;
      const count = document.createElement("span");
      count.className = "blocker-count";
      count.textContent = String(parseBlockedSites(group.sites.join("\n")).length);
      name.append(count);

      const toggle = document.createElement("input");
      toggle.type = "checkbox";
      toggle.checked = group.enabled;
      toggle.setAttribute("aria-label", `Block ${group.name}`);
      toggle.addEventListener("change", () => {
        group.enabled = toggle.checked;
        save();
      });

      const expand = document.createElement("button");
      expand.type = "button";
      expand.className = "blocker-expand";
      expand.textContent = "▾";
      expand.setAttribute("aria-label", `Edit ${group.name} sites`);
      expand.setAttribute("aria-expanded", String(expandedBlockerGroups.has(group.id)));

      row.append(name, toggle, expand);

      const edit = document.createElement("div");
      edit.className = "blocker-edit";
      edit.hidden = !expandedBlockerGroups.has(group.id);
      const textarea = document.createElement("textarea");
      textarea.rows = 5;
      textarea.spellcheck = false;
      textarea.value = group.sites.join("\n");
      textarea.setAttribute("aria-label", `${group.name} websites, one per line`);
      textarea.addEventListener("change", () => {
        group.sites = parseBlockedSites(textarea.value);
        save();
        count.textContent = String(group.sites.length);
      });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "clear-assistant";
      remove.textContent = "Delete group";
      remove.addEventListener("click", () => {
        settings.blockGroups = settings.blockGroups.filter((candidate) => candidate !== group);
        save();
        renderBlocker();
      });
      edit.append(textarea, remove);

      expand.addEventListener("click", () => {
        const open = edit.hidden;
        edit.hidden = !open;
        expand.setAttribute("aria-expanded", String(open));
        if (open) expandedBlockerGroups.add(group.id);
        else expandedBlockerGroups.delete(group.id);
      });

      item.append(row, edit);
      return item;
    }),
  );
}

elements.blockerAddForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = elements.blockerAddName.value.trim();
  if (!name) return;
  const id = `custom-${Date.now()}`;
  settings.blockGroups.push({ id, emoji: "📁", name, enabled: true, sites: [] });
  expandedBlockerGroups.add(id);
  elements.blockerAddName.value = "";
  save();
  renderBlocker();
});

elements.blockerButton.addEventListener("click", () => {
  const isOpen = !elements.blockerDropdown.hidden;
  elements.blockerDropdown.hidden = isOpen;
  elements.blockerButton.setAttribute("aria-expanded", String(!isOpen));
});

document.addEventListener("click", (event) => {
  if (elements.blockerDropdown.hidden) return;
  if (event.target.closest(".blocker-widget") || !event.target.isConnected) return;
  elements.blockerDropdown.hidden = true;
  elements.blockerButton.setAttribute("aria-expanded", "false");
});

elements.stashOnFocus.addEventListener("change", () => {
  settings.stashOnFocus = elements.stashOnFocus.checked;
  save();
});

function cycleSummaryText() {
  return `Repeat with breaks (${settings.breakMinutes} min, long break every ${settings.roundsBeforeLongBreak})`;
}

document.querySelectorAll(".cycles-toggle").forEach((toggle) => {
  toggle.addEventListener("change", () => {
    settings.cyclesEnabled = toggle.checked;
    document.querySelectorAll(".cycles-toggle").forEach((other) => {
      other.checked = settings.cyclesEnabled;
    });
    save();
  });
});

[
  [elements.breakMinutes, "breakMinutes", 1, 60],
  [elements.longBreakMinutes, "longBreakMinutes", 1, 120],
  [elements.roundsBeforeLong, "roundsBeforeLongBreak", 2, 12],
  [elements.dailyGoal, "dailyGoalMinutes", 0, 720],
].forEach(([input, key, min, max]) => {
  input.addEventListener("change", () => {
    const value = Math.round(Number(input.value));
    settings[key] = Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : defaults[key];
    input.value = settings[key];
    save();
    elements.cycleSummary.textContent = cycleSummaryText();
    renderStats();
  });
});

elements.autoStartFocus.addEventListener("change", () => {
  settings.autoStartFocus = elements.autoStartFocus.checked;
  save();
});

document.querySelector("#open-shortcuts").addEventListener("click", () => {
  if (typeof chrome !== "undefined" && chrome.tabs?.create) chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
});

elements.notifyOnComplete.addEventListener("change", () => {
  settings.notifyOnComplete = elements.notifyOnComplete.checked;
  save();
});

elements.stashNow.addEventListener("click", stashOpenTabs);
elements.stashRestore.addEventListener("click", restoreStashedTabs);
elements.stashClear.addEventListener("click", () => {
  stashedTabs = [];
  writeStoredValue(stashStorageKey, stashedTabs);
  renderStash();
});

elements.blockNotifications.addEventListener("change", () => {
  settings.blockNotifications = elements.blockNotifications.checked;
  // background.js sees the saved change and blocks or restores notifications.
  save();
  renderFocusSession();
});

document.querySelector("#clear-tasks").addEventListener("click", () => {
  settings.tasks = settings.tasks.filter((task) => !task.completed);
  save();
  renderTasks();
});

document.querySelectorAll(".links-form").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const label = form.querySelector(".link-label");
    const url = form.querySelector(".link-url");
    addLink(label.value, url.value);
    label.value = "";
    url.value = "";
  });
});

elements.linksButton.addEventListener("click", () => {
  const isOpen = !elements.linksDropdown.hidden;
  elements.linksDropdown.hidden = isOpen;
  elements.linksButton.setAttribute("aria-expanded", String(!isOpen));
});

document.addEventListener("click", (event) => {
  if (elements.linksDropdown.hidden) return;
  if (event.target.closest(".links-widget")) return;
  elements.linksDropdown.hidden = true;
  elements.linksButton.setAttribute("aria-expanded", "false");
});

document.querySelectorAll(".settings-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".settings-tab").forEach((candidate) => {
      candidate.setAttribute("aria-selected", String(candidate === tab));
    });
    document.querySelectorAll(".settings-tab-panel").forEach((panel) => {
      panel.hidden = panel.id !== `settings-tab-${tab.dataset.tab}`;
    });
  });
});

elements.aiProvider.addEventListener("change", () => {
  settings.aiProvider = elements.aiProvider.value;
  save();
  updateAssistantModeLabel();
  updateAiProviderVisibility();
});

elements.openaiKey.addEventListener("input", () => {
  settings.openaiApiKey = elements.openaiKey.value.trim();
  save();
});

elements.openaiModel.addEventListener("change", () => {
  settings.openaiModel = elements.openaiModel.value;
  save();
});

elements.deepseekKey.addEventListener("input", () => {
  settings.deepseekApiKey = elements.deepseekKey.value.trim();
  save();
});

elements.deepseekModel.addEventListener("change", () => {
  settings.deepseekModel = elements.deepseekModel.value;
  save();
});

elements.geminiKey.addEventListener("input", () => {
  settings.geminiApiKey = elements.geminiKey.value.trim();
  save();
});

elements.geminiModel.addEventListener("change", () => {
  settings.geminiModel = elements.geminiModel.value;
  save();
});

elements.soundsToggle.addEventListener("click", () => toggleMusic());

elements.musicVolume.addEventListener("input", () => {
  settings.musicVolume = Number(elements.musicVolume.value);
  setMusicVolume(settings.musicVolume);
});

// Save once the slider is released rather than on every step of the drag.
elements.musicVolume.addEventListener("change", () => save());

elements.musicButton.addEventListener("click", () => toggleMusic());

elements.soundsCaret.addEventListener("click", () => {
  const isOpen = !elements.soundsDropdown.hidden;
  elements.soundsDropdown.hidden = isOpen;
  elements.soundsCaret.setAttribute("aria-expanded", String(!isOpen));
});

document.addEventListener("click", (event) => {
  if (elements.soundsDropdown.hidden) return;
  if (event.target.closest(".sounds-widget") || !event.target.isConnected) return;
  elements.soundsDropdown.hidden = true;
  elements.soundsCaret.setAttribute("aria-expanded", "false");
});

// Escape closes whichever top-bar dropdown is open.
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  [
    [elements.soundsDropdown, elements.soundsCaret],
    [elements.linksDropdown, elements.linksButton],
    [elements.blockerDropdown, elements.blockerButton],
  ].forEach(([dropdown, button]) => {
    if (dropdown.hidden) return;
    dropdown.hidden = true;
    button.setAttribute("aria-expanded", "false");
    button.focus();
  });
});

document.querySelector("#settings-button").addEventListener("click", () => toggleSettings(true));
document.querySelector("#close-settings").addEventListener("click", () => toggleSettings(false));
elements.backdrop.addEventListener("click", () => toggleSettings(false));

document.querySelector("#assistant-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const message = elements.assistantInput.value.trim();
  if (!message) return;
  elements.assistantInput.value = "";
  handleAssistantMessage(message);
});

document.querySelector("#clear-assistant").addEventListener("click", () => {
  assistantMessages = [];
  saveAssistant();
  renderAssistant();
});

elements.assistantButton.addEventListener("click", () => {
  elements.assistantPanel.hidden = false;
  elements.assistantButton.hidden = true;
  elements.assistantInput.focus();
});

document.querySelector("#close-assistant").addEventListener("click", () => {
  elements.assistantPanel.hidden = true;
  elements.assistantButton.hidden = false;
});

// Fill the form controls from settings, skipping whichever one the user is typing in.
function applySettingsToUi() {
  const setValue = (element, value) => {
    if (document.activeElement !== element) element.value = value;
  };
  setValue(elements.focus, settings.focus);
  setValue(elements.name, settings.name);
  elements.twentyFourHour.checked = settings.use24Hour;
  elements.aiProvider.value = settings.aiProvider;
  setValue(elements.openaiKey, settings.openaiApiKey);
  elements.openaiModel.value = settings.openaiModel;
  setValue(elements.deepseekKey, settings.deepseekApiKey);
  elements.deepseekModel.value = settings.deepseekModel;
  setValue(elements.geminiKey, settings.geminiApiKey);
  elements.geminiModel.value = settings.geminiModel;
  elements.musicVolume.value = settings.musicVolume;
  renderSounds();
  elements.blockNotifications.checked = settings.blockNotifications;
  elements.stashOnFocus.checked = settings.stashOnFocus;
  elements.notifyOnComplete.checked = settings.notifyOnComplete;
  elements.alarmSound.value = settings.alarmSound;
  elements.focusEndSound.value = settings.focusEndSound;
  elements.alarmVolume.value = settings.alarmVolume;
  renderAlarms();
  document.querySelectorAll(".cycles-toggle").forEach((toggle) => {
    toggle.checked = Boolean(settings.cyclesEnabled);
  });
  setValue(elements.breakMinutes, settings.breakMinutes);
  setValue(elements.longBreakMinutes, settings.longBreakMinutes);
  setValue(elements.roundsBeforeLong, settings.roundsBeforeLongBreak);
  setValue(elements.dailyGoal, settings.dailyGoalMinutes);
  elements.autoStartFocus.checked = settings.autoStartFocus;
  elements.cycleSummary.textContent = cycleSummaryText();
  if (!focusSession && document.activeElement !== elements.focusDuration) {
    const preset = [...elements.focusDuration.options].some((option) => option.value === String(settings.focusMinutes));
    elements.focusDuration.value = preset ? String(settings.focusMinutes) : "custom";
    elements.focusCustomDuration.hidden = preset;
    if (!preset) setValue(elements.focusCustomDuration, settings.focusMinutes);
  }
  renderBlocker();
  setValue(elements.focusCustomDuration, settings.customFocusMinutes || 30);
  updateAssistantModeLabel();
  updateAiProviderVisibility();
  renderClock();
  renderTasks();
  renderFocusHistory();
  renderLinks();
  renderFocusSession();
}

// Keep every open dashboard in step with changes from other tabs and the background script.
function listenForStorageChanges() {
  if (typeof chrome === "undefined" || !chrome.storage?.onChanged) return;
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    const changedSettings = changes[storageKey]?.newValue;
    if (changedSettings && (changedSettings.updatedAt || 0) > (settings.updatedAt || 0)) {
      settings = { ...defaults, ...changedSettings };
      applySettingsToUi();
    }
    if (changes[assistantStorageKey]) {
      assistantMessages = Array.isArray(changes[assistantStorageKey].newValue) ? changes[assistantStorageKey].newValue : [];
      renderAssistant();
    }
    if (changes[ringingStorageKey]) renderRinging(changes[ringingStorageKey].newValue);
    if (changes[taskCheckStorageKey]) renderTaskCheck(changes[taskCheckStorageKey].newValue);
    if (changes[sessionStorageKey]) {
      focusSession = changes[sessionStorageKey].newValue || null;
      renderFocusSession();
      renderTasks();
    }
  });
}

readSyncedSettings((syncedSettings) => {
readStoredValue(storageKey, (settingsResult) => {
  readStoredValue(assistantStorageKey, (assistantResult) => {
    const localSettings = settingsResult[storageKey];
    // Synced settings only win when they are newer, e.g. edited on another computer.
    // An older synced copy (such as one whose write failed on quota) must not
    // overwrite newer local data.
    const useSynced = !localSettings || (syncedSettings.updatedAt || 0) > (localSettings.updatedAt || 0);
    const storedSettings = useSynced ? { ...(localSettings || {}), ...syncedSettings } : localSettings;
    settings = { ...defaults, ...storedSettings };
    assistantMessages = Array.isArray(assistantResult[assistantStorageKey])
      ? assistantResult[assistantStorageKey]
      : [];
    if (!Array.isArray(settings.focusHistory)) settings.focusHistory = [];
  if (!Array.isArray(settings.links)) settings.links = [];
  if (!Array.isArray(settings.alarms)) settings.alarms = [];
  if (typeof storedSettings.aiProvider !== "string" && typeof storedSettings.useChatGpt === "boolean") {
    // Migrate the old on/off ChatGPT toggle to the new provider selection.
    settings.aiProvider = storedSettings.useChatGpt === false ? "offline" : "chatgpt";
  }
  if (!settings.geminiModel || settings.geminiModel.startsWith("gemini-1.5") || settings.geminiModel.startsWith("gemini-2.0") || settings.geminiModel === "gemini-3.8-flash") {
    // gemini-flash-latest points to Google's current active stable release and avoids high-demand spikes
    settings.geminiModel = "gemini-flash-latest";
  }
  if (!Array.isArray(settings.blockGroups) || !settings.blockGroups.length) {
    settings.blockGroups = defaults.blockGroups.map((group) => ({ ...group, sites: [...group.sites] }));
  }
  // Repair icons saved as "?" by an earlier build.
  settings.blockGroups.forEach((group) => {
    if (/^\?+$/.test(group.emoji || "")) {
      group.emoji = (defaults.blockGroups.find((d) => d.id === group.id) || {}).emoji || "📁";
    }
  });
  if (typeof storedSettings.blockedSites === "string" && storedSettings.blockedSites.trim() !== "facebook.com\nx.com\ntwitter.com\ninstagram.com\ntiktok.com\nreddit.com\nyoutube.com" && !storedSettings.blockGroups) {
    // Keep sites typed into the earlier single-list blocker as their own group.
    settings.blockGroups.push({ id: "mine", emoji: "📁", name: "My sites", enabled: true, sites: parseBlockedSites(storedSettings.blockedSites) });
  }
  delete settings.blockedSites;
  delete settings.useChatGpt;
  readStoredValue(ringingStorageKey, (ringingResult) => renderRinging(ringingResult[ringingStorageKey]));
  readStoredValue(taskCheckStorageKey, (checkResult) => renderTaskCheck(checkResult[taskCheckStorageKey]));
  readStoredValue(sessionStorageKey, (sessionResult) => {
    focusSession = sessionResult[sessionStorageKey] || null;
    applySettingsToUi();
    renderQuote();
    renderAssistant();
    if (!assistantMessages.length) {
      addAssistantMessage("assistant", welcomeMessage());
    }
    listenForStorageChanges();
    setInterval(renderClock, 1000);
  });
  });
});
});

const backgroundPhotoIds = [
  "1506744038136-46273834b3fb",
  "1469474968028-56623f02e42e",
  "1441974231531-c6227db76b6e",
  "1507525428034-b723cf961d3e",
  "1519681393784-d120267933ba",
  "1500530855697-b586d89ba3ee",
  "1470071459604-3b5ec3a7fe05",
  "1501785888041-af3ef285b470",
  "1472214103451-9374bd1c798e",
  "1418065460487-3e41a6c84dc5",
  "1476514525535-07fb3b4ae5f1",
  "1464822759023-fed622ff2c3b",
];

function startBackgroundSlideshow() {
  const layers = [document.querySelector("#bg-a"), document.querySelector("#bg-b")];
  if (!layers[0] || !layers[1]) return;
  const order = [...backgroundPhotoIds].sort(() => Math.random() - 0.5);
  let index = 0;
  let front = 0;

  const showNext = () => {
    const id = order[index % order.length];
    index += 1;
    const url = "https://images.unsplash.com/photo-" + id + "?auto=format&fit=crop&w=1920&q=70";
    const loader = new Image();
    loader.onload = () => {
      const next = layers[1 - front];
      next.style.backgroundImage = "url(\"" + url + "\")";
      next.classList.add("visible");
      layers[front].classList.remove("visible");
      front = 1 - front;
    };
    loader.src = url;
  };

  showNext();
  setInterval(showNext, 60000);
}

startBackgroundSlideshow();

(function setupFocusCardToggle() {
  const card = document.querySelector("#focus-card");
  const overlay = document.querySelector("#focus-overlay");
  const mini = document.querySelector("#focus-mini");
  const miniText = document.querySelector("#focus-mini-text");
  const countdown = document.querySelector("#focus-countdown");
  const countdownTime = document.querySelector("#focus-countdown-time");
  if (!card || !mini) return;

  const setExpanded = (expanded) => {
    card.classList.toggle("collapsed", !expanded);
    overlay.hidden = !expanded;
    mini.setAttribute("aria-expanded", String(expanded));
  };

  mini.addEventListener("click", () => setExpanded(true));
  document.querySelector("#focus-close").addEventListener("click", () => setExpanded(false));
  overlay.addEventListener("click", () => setExpanded(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !card.classList.contains("collapsed")) setExpanded(false);
  });

  setInterval(() => {
    const running = countdown && !countdown.hidden;
    const label = running && focusSession && focusSession.phase && focusSession.phase !== "focus" ? "Break " : "Focus ";
    miniText.textContent = running ? label + countdownTime.textContent : "Focus";
  }, 500);
})();

(function setupTodoCardToggle() {
  const card = document.querySelector("#todo-card");
  const overlay = document.querySelector("#todo-overlay");
  const mini = document.querySelector("#todo-mini");
  const miniText = document.querySelector("#todo-mini-text");
  const taskCount = document.querySelector("#task-count");
  const focusCard = document.querySelector("#focus-card");
  if (!card || !mini) return;

  const setExpanded = (expanded) => {
    if (expanded && focusCard) document.querySelector("#focus-close").click();
    card.classList.toggle("collapsed", !expanded);
    overlay.hidden = !expanded;
    mini.setAttribute("aria-expanded", String(expanded));
  };

  mini.addEventListener("click", () => setExpanded(true));
  document.querySelector("#todo-close").addEventListener("click", () => setExpanded(false));
  overlay.addEventListener("click", () => setExpanded(false));
  document.querySelector("#focus-mini").addEventListener("click", () => setExpanded(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !card.classList.contains("collapsed")) setExpanded(false);
  });

  setInterval(() => {
    const count = taskCount ? taskCount.textContent.trim() : "";
    miniText.textContent = count || "Tasks";
  }, 500);
})();

function dailyQuote(date = new Date()) {
  const dayNumber = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  return quotes[dayNumber % quotes.length];
}

function renderQuote() {
  document.querySelector("#quote").textContent = dailyQuote();
}

setInterval(() => {
  const quote = document.querySelector("#quote");
  if (quote && quote.textContent !== dailyQuote()) renderQuote();
  // Today's minutes and the streak roll over at midnight.
  renderStats();
}, 60000);

readStoredValue(stashStorageKey, (result) => {
  const stored = result && result[stashStorageKey];
  stashedTabs = Array.isArray(stored) ? stored : [];
  renderStash();
});
