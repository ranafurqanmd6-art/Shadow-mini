🤖 RANA MD — WhatsApp Multi-Device Bot

190+ working commands (Baileys, Node.js).

Setup

1. Node.js 18.17+ install karo
2. ".env.example" ko copy karke ".env" banao, apna number daalo:
   - "OWNER_NUMBER=923003719761" (country code ke saath, + ke bina)
   - "PAIRING_NUMBER=923003719761" (pairing code login; khali chhodo to QR aayega)
3. Terminal me:
   npm install
npm start
4. Pairing code terminal me aayega → WhatsApp > Linked Devices > Link with phone number > code daalo.
5. Kisi chat me ".menu" likho.

Notes

- Sticker (video) ke liye "ffmpeg" install hona chahiye.
- Group admin commands ke liye bot ko group admin banao.
- Restart ke liye pm2 use karo: "npm i -g pm2 && pm2 start index.js --name rana-md"
- Owner commands: .mode .setprefix .ban .unban .block .broadcast .setbio .join .restart ...
- Naya command: "commands/" ki kisi bhi file me "add('naam','desc', async (c)=>{ c.reply('hi') })" likho.

Categories

main, text, math, fun, info, group, owner, media — ".menu <category>" se detail dekho.