<!-- markdownlint-disable MD041 -->

# Focus Plus privacy policy

Last updated: October 2026

Focus Plus is a Chrome new-tab extension. It has no account system, no analytics and no advertising, and the developer does not collect or receive any of your data.

## What is stored on your device

- Your settings, name, tasks, focus history, quick links, blocked-site groups and stashed tabs are stored in your browser with `chrome.storage`.
- Non-secret settings are saved with `chrome.storage.sync`, so Chrome may sync them across your signed-in devices. API keys and focus history are kept locally only.
- You can remove everything by uninstalling the extension.

## What is sent to other services

- **AI assistant (optional).** If you add an API key and use the assistant, the messages you type are sent directly from your browser to the provider you chose: OpenAI, DeepSeek or Google Gemini. Their own privacy policies apply. Nothing is sent unless you use the assistant.
- **Background photos.** The new tab page loads photos from images.unsplash.com.
- **Music.** The Chill radio tile streams from somafm.com. The YouTube and Spotify tabs show embedded players from YouTube (through a player page on this project's GitHub Pages site) and Spotify, which may set their own cookies and collect data under their own policies.

- **Focus Plus Pro (optional).** Payments are handled by ExtensionPay (extensionpay.com) and Stripe. The extension asks ExtensionPay whether you have paid; if you buy or start a trial, ExtensionPay and Stripe receive the details you enter there, under their own privacy policies.

## Permissions

- `storage`: save your settings and tasks.
- `alarms`: end a focus session on time, even when no new tab page is open.
- `notifications`: tell you when a focus session ends, if you leave that on, and show your alarms with Stop and Snooze buttons.
- `offscreen`: play alarm and focus-end sounds when no new tab page is open.
- `tabs`: read tab titles and addresses only to stash open tabs when you ask or when a focus session starts, and, if you set Pro daily limits, to count minutes on those sites. Only minutes per limited site are stored, on your device.
- `idle`: with Pro daily limits, skip counting time while your screen is locked.
- `contentSettings`: block website notifications during focus, if you turn that on.
- `declarativeNetRequest` and optional access to all sites: redirect sites on your blocked list to a "stay focused" page. Site access is requested only when you turn the blocker on, and the blocked list is never sent anywhere.
- Access to api.openai.com, api.deepseek.com and generativelanguage.googleapis.com: only to talk to the AI provider you choose.

## Data sharing

Focus Plus does not sell or share user data with third parties, and does not use it for purposes unrelated to the features above.

## Contact

Open an issue at <https://github.com/immanuellangat/focus-plus/issues>.
