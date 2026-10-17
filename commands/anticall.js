import { reply, isOwner } from "../lib/command-utils.js";
import { features, setFeature } from "../lib/features.js";
export const command = { name:"anticall", category:"OWNER", description:"Toggle call rejection.", run: async (ctx) => {
 if(!isOwner(ctx)) return reply(ctx.sock,ctx.remote,ctx.msg,"⛔ Owner only.");
 const arg=(ctx.args[0]||"").toLowerCase();
 if(["on","off"].includes(arg)) setFeature("anticall",arg==="on");
 else setFeature("anticall",!features.anticall);
 return reply(ctx.sock,ctx.remote,ctx.msg,`🟢 *ANTICALL* ${features.anticall?"ENABLED":"DISABLED"}`);
} };
