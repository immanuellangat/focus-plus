# Focus Plus

Focus Plus is a small, dependency-free Chrome new-tab extension inspired
by the calm dashboard experience of Momentum.

## Features

- Clock, greeting, daily quote and rotating nature backgrounds.
- Focus timer with pause, stop, session history and Pomodoro-style focus/break cycles.
- Toolbar countdown, quick-control popup and keyboard shortcuts.
- Daily stats, 7-day chart, streaks and a daily goal.
- Alarm clock.
- Tasks (start a focus session from any task) and quick links.
- Ambient sounds, plus YouTube and Spotify players.
- Site blocker and notification silencing during focus sessions.
- Tab stash.
- Focus assistant powered by ChatGPT, DeepSeek or Gemini, or a private offline coach.
- Optional **Focus Plus Pro**: stronger blocking, insights and personalisation (see below).

## Focus Plus Pro

Everything above is free. **Focus Plus Pro** (with a 7-day free trial) adds:

- **Stronger blocking** (Settings → Blocking): strict mode (no "Unblock sites", blocker locked and an
  "are you sure?" before stopping early), scheduled blocking (for example weekdays 9–5, overnight schedules
  work too), allowlist mode (block everything except a list) and daily limits per site (counted while the
  site is the tab you're looking at; blocked until midnight once used up).
- **Insights** (✦ See all insights in the focus card): total focus, sessions, finish rate, longest streak,
  a 12-month heatmap, your best focus hours, time per task, and CSV export of your history.
- **Make it yours**: the **Mix** switch in the Sounds panel plays several sounds at once with their own
  volumes; add your own sounds and background photos (kept on this computer in IndexedDB, not synced);
  and six accent colours (Settings → General).

Free users see Pro features with an **Unlock with Pro** button. If Pro ends, everything you set up is kept
and comes back when you subscribe again.

### Setting up payments

Payments use [ExtensionPay](https://extensionpay.com) (Stripe underneath). Until it's set up, Pro can't be
bought and the Pro tab says so.

1. Create an ExtensionPay account and register the extension; choose your plans and a 7-day free trial.
1. Put the extension id it gives you in `EXTPAY_ID` at the top of `pro.js`.
1. Reload the extension. The Pro tab's buttons now open ExtensionPay's payment, trial and login pages.

The paid status is checked at startup, every 6 hours and when you come back to a dashboard tab.
`vendor/ExtPay.js` is ExtPay.js 3.1.2, unmodified, under the GNU LGPL v3 (licence texts in `vendor/`).

## Install locally

1. Open `chrome://extensions` in Chrome.
1. Enable **Developer mode**.
1. Select **Load unpacked**.
1. Choose this folder (the one containing `manifest.json`).
1. Open a new tab to see the dashboard.

To update the extension after editing, use **Reload** on its card in `chrome://extensions`.

## Storage

Settings and tasks are stored with `chrome.storage.local` (and, apart from API keys and
focus history, mirrored to `chrome.storage.sync` so they follow your Google account across
Chrome profiles where the extension is installed). Nothing is sent to a server of ours.

## How it works

The dashboard runs entirely in the browser and keeps preferences in local Chrome storage.
The focus assistant supports four modes, chosen from the **Assistant** dropdown in the
**AI assistant** settings tab: **ChatGPT (OpenAI)**, **DeepSeek**, **Gemini (Google)**, or
the private **Offline coach**.

Pick ChatGPT, DeepSeek, or Gemini, paste your own API key for that provider, and choose a
model. Each key is stored only in `chrome.storage.local` on your device and is sent
directly to that provider (`https://api.openai.com`, `https://api.deepseek.com`, or
`https://generativelanguage.googleapis.com`) with each message, never through any other
server. Switch the dropdown to **Offline coach** at any time to use a rule-based assistant
that never sends messages or personal data over the network.

Type your main focus, pick a session length (or choose **Custom...** to enter your own
desired minutes), and select **Start focus** to begin a countdown timer. Select **Pause**
to hold the countdown and **Resume** to continue, or **Stop session** to end early. Every
session, whether finished or stopped early, is added to **Focus history** below, which is
stored in `chrome.storage.local` so it persists between visits. A session belongs to the browser, not to one tab: every new tab
shows the same countdown, and the session still ends on time (lifting its blocks) if you close them all.
When a session finishes, Chrome shows a notification (turn this off with
**Notify me when a session ends** in the **Focus** tab of **Settings**). Use **Clear history** to
remove it.

The 🔗 button in the top-left corner opens a quick-links menu. Add a name and URL to
save a shortcut, click a saved link to open it in a new tab, and use **×** to remove it.
The same list is also editable from the **Links** tab in **Settings**, since both share
the same saved data.

Starting a focus session also silences browser notification pop-ups from other sites,
so nothing interrupts you. Look for the **🔕 Notifications paused** note under the
countdown while a session is active — this can be turned off from the **Focus** tab
in **Settings** if you'd rather keep notifications on.

**Settings** is organized into tabs — **General**, **Focus**, **Links**, and **AI
assistant** — so related options are grouped together instead of one long scrolling list.

The dashboard background crossfades through calm nature photos from Unsplash every minute;
if you are offline, the default gradient stays in place.

The focus timer starts minimized as a small pill above the Focus assistant button. Tap it to
expand it to the center of the screen, and use the close button, the backdrop or Escape to
minimize it. While a session runs, the pill shows the remaining time. The Tasks card works the same way,\nwith its own pill stacked above the focus pill.

The quote under the clock changes every day. There are 65 encouraging quotes that cycle in order,
so each day shows a different one and the list starts over after the last. It also updates at midnight
if the tab stays open.

The **Play** button in the top bar plays and pauses music, and the small ▾ next to it drops down a tile grid (Rainfall, Wind, Noise, Ocean, Beach, Forest,
Stream, Train, Thunder, Fire, Calm tone and Chill radio). Everything except Chill radio works offline; Chill radio streams SomaFM's Groove Salad and needs a connection. Each tile shows a small Unsplash photo (loaded online, with a gradient fallback offline). Tap a tile to start it; the ▶/⏸ button inside the panel pauses and resumes it. The panel also has **YouTube** (Lofi Girl, Chillhop, jazz and piano live streams, nature sounds) and **Spotify** (Deep Focus, Lofi Beats, Peaceful Piano and similar playlists) tabs that play embedded players (YouTube plays through a small player page hosted on this project's GitHub Pages, because YouTube refuses to embed directly inside extension pages); they need an internet connection, Spotify plays full tracks only when you are logged in to Spotify in Chrome (otherwise 30-second previews), and starting one stops the built-in sound.

Rain, Wind, Ocean, Beach, Forest, Stream, Train and Thunder use real field recordings bundled in the `sounds/` folder, looped with a crossfade so
there is no audible gap, and fall back to synthesized noise if a file can't load. White noise is
generated as softer pink noise, and Fire is synthesized (soft embers plus random crackles) so it has no background hiss. Sound credits, from Wikimedia Commons:

- `rain.ogg`: "Rain (1)", public domain.
- `wind.ogg`: "Wind in Swedish pine forest at 25 mps" by W.carter, CC BY-SA 4.0.
- `ocean.ogg`: "Oceanwavescrushing" by Luftrum, CC BY 3.0.
- `beach.ogg`: "On a pebble beach", public domain.
- `forest.ogg`: "Birds forest", public domain.
- `stream.ogg`: "Shallow small river with stony riverbed", public domain.
- `train.ogg`: "Taiwan railways EP727 train cars sounds", CC0.
- `thunder.ogg`: "rbh-thunder-storm" by Richard Humphries, CC BY 3.0.

The 🚫 **Site Blocker** button in the top bar opens a list of blocked groups (Social Media, Entertainment,
News, Shopping and Email). Switch a group on or off, open its arrow to edit the websites in it, or add your own
group. The master switch at the top of the panel (also in the **Focus** tab in **Settings**) turns blocking
on or off, and Chrome asks for extra permission the first time you enable it. While a focus session is
running, sites in the enabled groups and their subdomains show a "stay focused" page; the block lifts when
the session ends or is stopped, and that page has an **Unblock sites** button as an escape hatch.

**Focus cycles.** Tick **Repeat with breaks** under the focus timer (or in the **Focus** tab of
**Settings**) to run Pomodoro-style cycles: each finished focus round is followed by a short break,
and every few rounds by a long one (5 min, 15 min and every 4 rounds by default; all adjustable). The next
round starts by itself after a break unless you turn that off. Site and notification blocking pause during
breaks. **Skip break** starts the next round straight away; **Stop session** ends the cycle.

**Toolbar and shortcuts.** The Focus Plus icon in Chrome's toolbar shows the minutes left (orange while
focusing, green on a break, ❚❚ when paused). Click it for a small panel to start, pause, stop or skip a
break from any page, with today's minutes and your streak. <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd>
starts a session with your last focus and length, or pauses and resumes it, and
<kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> stops it. Change the keys at `chrome://extensions/shortcuts`.

**Stats and streaks.** The focus card shows today's focus time, the last 7 days, a bar for each day, your
streak (days in a row with at least one finished session; today doesn't break it until it's over) and a
daily goal bar (120 minutes by default; set it, or 0 to hide it, in the **Focus** tab of **Settings**).

**Focus on a task.** Each open task has a ▶ button that starts a focus session on it (typing an open task's
exact name as your focus links it too). When the session finishes, the dashboard and the notification ask
whether the task is done, and **Mark done** ticks it off.

The **Alarms** tab in **Settings** is an alarm clock. Add a time, an optional label and how often it
repeats (once, every day or weekdays). When an alarm goes off, it rings with the sound you pick and shows
a notification with **Stop** and **Snooze 5 min** buttons; any open dashboard also shows a banner with the
same buttons. Alarms ring while Chrome is running, even with no new tab open, and a ring stops by itself
after a minute. The next alarm is shown next to the date at the top of the dashboard. The same tab sets the
sound played when a focus session ends (or **No sound**) and the alarm volume. All alarm sounds are
synthesized, so they work offline.

The **Focus** tab also has **Tab Stash**, which saves your other open tabs in the current window (pinned tabs are kept) and closes them, either
automatically when a focus session starts or with **Stash open tabs now**. Use **Restore all** to reopen them.
The stash is stored locally and is not synced between profiles.
