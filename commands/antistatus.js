import { reply, isOwner } from "../lib/command-utils.js";
import { features, setFeature } from "../lib/features.js";
export const command = { name:"antistatus", category:"OWNER", description:"Toggle automatic status viewing.", run: async (ctx) => {
 if(!isOwner(ctx)) return reply(ctx.sock,ctx.remote,ctx.msg,"⛔ Owner only.");
 const arg=(ctx.args[0]||"").toLowerCase();
 if(["on","off"].includes(arg)) setFeature("antistatus",arg==="on");
 else setFeature("antistatus",!features.antistatus);
 return reply(ctx.sock,ctx.remote,ctx.msg,`🟢 *ANTISTATUS* ${features.antistatus?"ENABLED":"DISABLED"}`);
} };
