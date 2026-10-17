import { config } from "../config.js";
export async function reply(sock, remote, msg, text, extra={}) {
  return sock.sendMessage(remote, { text: String(text), ...extra }, { quoted: msg });
}
export function formatDuration(seconds) {
  seconds = Math.max(0, Math.floor(Number(seconds)||0));
  const d=Math.floor(seconds/86400), h=Math.floor(seconds%86400/3600), m=Math.floor(seconds%3600/60), s=seconds%60;
  return [d?`${d}d`:null,h?`${h}h`:null,m?`${m}m`:null,`${s}s`].filter(Boolean).join(" ");
}
export function formatDate(date=new Date()) { return date.toLocaleString("en-PK",{timeZone:"Asia/Karachi"}); }
export function jidNumber(jid="") { return String(jid).split("@")[0].replace(/\D/g,""); }
export function parseSimpleMath(s="") {
  const m=String(s).match(/^\s*(-?\d+(?:\.\d+)?)\s*([+\-*/%])\s*(-?\d+(?:\.\d+)?)\s*$/);
  if(!m) return null; const a=+m[1],b=+m[3]; if((m[2]==="/"||m[2]==="%")&&b===0) return "Cannot divide by zero";
  return ({"+":()=>a+b,"-":()=>a-b,"*":()=>a*b,"/":()=>a/b,"%":()=>a%b})[m[2]]();
}
export async function requireGroupAdmin(ctx) {
  if(!ctx.remote?.endsWith("@g.us")) throw new Error("This command works in groups only.");
  const md=await ctx.sock.groupMetadata(ctx.remote);
  const sender=ctx.msg.key.participant || ctx.msg.key.remoteJid;
  const p=md.participants.find(x=>x.id===sender || x.lid===sender);
  if(!p || !["admin","superadmin"].includes(p.admin)) throw new Error("Only group admins can use this command.");
}
export async function requireBotAdmin(ctx) {
  const md=await ctx.sock.groupMetadata(ctx.remote);
  const me=md.participants.find(x=>x.id===ctx.sock.user?.id || x.lid===ctx.sock.user?.id);
  if(!me || !["admin","superadmin"].includes(me.admin)) throw new Error("Make the bot a group admin first.");
}
export function getTargetJids(msg,args=[]) {
  const out=[];
  const mentions=msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid||[];
  out.push(...mentions);
  const quoted=msg?.message?.extendedTextMessage?.contextInfo?.participant;
  if(quoted) out.push(quoted);
  for(const a of args) { const n=String(a).replace(/\D/g,""); if(n.length>=7) out.push(n+"@s.whatsapp.net"); }
  return [...new Set(out)];
}
export function isOwner(ctx) {
  const sender=jidNumber(ctx.msg.key.participant || ctx.remote);
  return sender===config.ownerNumber;
}
