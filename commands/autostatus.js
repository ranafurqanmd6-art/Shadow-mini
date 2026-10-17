import { reply, isOwner } from "../lib/command-utils.js";
import { features, setFeature } from "../lib/features.js";
export const command = { name:"autostatus", category:"OWNER", description:"Toggle status-view automation.", run: async (ctx) => {
 if(!isOwner(ctx)) return reply(ctx.sock,ctx.remote,ctx.msg,"⛔ Owner only.");
 const arg=(ctx.args[0]||"").toLowerCase();
 if(["on","off"].includes(arg)) setFeature("autostatus",arg==="on");
 else setFeature("autostatus",!features.autostatus);
 return reply(ctx.sock,ctx.remote,ctx.msg,`🟢 *AUTOSTATUS* ${features.autostatus?"ENABLED":"DISABLED"}`);
} };
