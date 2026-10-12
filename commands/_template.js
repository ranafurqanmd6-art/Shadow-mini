'use strict';
/**
 * COMMAND PLUGIN TEMPLATE
 *
 * Files starting with "_" are NOT loaded. To create a real command:
 *   1. Copy this file to e.g. commands/ban.js (keep it directly in the commands folder)
 *   2. Change the fields below
 *   3. Restart the bot - it is registered and added to the menu automatically
 *
 * A file can export one plugin object, or an array of plugin objects.
 */
module.exports = {
  name: 'example',            // command word (letters, numbers, - or _)
  aliases: [],                // optional extra names
  category: 'TOOLS',          // AI | ANIME | AUDIO | DOWNLOAD | FUN | GROUP | LOGO | MAIN | OTHER | OWNER | SEARCH | SETTINGS | SOUND | TOOLS | UTILITY
  desc: 'Short description shown in the menu',
  usage: '{prefix}example <text>',   // {prefix} is replaced automatically

  ownerOnly: false,           // only the bot owner / linked account
  groupOnly: false,           // only in groups
  privateOnly: false,         // only in private chats
  adminOnly: false,           // only group admins (owner always allowed)
  superOwnerOnly: false,      // only the real owner (not sudo users)
  cooldown: 0,                // seconds between uses per user
  botAdmin: false,            // bot must be admin in the group

  /**
   * ctx: { sock, msg, from, sender, senderNumber, isGroup, isOwner, isAdmin,
   *        isBotAdmin, groupMetadata, args, text, command, prefix, config,
   *        registry, session, reply(textOrPayload), react(emoji) }
   */
  async run(ctx) {
    await ctx.reply('Hello from the template!');
  },
};
