# RANA MD WhatsApp Bot

Owner: Rana Furqan Rajput  
Owner number: 923003719761  
Menu image URL: https://postimg.cc/bSvZsvLB

## Setup
1. Install Node.js 20 or newer.
2. Extract this ZIP.
3. Run `npm install`
4. Run `npm start`
5. Scan the QR shown in terminal from WhatsApp > Linked devices.

## Important
- Do not upload or share the `auth_info_baileys` folder. It contains your private WhatsApp login session.
- This ZIP intentionally does not include session credentials.
- WhatsApp/Baileys can change; no one can honestly guarantee zero errors on every host. Test first in a separate deployment.
- Some commands require group-admin permissions or an external service and will explain when unavailable.
- Keep the bot compliant with WhatsApp terms and avoid spam or bulk unsolicited messaging.

## Commands
Use `.menu` or `.help`. Prefix defaults to `.`. There are 160+ registered command names/aliases.

## API-backed commands
- `.weather city` uses wttr.in (public endpoint; rate limits/availability may vary).
- `.define word` uses Free Dictionary API.
- `.wiki topic` uses Wikipedia REST API.
- `.translate target-language | text` uses a public LibreTranslate-compatible endpoint; public service availability may vary.
- `.ai question` and `.ask question` use the OpenAI Responses API. Set `OPENAI_API_KEY` in your hosting environment. Optional `OPENAI_MODEL` defaults to `gpt-4.1-mini`. API usage may incur charges.
- `.news` intentionally explains setup: configure a news provider and API key before live headlines can be enabled.
- Downloading videos/music from third-party platforms is not enabled by default. It requires a compliant provider/API and may be restricted by the source platform.

## Railway environment variables
In Railway: Service > Variables, add `OPENAI_API_KEY` with your own API key. Optionally add `OPENAI_MODEL`. Never put API keys in public code or share them in chats.
