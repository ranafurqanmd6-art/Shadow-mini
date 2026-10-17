import { reply, isOwner } from "../lib/command-utils.js";
import { features, setFeature } from "../lib/features.js";
export const command = { name:"autoreacts", category:"OWNER", description:"Toggle automatic reactions to incoming messages.", run: async (ctx) => {
 if(!isOwner(ctx)) return reply(ctx.sock,ctx.remote,ctx.msg,"⛔ Owner only.");
 const arg=(ctx.args[0]||"").toLowerCase();
 if(["on","off"].includes(arg)) setFeature("autoreacts",arg==="on");
 else setFeature("autoreacts",!features.autoreacts);
 return reply(ctx.sock,ctx.remote,ctx.msg,`🟢 *AUTOREACTS* ${features.autoreacts?"ENABLED":"DISABLED"}`);
} };
