import { reply, isOwner } from "../lib/command-utils.js";
import { features, setFeature } from "../lib/features.js";
export const command = { name:"autotyping", category:"OWNER", description:"Toggle typing presence before replies.", run: async (ctx) => {
 if(!isOwner(ctx)) return reply(ctx.sock,ctx.remote,ctx.msg,"⛔ Owner only.");
 const arg=(ctx.args[0]||"").toLowerCase();
 if(["on","off"].includes(arg)) setFeature("autotyping",arg==="on");
 else setFeature("autotyping",!features.autotyping);
 return reply(ctx.sock,ctx.remote,ctx.msg,`🟢 *AUTOTYPING* ${features.autotyping?"ENABLED":"DISABLED"}`);
} };
