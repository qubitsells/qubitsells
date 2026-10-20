import type {Metadata} from "next";
import SharedCalendar from "@/components/calendar/SharedCalendar";
import {calendarMonthSchema} from "@/lib/calendar";
import {z} from "zod";
export const metadata:Metadata={title:"Shared calendar — QubitSells",description:"Plan dates, outings, and time together in your private connected Couple Space.",robots:{index:false,follow:false}};
export default async function Page({searchParams}: {searchParams:Promise<{event?:string;month?:string}>}){const query=await searchParams,month=calendarMonthSchema.safeParse(query.month),event=z.uuid().safeParse(query.event);return <SharedCalendar initialMonth={month.success?month.data:undefined} initialEvent={event.success?event.data:undefined}/>;}
