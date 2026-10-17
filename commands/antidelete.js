import { reply, isOwner } from "../lib/command-utils.js";
import { features, setFeature } from "../lib/features.js";
export const command = { name:"antidelete", category:"OWNER", description:"Toggle deleted-message notices for messages observed while online.", run: async (ctx) => {
 if(!isOwner(ctx)) return reply(ctx.sock,ctx.remote,ctx.msg,"⛔ Owner only.");
 const arg=(ctx.args[0]||"").toLowerCase();
 if(["on","off"].includes(arg)) setFeature("antidelete",arg==="on");
 else setFeature("antidelete",!features.antidelete);
 return reply(ctx.sock,ctx.remote,ctx.msg,`🟢 *ANTIDELETE* ${features.antidelete?"ENABLED":"DISABLED"}`);
} };
