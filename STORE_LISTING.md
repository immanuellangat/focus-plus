<!-- markdownlint-disable MD041 -->

# Chrome Web Store listing notes

Copy these into the Developer Dashboard when you submit.

## Single purpose

A new-tab dashboard that helps you focus: a focus timer with breaks, stats and streaks, tasks, alarms, ambient sounds, a site blocker and an optional AI focus coach. The toolbar icon shows the time left and controls the timer from any page.

## Permission justifications

- `storage`: saves settings, tasks and focus history.
- `alarms`: ends a focus session on time and lifts its site and notification blocks, even when no new tab page is open.
- `notifications`: tells the user their focus session has ended (can be turned off in Settings) and shows the user's alarms with Stop and Snooze buttons.
- `offscreen`: plays alarm and focus-end sounds from a hidden page, because the background service worker cannot play audio.
- `tabs`: reads tab titles and addresses to stash open tabs when the user starts a focus session or taps "Stash open tabs now", and to count minutes on sites the user gives a daily limit (Pro).
- `idle`: Pro daily limits don't count time while the screen is locked.
- `contentSettings`: blocks website notifications during focus when the user enables it.
- `declarativeNetRequest`: redirects sites on the user's blocked list to a local "stay focused" page.
- Optional host permission `<all_urls>`: requested only when the user turns the site blocker on, because blocked sites can be any domain the user chooses.
- Host permissions for api.openai.com, api.deepseek.com and generativelanguage.googleapis.com: send the user's assistant messages to the provider they selected.
- `web_accessible_resources` (`blocked.html`): lets the redirect to the "stay focused" page work on blocked sites.

## Paid features

Focus Plus Pro (strict mode, scheduled blocking, allowlist mode, daily limits, insights and personalisation) is sold through ExtensionPay. The listing must say the extension contains in-app purchases.

## Remote code

None. All JavaScript is bundled. YouTube and Spotify are shown in iframes.

## Data usage disclosures

- Collects: website content (assistant messages the user types, only when the assistant is used) and web history (tab addresses, kept on the device only).
- Not sold, not used for unrelated purposes, not used for creditworthiness or lending.
- Privacy policy URL: <https://immanuellangat.github.io/focus-plus/PRIVACY.html>

## Before submitting

- Take 1280x800 screenshots of the new tab page, the Sounds panel and the settings.
- Upload the 128 px icon from `icons/` as the store icon.
- Zip the extension folder without `README.md`, `STORE_LISTING.md` and `PRIVACY.md`.
