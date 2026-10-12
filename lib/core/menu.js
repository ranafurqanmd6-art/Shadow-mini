'use strict';
/**
 * Core menu command (registered first, so plugins can never override it).
 * Sends the bot image with the menu as caption, forwarded from the channel.
 * Falls back to plain text if the image cannot be sent.
 */
const config = require('../../config');
const { buildMenu, buildCategoryMenu } = require('../menu');

module.exports = {
  name: 'menu',
  aliases: ['help'],
  category: 'MAIN',
  desc: 'Show the command menu',
  usage: '{prefix}menu [category]',
  async run(ctx) {
    const { sock, from, msg, registry, args, reply, settings } = ctx;
    const view = {
      botName: settings.get('botName'), ownerName: settings.get('ownerName'),
      prefix: settings.get('prefix'), mode: settings.get('mode'),
    };
    const text = args[0]
      ? buildCategoryMenu(config, registry, view, args.join(' ')) || `❌ Unknown category: ${args.join(' ')}\n\n${buildMenu(config, registry, view)}`
      : buildMenu(config, registry, view);

    const contextInfo = {
      forwardingScore: 1,
      isForwarded: true,
      forwardedNewsletterMessageInfo: { newsletterJid: config.channel.jid, newsletterName: config.channel.name, serverMessageId: -1 },
    };
    try {
      await sock.sendMessage(from, { image: { url: config.botImage }, caption: text, contextInfo }, { quoted: msg });
    } catch (e) {
      await reply(text);
    }
  },
};

