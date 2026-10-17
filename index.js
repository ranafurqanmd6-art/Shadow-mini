import fs from "node:fs";
import path from "node:path";
import pino from "pino";
import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, Browsers } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { config } from "./config.js";
import { commands } from "./plugins/index.js";
import { features } from "./lib/features.js";
import { reply, jidNumber } from "./lib/command-utils.js";
import { pairingEvents } from "./lib/pairing-events.js";
const logger=pino({level:process.env.LOG_LEVEL||"silent"});
const started=Date.now();
const seenMessages=new Map();
let sock;
let reconnectTimer;
let starting = false;
function unwrap(m){let x=m; for(const k of ["ephemeralMessage","viewOnceMessage","viewOnceMessageV2","documentWithCaptionMessage"]) if(x?.[k]?.message)x=x[k].message; return x||{};}
function textOf(msg){const m=unwrap(msg.message);return m.conversation||m.extendedTextMessage?.text||m.imageMessage?.caption||m.videoMessage?.caption||m.documentMessage?.caption||"";}
async function start(){
 if (starting) return;
 starting = true;
 fs.mkdirSync(config.authDir,{recursive:true});
 const {state,saveCreds}=await useMultiFileAuthState(config.authDir);
 const {version}=await fetchLatestBaileysVersion();
 sock=makeWASocket({version,auth:{creds:state.creds,keys:makeCacheableSignalKeyStore(state.keys,logger)},logger,browser:Browsers.windows("Chrome"),syncFullHistory:false,markOnlineOnConnect:false,generateHighQualityLinkPreview:false});
 starting = false;
 sock.ev.on("creds.update",saveCreds);
 sock.ev.on("connection.update",({connection,lastDisconnect})=>{
  if(connection==="open") console.log("🟢 SHADOW MD connected");
  if(connection==="close"){
   const code=new Boom(lastDisconnect?.error)?.output?.statusCode;
   console.log("Connection closed:",code||lastDisconnect?.error?.message||"unknown");
   if(code!==DisconnectReason.loggedOut) { clearTimeout(reconnectTimer); reconnectTimer=setTimeout(()=>{ starting=false; start().catch(e=>{starting=false;console.error("Reconnect failed:",e.message)}); },3000); }
   else console.error("Session logged out. Re-pair using the pairing page.");
  }
 });
 sock.ev.on("messages.upsert",async({messages,type})=>{
  if(type!=="notify")return;
  for(const msg of messages){
   if(!msg.message) continue;
   const remote=msg.key.remoteJid||"";
   const protocol=msg.message.protocolMessage;
   if(protocol && features.antidelete && protocol.key?.id) {
    const old=seenMessages.get(protocol.key.id);
    if(old) sock.sendMessage(old.remote,{text:`🗑️ *DELETED MESSAGE DETECTED*\\nFrom: ${jidNumber(old.key.participant||old.remote)}\\nMessage: ${old.body||"[non-text message]"}`}).catch(()=>{});
    continue;
   }
   if(msg.key.fromMe) continue;
   const body=textOf(msg).trim();
   if(features.autoreacts && !remote.endsWith("@status")) sock.sendMessage(remote,{react:{text:"🟢",key:msg.key}}).catch(()=>{});
   if(features.antibadwords && remote.endsWith("@g.us") && /\b(fuck|bitch|motherfucker)\b/i.test(body)){
    const md=await sock.groupMetadata(remote).catch(()=>null);
    const sender=msg.key.participant;
    if(md?.participants.some(p=>p.id===sock.user?.id&&["admin","superadmin"].includes(p.admin))) {
      sock.sendMessage(remote,{delete:msg.key}).catch(()=>{});
      sock.sendMessage(remote,{text:"⚠️ Inappropriate language is not allowed."},{quoted:msg}).catch(()=>{});
    }
   }
   if(features.antidelete) { seenMessages.set(msg.key.id,{remote,key:msg.key,body,at:Date.now()}); if(seenMessages.size>500)seenMessages.delete(seenMessages.keys().next().value); }
   if(features.autostatus && remote==="status@broadcast") sock.readMessages([msg.key]).catch(()=>{});
   if(features.antistatus && remote==="status@broadcast") sock.readMessages([msg.key]).catch(()=>{});
   if(!body.startsWith(config.prefix))continue;
   const parts=body.slice(config.prefix.length).trim().split(/\s+/), name=(parts.shift()||"").toLowerCase(), args=parts;
   const command=commands.get(name)||[...commands.values()].find(c=>c.aliases?.includes(name));
   if(!command)continue;
   const ctx={sock,remote,msg,args,commandName:name,body};
   try {
    if(features.autotyping) await sock.sendPresenceUpdate("composing",remote).catch(()=>{});
    if(command.group&&!remote.endsWith("@g.us")) { await reply(sock,remote,msg,"This command works in groups only."); continue; }
    await command.run(ctx);
   } catch(e){ console.error(`[${name}]`,e); await reply(sock,remote,msg,`❌ ${e.message||"Command failed."}`).catch(()=>{}); }
  }
 });
 sock.ev.on("call",async calls=>{
  if(!features.anticall)return;
  for(const c of calls) if(c.status==="offer") {
   await sock.rejectCall(c.id,c.from).catch(()=>{});
   await sock.sendMessage(c.from,{text:"🚫 Calls are disabled on this bot."}).catch(()=>{});
  }
 });
}
pairingEvents.on("session-saved", async () => {
 console.log("Pairing session saved; restarting WhatsApp socket to load new credentials...");
 try { sock?.end(undefined); } catch {}
 clearTimeout(reconnectTimer);
 setTimeout(() => { starting = false; start().catch(e => { starting = false; console.error("Post-pair reconnect failed:", e.message); }); }, 1200);
});
start().catch(e=>{console.error("Startup failed:",e);process.exitCode=1;});

import "./web.js";
