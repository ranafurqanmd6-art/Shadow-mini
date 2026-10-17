import { reply, isOwner } from "../lib/command-utils.js";
import { features, setFeature } from "../lib/features.js";
export const command = { name:"antibadwords", category:"OWNER", description:"Toggle basic bad-word filtering in groups.", run: async (ctx) => {
 if(!isOwner(ctx)) return reply(ctx.sock,ctx.remote,ctx.msg,"⛔ Owner only.");
 const arg=(ctx.args[0]||"").toLowerCase();
 if(["on","off"].includes(arg)) setFeature("antibadwords",arg==="on");
 else setFeature("antibadwords",!features.antibadwords);
 return reply(ctx.sock,ctx.remote,ctx.msg,`🟢 *ANTIBADWORDS* ${features.antibadwords?"ENABLED":"DISABLED"}`);
} };
