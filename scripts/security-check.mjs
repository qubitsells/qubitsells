import fs from "node:fs";
import path from "node:path";
const failures=[];
function walk(directory) {
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})) {
    const filename=path.join(directory,entry.name);
    if(entry.isDirectory())walk(filename);
    else if(/\.(ts|tsx|js|mjs|sql)$/.test(entry.name)) {
      const source=fs.readFileSync(filename,"utf8");
      if(/process\.env\.[A-Z0-9_]*(?:SECRET|PASSWORD|SERVICE_ROLE_KEY|API_KEY|SALT)\s*\|\|\s*["'`][^"'`]+/.test(source))failures.push(filename+": hardcoded credential fallback");
      if(/NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|PASSWORD|SERVICE_ROLE|PRIVATE_KEY)/.test(source))failures.push(filename+": server secret marked public");
      if(/\b(?:apiSecret|api_secret|serviceRoleKey|password)\s*[:=]\s*["'][a-zA-Z0-9_/-]{16,}["']/.test(source))failures.push(filename+": possible literal secret");
      if(directory.startsWith("app") || directory.startsWith("components")) {
        if(/cjdropshipping|\/api\/dropshipping|href=["']\/boutique/.test(source))failures.push(filename+": removed boutique reference");
      }
    }
  }
}
for(const directory of ["app","components","context","lib","supabase"])walk(directory);
for(const file of ["middleware.ts","proxy.ts","next.config.ts"])if(fs.existsSync(file)) {
  const source=fs.readFileSync(file,"utf8");if(/(?:SECRET|PASSWORD|SERVICE_ROLE_KEY)\s*\|\|\s*["']/.test(source))failures.push(file+": secret fallback");
}
if(failures.length){console.error(failures.join("\n"));process.exitCode=1;}else console.log("Source security scan passed: no literal credential fallbacks, public server secrets, or active boutique references detected.");
