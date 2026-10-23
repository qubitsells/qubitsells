import fs from "node:fs";
import path from "node:path";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const names=["SUPABASE_SERVICE_ROLE_KEY","CLOUDINARY_API_KEY","CLOUDINARY_API_SECRET","CAPSULE_ENCRYPTION_KEY","IP_HASH_SALT","CRON_SECRET","STRIPE_SECRET_KEY","STRIPE_WEBHOOK_SECRET","SMTP_PASSWORD"];
const secrets=names.map(name=>({name,value:process.env[name]})).filter(item=>item.value && item.value.length>=12);
const findings=[];
function scan(directory) {
  for(const item of fs.readdirSync(directory,{withFileTypes:true})) {
    const filename=path.join(directory,item.name);
    if(item.isDirectory())scan(filename);
    else if(/\.(js|json|html)$/.test(item.name)) {
      const content=fs.readFileSync(filename,"utf8");
      for(const secret of secrets)if(content.includes(secret.value))findings.push({file:filename,variable:secret.name});
    }
  }
}
if(!fs.existsSync(".next/static"))throw new Error("Run a production build before checking client bundles.");
scan(".next/static");
if(findings.length){console.error(JSON.stringify(findings));process.exitCode=1;}else console.log("Built browser assets contain none of the configured server secrets. Values were not printed.");
