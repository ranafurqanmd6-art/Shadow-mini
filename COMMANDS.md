# Implemented commands

Generated from the registry: **69** commands (prefix `.` by default).

Commands marked *needs key* only appear in the menu when the API key is set.

## AI MENU

| Command | Aliases | Who | What it does |
|---|---|---|---|
| `.ai` *(needs key)* | - | everyone | Ask the default configured AI provider |
| `.deepseek` *(needs key)* | - | everyone | Ask DeepSeek (needs DEEPSEEK_API_KEY) |
| `.gemini` *(needs key)* | - | everyone | Ask Google Gemini (needs GEMINI_API_KEY) |
| `.gpt` *(needs key)* | - | everyone | Ask OpenAI (needs OPENAI_API_KEY) |

## ANIME MENU

| Command | Aliases | Who | What it does |
|---|---|---|---|
| `.neko` | - | everyone | Random neko picture (api.waifu.pics, SFW) |
| `.waifu` | - | everyone | Random waifu picture (api.waifu.pics, SFW) |

## FUN MENU

| Command | Aliases | Who | What it does |
|---|---|---|---|
| `.8ball` | - | everyone | Ask the magic 8-ball |
| `.cat` | - | everyone | Random cat picture (thecatapi.com) |
| `.compliment` | - | everyone | Send a compliment |
| `.dog` | - | everyone | Random dog picture (dog.ceo) |
| `.fact` | - | everyone | Random fun fact |
| `.hug` | - | everyone | Hug someone (text) |
| `.joke` | - | everyone | Random clean joke |
| `.kiss` | - | everyone | Kiss someone (text) |
| `.quote` | - | everyone | Random motivational quote |
| `.roast` | - | everyone | A light-hearted roast |
| `.ship` | `.compatibility` | everyone | Love-compatibility percentage for two names/users |

## GROUP MENU

| Command | Aliases | Who | What it does |
|---|---|---|---|
| `.add` | - | everyone, groups, admins, bot admin | Add members by phone number |
| `.antilink` | - | everyone, groups, admins | Delete links sent by non-admins (bot must be admin) |
| `.del` | `.delete` | everyone, groups, admins, bot admin | Delete the message you reply to |
| `.demote` | - | everyone, groups, admins, bot admin | Remove admin rights from a member |
| `.gcsetting` | - | everyone, groups, admins | Show or change who can send messages / edit group info |
| `.gcstatus` | - | everyone, groups | Show the bot features enabled in this group |
| `.ginfo` | `.groupinfo` | everyone, groups | Show information about this group |
| `.goodbye` | - | everyone, groups, admins | Say goodbye when members leave |
| `.kick` | `.remove` | everyone, groups, admins, bot admin | Remove a member |
| `.link` | `.grouplink` | everyone, groups, admins, bot admin | Get the group invite link |
| `.mute` | `.close` | everyone, groups, admins, bot admin | Only admins can send messages |
| `.poll` | - | everyone | Create a poll |
| `.promote` | - | everyone, groups, admins, bot admin | Make a member admin |
| `.revoke` | - | everyone, groups, admins, bot admin | Reset the group invite link |
| `.tag` | - | everyone, groups, admins | Send a message that mentions everyone silently |
| `.tagall` | `.everyone` | everyone, groups, admins | Mention every member |
| `.unmute` | `.open` | everyone, groups, admins, bot admin | Everyone can send messages |
| `.welcome` | - | everyone, groups, admins | Greet new members |

## MAIN MENU

| Command | Aliases | Who | What it does |
|---|---|---|---|
| `.alive` | - | everyone | Check that the bot is online |
| `.menu` | `.help` | everyone | Show the command menu |
| `.owner` | - | everyone | Send the owner contact card |
| `.ping` | `.p` `.speed` `.server` `.stats` | everyone | 📡 Check bot latency & live server stats |
| `.ping2` | - | everyone | Measure the real send round-trip time |
| `.repo` | - | everyone | Show the bot source repository |
| `.uptime` | - | everyone | Show how long the bot has been running |

## OWNER MENU

| Command | Aliases | Who | What it does |
|---|---|---|---|
| `.block` | - | owner/sudo | Block a user |
| `.delsudo` | - | owner | Remove a sudo user |
| `.getbio` | - | owner/sudo | Get the About/bio text of a user |
| `.listsudo` | - | owner/sudo | List sudo users |
| `.privacy` | - | owner/sudo | Show this account's WhatsApp privacy settings |
| `.setname` | - | owner | Change the WhatsApp profile name of the bot account |
| `.sudo` | - | owner | Give a user owner-level command access |
| `.unblock` | - | owner/sudo | Unblock a user |
| `.updatebio` | - | owner | Change the WhatsApp About/bio of the bot account |

## SEARCH MENU

| Command | Aliases | Who | What it does |
|---|---|---|---|
| `.define` | `.dictionary` | everyone | English dictionary definition (dictionaryapi.dev) |

## SETTINGS MENU

| Command | Aliases | Who | What it does |
|---|---|---|---|
| `.anticall` | - | owner/sudo | Automatically reject incoming calls |
| `.autoreact` | - | owner/sudo | React to command messages with an emoji |
| `.autoread` | - | owner/sudo | Mark incoming messages as read |
| `.autotyping` | - | owner/sudo | Show "typing..." while a command runs |
| `.botname` | - | everyone | Show or change the bot name |
| `.mode` | - | owner | Public: everyone can use commands. Private: owner/sudo only |
| `.online` | - | owner/sudo | Keep the account shown as online |
| `.ownername` | - | everyone | Show or change the owner name |
| `.prefix` | - | everyone | Show or change the prefix |
| `.settings` | - | owner/sudo | Show all current bot settings |

## TOOLS MENU

| Command | Aliases | Who | What it does |
|---|---|---|---|
| `.fetch` | - | everyone | Fetch a web link (JSON, text, image, video, audio or file) |
| `.font` | - | everyone | Convert text to different Unicode font styles |
| `.getimage` | - | everyone | Download an image from a link and send it |
| `.getlid` | - | everyone | Show raw WhatsApp IDs (including @lid privacy IDs) of you, a target and the bot |
| `.getpp` | - | everyone | Get a profile photo |
| `.jid` | `.id` | everyone | Show the JID of this chat/user, or of a channel link |
| `.repeat` | - | everyone | Repeat a text 1-5 times |
