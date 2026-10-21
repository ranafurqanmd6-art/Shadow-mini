
const config = require('../config');
const { jidNum } = require('../lib/utils');

module.exports = (add) => {
  const mkSticker = async (c, type) => {
    const m = await c.getMedia();
    if (!m || !['imageMessage', 'videoMessage', 'stickerMessage'].includes(m.type)) return c.reply('📸 Image/video bhejo ya uspe reply karo caption .sticker ke saath.');
    const { Sticker } = require('wa-sticker-formatter');
    const [pack, author] = c.text.includes('|') ? c.text.split('|').map((x) => x.trim()) : [config.botName, 'Bot'];
    const s = new Sticker(m.buffer, { pack: pack || config.botName, author: author || 'Bot', type, quality: 60 });
    await c.send(await s.toMessage());
  };

  add('sticker', 'Image/video ko sticker banao', (c) => mkSticker(c, 'crop'), { alias: ['s', 'stiker'] });
  add('stickerfull', 'Full size sticker', (c) => mkSticker(c, 'full'), { alias: ['sfull'] });
  add('take', 'Sticker ka pack naam badlo: .take pack|author', (c) => mkSticker(c, 'full'), { alias: ['steal'] });
  add('toimg', 'Sticker ko image banao', async (c) => {
    const m = await c.getMedia();
    if (!m || m.type !== 'stickerMessage') return c.reply('Kisi sticker ko reply karo.');
    const png = await require('sharp')(m.buffer).png().toBuffer();
    await c.send({ image: png, caption: '🖼️ Done' });
  }, { alias: ['toimage'] });
  add('vv', 'View-once media dobara bhejo', async (c) => {
    const m = await c.getMedia();
    if (!m) return c.reply('View-once message ko reply karo.');
    if (m.type === 'imageMessage') await c.send({ image: m.buffer, caption: '👁️ View once' });
    else if (m.type === 'videoMessage') await c.send({ video: m.buffer, caption: '👁️ View once' });
    else if (m.type === 'audioMessage') await c.send({ audio: m.buffer, mimetype: 'audio/mpeg' });
    else c.reply('Unsupported media.');
  }, { alias: ['readviewonce', 'rvo'] });
  add('pp', 'Profile photo (reply/mention)', async (c) => {
    const j = c.target || c.sender;
    const url = await c.sock.profilePictureUrl(j, 'image').catch(() => null);
    url ? c.send({ image: { url }, caption: `🖼️ @${jidNum(j)}`, mentions: [j] }) : c.reply('❌ Profile photo nahi mili/private hai.');
  }, { alias: ['getpp', 'dp'] });
  add('qr', 'QR code banao', async (c) => {
    if (!c.input) return c.reply('Use: .qr <text/link>');
    const png = await require('qrcode').toBuffer(c.input, { width: 512, margin: 2 });
    await c.send({ image: png, caption: '📱 QR Code' });
  }, { alias: ['qrcode'] });
  add('tts', 'Text to speech: .tts hi namaste', async (c) => {
    let lang = 'en', t = c.input;
    if (/^[a-z]{2}(-[A-Z]{2})?\s/.test(t)) { lang = t.split(' ')[0]; t = t.slice(lang.length + 1); }
    if (!t) return c.reply('Use: .tts <lang> <text> (e.g. .tts hi aap kaise ho)');
    const url = require('google-tts-api').getAudioUrl(t.slice(0, 200), { lang, slow: false, host: 'https://translate.google.com' });
    await c.send({ audio: { url }, mimetype: 'audio/mpeg', ptt: true });
  }, { alias: ['say2', 'speak'] });
  add('ss', 'Website screenshot', async (c) => {
    let u = c.args[0]; if (!u) return c.reply('Use: .ss https://example.com');
    if (!/^https?:\/\//.test(u)) u = 'https://' + u;
    await c.send({ image: { url: `https://image.thum.io/get/width/1200/crop/800/${u}` }, caption: `🌐 ${u}` });
  }, { alias: ['screenshot'] });
  add('getmedia', 'Media ki file info', async (c) => {
    const m = await c.getMedia();
    if (!m) return c.reply('Media ko reply karo.');
    c.reply(`📁 Type: ${m.type.replace('Message', '')}\n📦 Size: ${(m.buffer.length / 1024).toFixed(1)} KB\n🧾 Mime: ${m.mimetype}`);
  }, { alias: ['fileinfo'] });
  add('mp3', 'Video/voice ko audio banao', async (c) => {
    const m = await c.getMedia();
    if (!m || !['videoMessage', 'audioMessage'].includes(m.type)) return c.reply('Video/audio ko reply karo.');
    await c.send({ audio: m.buffer, mimetype: 'audio/mpeg' });
  }, { alias: ['toaudio'] });
  add('save', 'Media apne inbox me bhejo', async (c) => {
    const m = await c.getMedia();
    if (!m) return c.reply('Media ko reply karo.');
    const kind = { imageMessage: 'image', videoMessage: 'video', audioMessage: 'audio', stickerMessage: 'sticker', documentMessage: 'document' }[m.type];
    await c.sock.sendMessage(c.sender, { [kind]: m.buffer, mimetype: m.mimetype, fileName: 'file' });
    c.reply('✅ Inbox me bhej diya.');
  }, { alias: ['send'] });
};
