import {z} from "zod";
import {calendarEventSchema,type CalendarEventInput} from "./calendar";

export const VIBE_MOODS=[{value:"cozy",label:"Unwind",description:"A quiet moment together"},{value:"romantic",label:"Reconnect",description:"Give each other your attention"},{value:"adventure",label:"Explore",description:"Try something a little different"},{value:"playful",label:"Have fun",description:"Keep it light and playful"}] as const;
export const VIBE_SETTINGS=[{value:"home",label:"Stay in"},{value:"out",label:"Head out"}] as const;
export const VIBE_BUDGETS=[{value:"free",label:"No spend"},{value:"low",label:"Keep it low"},{value:"flexible",label:"Flexible"}] as const;
export const vibeOptionsSchema=z.object({mood:z.enum(["cozy","romantic","adventure","playful"]),setting:z.enum(["home","out"]),duration:z.union([z.literal(30),z.literal(60),z.literal(120)]),budget:z.enum(["free","low","flexible"])}).strict();
export type VibeOptions=z.infer<typeof vibeOptionsSchema>;
export type VibePlan={id:string;ideaKey:string;options:VibeOptions;title:string;description:string;steps:{label:string;description:string;start:number;end:number}[];bring:string[];conversation:string;budgetNote:string};

export function vibeCalendarInput(plan:VibePlan,day:string,time:string,timeZone:string):CalendarEventInput{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw Error("Choose a valid date and start time.");
  const finish=new Date(`${day}T${time}:00Z`);if(Number.isNaN(finish.valueOf()))throw Error("Choose a valid date.");finish.setUTCMinutes(finish.getUTCMinutes()+plan.options.duration);
  return calendarEventSchema.parse({title:plan.title,category:"date",status:"planned",starts_on:day,ends_on:finish.toISOString().slice(0,10),all_day:false,start_time:time,end_time:finish.toISOString().slice(11,16),time_zone:timeZone,location:plan.options.setting==="home"?"At home":"Choose a place together",notes:[plan.description,"",...plan.steps.map((step,index)=>`${index+1}. ${step.label} (${step.start}–${step.end} min)\n${step.description}`),"",`Bring: ${plan.bring.join(", ")}`,`A conversation to start: ${plan.conversation}`,`Budget: ${plan.budgetNote}`].join("\n")});
}
export function vibePlanText(plan:VibePlan){return [plan.title,`${plan.options.duration} minutes · ${plan.options.setting==="home"?"Stay in":"Head out"}`,plan.description,...plan.steps.map((step,index)=>`${index+1}. ${step.label} (${step.start}–${step.end} min)\n${step.description}`),`Bring: ${plan.bring.join(", ")}`,`A conversation to start: ${plan.conversation}`,plan.budgetNote].join("\n\n");}
