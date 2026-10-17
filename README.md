# SHADOW MD MINI

Node.js WhatsApp multi-device bot with a built-in pairing page and green/black ping monitor.

## Deploy
- Node.js 20 or newer.
- Install dependencies with `npm install`.
- Start with `npm start`.
- On Railway, attach a persistent Volume mounted at `/app/data`.
- Set `AUTH_DIR=/app/data/shadow-auth/main` if using the default volume.
- Railway sets `PORT` automatically.
- Optional variables: `BOT_NAME`, `OWNER_NAME`, `OWNER_NUMBER`, `PREFIX`, `MODE`, `AUTH_DIR`, `FEATURES_FILE`.

## Pairing
Open the Railway public URL, enter your number in international digits (without `+`), and copy the pairing code into WhatsApp > Linked devices > Link with phone number instead. Pairing restarts the process so the bot can load the newly saved credentials. A persistent volume is required.

## Commands
Each command has a separate file in `commands/`. The requested automation toggles are owner-only. Group administration commands require the sender and bot to have the required group admin permissions. `.gcmute` changes the group to admins-only; `.gcunmute` reopens messaging to all members.

The `.autovoice` switch only records the preference; actual voice generation requires a TTS provider and is not included. `antidelete` cannot recover messages the bot never received, and WhatsApp's “Waiting for this message” is often caused by WhatsApp device/key synchronization; bot code cannot guarantee recovery of already-undelivered encrypted messages.

## Compatibility and testing
This package pins Baileys to the stable 6.7.x API family rather than jumping blindly to a breaking v7 prerelease. All JavaScript files pass Node's syntax checker in this environment; dependencies were not installed here, so a live WhatsApp pairing/deployment test has not been performed.
