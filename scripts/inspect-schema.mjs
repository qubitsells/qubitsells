import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url || !key)throw new Error("Supabase configuration is missing.");
try {
  const response=await fetch(url+"/rest/v1/",{headers:{apikey:key,Authorization:"Bearer "+key,Accept:"application/openapi+json"},signal:AbortSignal.timeout(15000)});
  if(!response.ok){console.log("Schema inspection unavailable; HTTP "+response.status);process.exitCode=1;}
  else {
    const data=await response.json();
    for(const table of ["couples","profiles","time_capsules","capsule_seal_requests","couple_templates"]) {
      const schema=data.definitions?.[table];
      console.log(JSON.stringify({table,columns:schema?Object.entries(schema.properties || {}).map(([name,column])=>({name,type:column.type,format:column.format,required:schema.required?.includes(name) || false})):null}));
    }
  }
} catch { console.log("Schema inspection could not connect. No secrets or user data were printed.");process.exitCode=1; }
