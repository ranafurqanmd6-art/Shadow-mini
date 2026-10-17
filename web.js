import express from "express";
import fs from "node:fs";
import path from "node:path";
import pino from "pino";
import makeWASocket,{useMultiFileAuthState,fetchLatestBaileysVersion,makeCacheableSignalKeyStore,Browsers} from "@whiskeysockets/baileys";
import {config} from "./config.js";
const app=express(), PORT=process.env.PORT||3000;
const ROOT=path.dirname(config.authDir), MAIN=config.authDir;
const active=new Map(), last=new Map(), logger=pino({level:"silent"});
app.get("/health",(_,res)=>res.status(200).send("OK"));
app.get("/",(_,res)=>res.type("html").send(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>SHADOW MD Pairing</title><style>*{box-sizing:border-box}body{margin:0;background:#030806;color:#eafff1;font-family:Arial;display:grid;min-height:100vh;place-items:center}.card{width:min(92vw,480px);padding:28px;border:1px solid #00e676;border-radius:24px;background:#07130d;box-shadow:0 0 35px #00e67622}h1{color:#00ff7f;text-align:center}p{color:#a8cbb6}input,button{width:100%;padding:14px;margin:8px 0;border-radius:12px;font-size:16px}input{background:#030806;border:1px solid #16864a;color:white}button{background:#00e676;border:0;font-weight:bold;color:#001b0c}#out{font-size:24px;text-align:center;letter-spacing:3px;color:#00ff7f;word-break:break-word}</style></head><body><main class="card"><h1>SHADOW MD</h1><p>Enter your WhatsApp number with country code, without +.</p><input id="number" inputmode="numeric" placeholder="923001234567"><button onclick="pair()">GENERATE PAIR CODE</button><div id="out"></div><p>WhatsApp → Linked devices → Link with phone number instead.</p><script>async function pair(){let n=document.querySelector('#number').value.replace(/\\D/g,'');let o=document.querySelector('#out');o.textContent='Generating…';try{let r=await fetch('/pair?number='+encodeURIComponent(n));let t=await r.text();o.textContent=r.ok?t:'Error: '+t}catch(e){o.textContent='Request failed. Try again.'}}</script></main></body></html>`));
app.get("/pair",async(req,res)=>{
 const num=String(req.query.number||"").replace(/\D/g,"");
 if(num.length<10||num.length>15)return res.status(400).send("Enter a valid international phone number.");
 if(Date.now()-(last.get(num)||0)<15000)return res.status(429).send("Wait 15 seconds before retrying.");
 last.set(num,Date.now());
 const dir=path.join(ROOT,`pair-${num}`); try{fs.rmSync(dir,{recursive:true,force:true});}catch{}
 fs.mkdirSync(dir,{recursive:true});
 let s, closed=false;
 try{
  const {state,saveCreds}=await useMultiFileAuthState(dir);
  const {version}=await fetchLatestBaileysVersion();
  s=makeWASocket({version,auth:{creds:state.creds,keys:makeCacheableSignalKeyStore(state.keys,logger)},logger,browser:Browsers.windows("Chrome"),printQRInTerminal:false,syncFullHistory:false,markOnlineOnConnect:false});
  s.ev.on("creds.update",saveCreds);
  s.ev.on("connection.update",async u=>{
   if(u.connection==="open"&&!closed){
    closed=true; try{fs.rmSync(MAIN,{recursive:true,force:true});fs.mkdirSync(path.dirname(MAIN),{recursive:true});fs.cpSync(dir,MAIN,{recursive:true});console.log("Pairing session saved.");}catch(e){console.error("Session save failed:",e.message)}
    setTimeout(()=>{try{s.end()}catch{}; process.exit(1);},2500);
   }
  });
  await new Promise(r=>setTimeout(r,1800));
  const code=await s.requestPairingCode(num);
  res.type("text").send(String(code).match(/.{1,4}/g)?.join("-")||String(code));
 }catch(e){try{s?.end()}catch{};console.error("Pair code error:",e);res.status(500).send("Pairing failed. Check logs and Baileys compatibility.");}
});
app.listen(PORT,()=>console.log(`SHADOW MD pairing page listening on ${PORT}`));
