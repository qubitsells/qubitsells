import { withNotificationEmails } from "@/lib/server/notification-email";
import {NextResponse} from "next/server";
import {z} from "zod";
import {calendarDays,calendarEventSchema,calendarMonthSchema} from "@/lib/calendar";
import {adminClient,apiError,HttpError,jsonBody,rateLimit,requireSameOrigin,requireUser} from "@/lib/server/security";
import {createClient} from "@/lib/supabase/server";
import {calendarError,requireCalendarPair} from "@/lib/server/calendar";
import {privateHeaders} from "@/lib/server/commerce";

const fields="id,couple_id,creator_id,updated_by,title,category,status,starts_on,ends_on,all_day,start_time,end_time,time_zone,location,notes,version,created_at,updated_at,confirmation_status,requested_by,requested_at,responded_by,responded_at";
const normalize=(event:Record<string,unknown>)=>({...event,start_time:typeof event.start_time==="string"?event.start_time.slice(0,5):null,end_time:typeof event.end_time==="string"?event.end_time.slice(0,5):null});

export async function GET(request:Request){try{
  const user=await requireUser(),url=new URL(request.url);const couple=z.uuid().safeParse(url.searchParams.get("couple_id")),month=calendarMonthSchema.safeParse(url.searchParams.get("month"));
  if(!couple.success||!month.success)throw new HttpError(400,"Choose a valid calendar month.");
  const client=await createClient();await requireCalendarPair(client,couple.data,user.id);const days=calendarDays(month.data);
  const focus=z.uuid().safeParse(url.searchParams.get("event"));
  const [monthResult,requests,waiting,focused]=await Promise.all([
    client.from("couple_calendar_events").select(fields,{count:"exact"}).eq("couple_id",couple.data).lte("starts_on",days[41]).gte("ends_on",days[0]).order("starts_on").order("start_time").order("id").range(0,499),
    client.from("couple_calendar_events").select(fields,{count:"exact"}).eq("couple_id",couple.data).eq("status","planned").eq("confirmation_status","pending").neq("requested_by",user.id).order("starts_on").order("id").range(0,499),
    client.from("couple_calendar_events").select("id",{count:"exact",head:true}).eq("couple_id",couple.data).eq("status","planned").eq("confirmation_status","pending").eq("requested_by",user.id),
    focus.success?client.from("couple_calendar_events").select(fields).eq("couple_id",couple.data).eq("id",focus.data).maybeSingle():Promise.resolve({data:null,error:null}),
  ]);
  for(const result of [monthResult,requests,waiting,focused])calendarError(result.error);
  return NextResponse.json({events:(monthResult.data||[]).map(normalize),requests:(requests.data||[]).map(normalize),requestCount:requests.count||0,waitingCount:waiting.count||0,focused:focused.data?normalize(focused.data):null,truncated:(monthResult.count||0)>500},{headers:privateHeaders});
}catch(error){return apiError(error);}}

const mutation=z.object({couple_id:z.uuid(),event_id:z.uuid(),operation:z.enum(["create","update","delete","accept","decline"]),version:z.number().int().positive().nullable(),event:calendarEventSchema.optional()}).superRefine((value,ctx)=>{if((value.operation==="create"||value.operation==="update")&&!value.event)ctx.addIssue({code:"custom",message:"Add the plan details.",path:["event"]});if(value.operation!=="create"&&!value.version)ctx.addIssue({code:"custom",message:"Refresh this plan before changing it.",path:["version"]});});
async function handlePOST(request:Request){try{
  requireSameOrigin(request);const user=await requireUser();await rateLimit(request,"couple-calendar",100);
  const input=mutation.safeParse(await jsonBody(request,20000));if(!input.success)throw new HttpError(400,input.error.issues[0]?.message||"Check the plan details.");
  const client=await createClient();await requireCalendarPair(client,input.data.couple_id,user.id);
  const {data,error}=await adminClient().rpc("qubit_calendar_operation",{p_actor_id:user.id,p_couple_id:input.data.couple_id,p_operation:input.data.operation,p_event_id:input.data.event_id,p_expected_version:input.data.version,p_data:input.data.event||{}});calendarError(error);
  return NextResponse.json({success:true,event:data},{headers:privateHeaders});
}catch(error){return apiError(error);}}

export const POST = withNotificationEmails(handlePOST);
