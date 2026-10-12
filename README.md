# SHADOW MD (mini)

WhatsApp bot with a **built-in pairing website**, ready for **Railway**.
Owner: **RANA FURQAN** · No database · Sessions and settings are stored in local files.

- Channel: <https://whatsapp.com/channel/0029VbCiT0g8vd1P3dJZqm2J>
- Group: <https://chat.whatsapp.com/FGW9EITclIg2obBhZkkVTn?s=cl&p=a&mlu=4&ilr=4>
- Repository: <https://github.com/shadowmd2007/SHADOW-MD-MINI>

## How it works

One Node.js process runs two things:

1. **The pairing website** (`public/`) plus its API (`/api/...`), served by Express on Railway's `PORT`.
2. **The WhatsApp bot** (Baileys). Every number paired through the website becomes its own bot session
   with its own settings (prefix, mode, sudo users, group options).

Pairing flow: enter your number → the server asks WhatsApp for a real pairing code → type it in
*WhatsApp → Linked devices → Link a device → Link with phone number instead* → the page shows
**Connected** only after WhatsApp reports an open connection. Status shown on the page:
starting → code ready → linking → connected, or expired / failed / cancelled with a clear message.

## Deploy on Railway (step by step)

1. **Upload the project to GitHub** (`shadowmd2007/SHADOW-MD-MINI`). `.gitignore` already excludes
   `data/`, `creds.json`, `.env` and `node_modules`. Never upload session files.
2. On <https://railway.app>: **New Project → Deploy from GitHub repo →** pick the repository.
   Railway installs the dependencies and runs `npm start` (see `railway.json`). `PORT` is injected by
   Railway and the server binds `0.0.0.0:$PORT`. A health check runs on `/health`.
3. **Get your website URL:** service → **Settings → Networking → Generate Domain**. The generated
   `https://….up.railway.app` address *is* your pairing website. No domain is hardcoded anywhere.
4. **Persistent authentication (do this, otherwise sessions are lost on every redeploy):**
   Railway's container disk is ephemeral. Without a volume, every redeploy/restart deletes the linked
   sessions and users must pair again.
   - Service → **Volumes → New Volume** → **Mount path: `/data`**
   - Service → **Variables → New Variable** → `DATA_DIR` = `/data`
   - Redeploy. Sessions then live in `/data/sessions/<number>/` and settings in `/data/settings/<number>.json`.
   Keep the service at **one replica** (sessions are local files).
5. Open your Railway URL, enter your number with country code, type the code in WhatsApp, wait for
   **Connected**. Then send `.menu` to the linked account (from another chat, or in "message yourself").
6. Optional: add AI keys (see below) in the Variables tab.

### Environment variables (all optional; see `.env.example`)

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | Provided by Railway |
| `DATA_DIR` | `./data` | Session + settings folder (`/data` with a Railway volume) |
| `PREFIX` | `.` | Default prefix for new sessions (change later with `.prefix`) |
| `MAX_SESSIONS` | `20` | Max linked numbers |
| `EXTRA_OWNERS` | – | Extra owner numbers (digits, comma separated) |
| `AUTO_FOLLOW_CHANNEL` | `false` | Newly linked accounts follow the channel |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | – / `gpt-4o-mini` | Enables `.gpt` and `.ai` |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | – / `gemini-2.5-flash` | Enables `.gemini` and `.ai` |
| `DEEPSEEK_API_KEY` / `DEEPSEEK_MODEL` | – / `deepseek-chat` | Enables `.deepseek` and `.ai` |
| `AI_PROVIDER` | first configured | Which provider `.ai` uses |
| `LOG_LEVEL` | `info` | `debug` for more detail |

Model names are defaults only; set the `*_MODEL` variables if a provider retires a model.
Without any AI key the bot runs normally and the AI menu simply does not appear.

## Commands

See **[COMMANDS.md](COMMANDS.md)** for the full generated list. The menu (`.menu`) is built from the
commands that are actually registered and usable, in the reference layout, ending with
`© POWERED BY RANA FURQAN MD`. `.menu <category>` (e.g. `.menu group`) shows usage details.

**Skipped on purpose** (no working, testable implementation available, or would need unverified
third-party scrapers): `.play .song .video .tiktok .fb .igdl .ytsearch` (downloaders/search scrapers),
`.sticker .attp .convert .caption` (need image/video processing binaries), `.tts`, `.url` (needs an
upload host), `.copilot` (no public API), `.status`, `.antidelete` (would store and re-send other
people's private messages), `.dance`, and the reference's numbered/duplicate/premium command batches
and unavailable AI model aliases. `.hug`/`.kiss` are text-only (no GIFs).

## Project layout

```
index.js                entry point
config.js               branding + settings (edit bot details here)
lib/sessionManager.js   pairing + session lifecycle
lib/server.js           web server + API
lib/handler.js          message handling, permissions, passive features
lib/registry.js         plugin loader
lib/menu.js             menu builder (reference style)
lib/settings.js         per-session settings in local JSON files
lib/http.js, lib/ai.js  safe HTTP client, optional AI providers
commands/               ALL command files, directly in this folder (no sub-folders; see _template.js)
public/                 pairing website
scripts/check.js        offline self-check  (npm run check)
```

## Run locally

```bash
npm install
npm start          # website on http://localhost:3000
npm run check      # offline self-check
```
Node.js 18+ is required (global `fetch`); 20+ recommended.

## Security notes

- Credentials are only written under `DATA_DIR/sessions/` (git-ignored, mode 0700). The API returns
  only the status and the short-lived pairing code, and logs never print credentials.
- Pairing requests are rate-limited per IP and expire after about 2 minutes. `.fetch`/`.getimage`
  block private/internal addresses, limit size and follow at most 3 checked redirects.
- Anyone who can open the website can request a code for a number, but only the holder of that
  WhatsApp account can accept it. Lower `MAX_SESSIONS` to limit usage.
- No temporary media files are written; downloads are handled in memory with size limits.

## Known limitations / needs live testing

See the final section of the delivery notes: real WhatsApp login, group admin actions, and the
external-service commands (`.define .dog .cat .neko .waifu`, AI) could not be exercised against the
live services in the build environment. Owner/admin detection compares phone numbers; in some groups
WhatsApp hides numbers behind `@lid` IDs, so detection there is best-effort (the linked account is always
treated as owner). Unofficial WhatsApp clients carry a risk of account restrictions; use at your own risk.
