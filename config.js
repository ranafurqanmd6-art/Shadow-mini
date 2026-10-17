export const config = {
  botName: process.env.BOT_NAME || "SHADOW MD",
  ownerName: process.env.OWNER_NAME || "RANA FURQAN",
  ownerNumber: (process.env.OWNER_NUMBER || "923003719761").replace(/\D/g, ""),
  prefix: process.env.PREFIX || ".",
  mode: process.env.MODE || "public",
  version: "7.0.0 Beta",
  authDir: process.env.AUTH_DIR || "/app/data/shadow-auth"
};
