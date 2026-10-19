import fs from "node:fs";
import { randomBytes } from "node:crypto";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const path=".env.local";
let content=fs.existsSync(path)?fs.readFileSync(path,"utf8"):"";
const needed={CAPSULE_ENCRYPTION_KEY:32,IP_HASH_SALT:32,CRON_SECRET:32};
const isPlaceholder=value=>/^(your-|replace-|change[-_]?me(?:\b|[-_]))/i.test(value || "");
for(const [name,bytes] of Object.entries(needed)) {
  const line=content.split(/\r?\n/).find(line=>line.startsWith(name+"="));
  const current=process.env[name]?.trim();
  const valid=name==="CAPSULE_ENCRYPTION_KEY"?/^[a-f0-9]{64}$/i.test(current || ""):(current?.length || 0)>=32;
  if(valid && !isPlaceholder(current))continue;
  if(name === "CAPSULE_ENCRYPTION_KEY" && current && !isPlaceholder(current)) {
    throw new Error("An existing encryption key is invalid. Restore its original value from your secure backup; this script will not overwrite it.");
  }
  const replacement=name+"="+randomBytes(bytes).toString("hex");
  content=line?content.replace(line,replacement):content.trimEnd()+"\n"+replacement+"\n";
}
// Removed integrations no longer need credentials in the local configuration.
content=content.split(/\r?\n/).filter(line=>!(/^(CJ_API_KEY|SPOTIFY_CLIENT_ID|SPOTIFY_CLIENT_SECRET|SPOTIFY_REDIRECT_URI)=/.test(line))).join("\n");
fs.writeFileSync(path,content);
console.log("Security secrets configured in .env.local. Values were not printed. Back up the capsule encryption key securely before deployment.");
