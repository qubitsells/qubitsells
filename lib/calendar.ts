import {z} from "zod";

export const CALENDAR_CATEGORIES=[{value:"date",label:"Date night"},{value:"outing",label:"Outing"},{value:"trip",label:"Trip"},{value:"celebration",label:"Celebration"},{value:"other",label:"Something else"}] as const;
export const CALENDAR_STATUSES=[{value:"planned",label:"Planned"},{value:"confirmed",label:"Confirmed"},{value:"completed",label:"Completed"},{value:"cancelled",label:"Cancelled"}] as const;
export const calendarDateSchema=z.string().regex(/^20\d{2}-\d{2}-\d{2}$|^2100-\d{2}-\d{2}$/).refine(value=>{const date=new Date(`${value}T12:00:00Z`);return !Number.isNaN(date.valueOf())&&date.toISOString().slice(0,10)===value;},"Choose a valid date between 2000 and 2100.");
const time=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const calendarEventSchema=z.object({
  title:z.string().trim().min(1).max(120),category:z.enum(["date","outing","trip","celebration","other"]),status:z.enum(["planned","confirmed","completed","cancelled"]),
  starts_on:calendarDateSchema,ends_on:calendarDateSchema,all_day:z.boolean(),start_time:time.nullable(),end_time:time.nullable(),
  time_zone:z.string().min(1).max(100).refine(value=>{try{new Intl.DateTimeFormat("en",{timeZone:value});return true;}catch{return false;}},"Choose a valid time zone."),
  location:z.string().trim().max(240),notes:z.string().trim().max(4000),
}).superRefine((value,ctx)=>{
  if(value.ends_on<value.starts_on||Date.parse(value.ends_on)-Date.parse(value.starts_on)>366*86400000)ctx.addIssue({code:"custom",message:"Choose an end date within a year after the start date.",path:["ends_on"]});
  if(value.all_day&&(value.start_time!==null||value.end_time!==null))ctx.addIssue({code:"custom",message:"All-day plans do not need a time.",path:["start_time"]});
  if(!value.all_day&&(!value.start_time||!value.end_time||(value.starts_on===value.ends_on&&value.end_time<=value.start_time)))ctx.addIssue({code:"custom",message:"Choose an end time after the start time, or a later end date.",path:["end_time"]});
});
export type CalendarEventInput=z.infer<typeof calendarEventSchema>;
export type CalendarEvent=CalendarEventInput&{id:string;couple_id:string;creator_id:string;updated_by:string;version:number;created_at:string;updated_at:string;confirmation_status:"pending"|"accepted"|"declined";requested_by:string;requested_at:string;responded_by:string|null;responded_at:string|null};
export function isPendingRequest(event:CalendarEvent){return event.status==="planned"&&event.confirmation_status==="pending";}
export function confirmationLabel(event:CalendarEvent,userId:string){
  if(event.status==="cancelled")return "Cancelled";
  if(event.status==="completed")return "Completed";
  if(event.confirmation_status==="accepted")return "Confirmed together";
  if(event.confirmation_status==="declined")return "Request declined";
  return event.requested_by===userId?"Waiting for your partner":"Awaiting your response";
}
export const calendarMonthSchema=z.string().regex(/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/);
export function calendarDays(month:string){const [year,index]=month.split("-").map(Number),first=new Date(Date.UTC(year,index-1,1));first.setUTCDate(1-(first.getUTCDay()+6)%7);return Array.from({length:42},(_,offset)=>{const date=new Date(first);date.setUTCDate(first.getUTCDate()+offset);return date.toISOString().slice(0,10);});}
export function shiftMonth(month:string,amount:number){const [year,index]=month.split("-").map(Number);return new Date(Date.UTC(year,index-1+amount,1)).toISOString().slice(0,7);}
export function localDay(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;}
export function plansForDay(events:CalendarEvent[],day:string){return events.filter(event=>event.starts_on<=day&&event.ends_on>=day);}
export function calendarTime(event:CalendarEventInput){if(event.all_day)return "All day";const display=(value:string|null)=>{if(!value)return "";const [h,m]=value.split(":");return `${Number(h)%12||12}:${m} ${Number(h)<12?"AM":"PM"}`;};return `${display(event.start_time)} – ${display(event.end_time)}`;}
