import fs from "node:fs";
import path from "node:path";
const file=process.env.FEATURES_FILE || "/app/data/features.json";
const defaults={autoreacts:false,autostatus:false,autotyping:false,autovoice:false,anticall:false,antidelete:false,antibadwords:false,antistatus:false};
function read(){try{return {...defaults,...JSON.parse(fs.readFileSync(file,"utf8"))}}catch{return {...defaults}}}
export const features=read();
export function setFeature(name,value){features[name]=value; try{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(features,null,2))}catch(e){console.error("Feature save failed:",e.message)}}
