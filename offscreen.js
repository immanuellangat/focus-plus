// Plays alarm and focus-end sounds for background.js, which can't play audio itself.
// Sounds are synthesized, so nothing needs to be downloaded.

let context = null;
let master = null;
let doneTimer = null;

function tone(output, frequency, start, length, type, level) {
  const oscillator = context.createOscillator();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  const envelope = context.createGain();
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(level, start + 0.015);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + length);
  oscillator.connect(envelope).connect(output);
  oscillator.start(start);
  oscillator.stop(start + length + 0.05);
}

// Each pattern plays one cycle at time `t` and repeats every `every` seconds.
const patterns = {
  chime: {
    every: 2.2,
    play(output, t) {
      [523.25, 659.25, 783.99].forEach((frequency, i) => tone(output, frequency, t + i * 0.18, 1.4, "sine", 0.5));
    },
  },
  bell: {
    every: 2.6,
    play(output, t) {
      [[880, 0.6], [1760, 0.22], [2637, 0.1]].forEach(([frequency, level]) => tone(output, frequency, t, 2.3, "sine", level));
    },
  },
  beep: {
    every: 1.3,
    play(output, t) {
      [0, 0.2, 0.4].forEach((delay) => tone(output, 988, t + delay, 0.12, "square", 0.16));
    },
  },
  rise: {
    every: 3.2,
    play(output, t) {
      [392, 493.88, 587.33, 783.99].forEach((frequency, i) => tone(output, frequency, t + i * 0.35, 1.8, "triangle", 0.35));
    },
  },
};

function stop() {
  clearTimeout(doneTimer);
  doneTimer = null;
  if (master) {
    master.disconnect();
    master = null;
  }
}

function play({ sound, volume, seconds }) {
  stop();
  const pattern = patterns[sound];
  if (!pattern) return;
  context = context || new AudioContext();
  master = context.createGain();
  master.gain.value = Math.max(0, Math.min(100, Number(volume) || 0)) / 100;
  master.connect(context.destination);

  const cycles = Math.max(1, Math.ceil(seconds / pattern.every));
  const start = context.currentTime + 0.05;
  for (let i = 0; i < cycles; i += 1) pattern.play(master, start + i * pattern.every);

  const playing = master;
  doneTimer = setTimeout(() => {
    if (master !== playing) return;
    stop();
    chrome.runtime.sendMessage({ type: "sound:done" }).catch(() => {});
  }, (cycles * pattern.every + 2.5) * 1000);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== "offscreen") return false;
  if (message.type === "play") play(message);
  if (message.type === "stop") stop();
  sendResponse({ ok: true });
  return false;
});
