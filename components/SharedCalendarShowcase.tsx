"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Bell, Clock, Check, AlertCircle } from "lucide-react";

interface CalendarDate {
  id: string;
  day: string;
  month: string;
  title: string;
  countdown: string;
  time: string;
  partnerNote: string;
  reminderStatus: string;
}

const EVENTS: CalendarDate[] = [
  {
    id: "anniversary",
    day: "14",
    month: "SEP",
    title: "Our 3rd Official Anniversary 💍",
    countdown: "16 Days to Go",
    time: "All Day Special",
    partnerNote: "Secret reservation locked at 8 PM",
    reminderStatus: "Flower alert scheduled 2 days prior",
  },
  {
    id: "jazz-night",
    day: "04",
    month: "SEP",
    title: "Speakeasy Jazz & Candlelight Dinner 🍷",
    countdown: "This Friday",
    time: "8:30 PM",
    partnerNote: "Dress code: Velvet & Silk",
    reminderStatus: "Uber nudge 45m before",
  },
  {
    id: "weekend-cabin",
    day: "22",
    month: "SEP",
    title: "Mountain Pine Cabin Getaway 🌲",
    countdown: "In 24 Days",
    time: "Fri – Sun",
    partnerNote: "Time Capsule sealing planned for Saturday sunset",
    reminderStatus: "Packing playlist ready",
  },
];

export default function SharedCalendarShowcase() {
  const [selectedEvent, setSelectedEvent] = useState<CalendarDate>(EVENTS[0]);

  return (
    <section id="calendar" className="relative py-18 sm:py-24 overflow-hidden bg-[#fff6f8]">
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Explainer */}
          <div className="lg:col-span-5 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#2a0818] tracking-tight">
              A Sacred Space for <span className="font-script text-5xl sm:text-6xl text-gradient-script font-normal inline-block px-1.5 py-0.5">Your Dates</span>
            </h2>

            <p className="text-sm text-[#5a2037] leading-relaxed">
              Most shared calendars get polluted with chores, errands, and work clutter.
              QubitSells keeps your romance calendar completely separate — dedicated only to date nights,
              anniversaries, trips, and shared moments.
            </p>

            <div className="space-y-2.5 pt-2">
              <div className="p-3 rounded-xl bg-white border border-rose-100 shadow-xs flex items-center gap-2.5 text-xs text-[#2a0818] font-medium">
                <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span>Zero chore clutter — 100% focused on romantic connection</span>
              </div>

              <div className="p-3 rounded-xl bg-white border border-rose-100 shadow-xs flex items-center gap-2.5 text-xs text-[#2a0818] font-medium">
                <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
                  <Bell className="w-3.5 h-3.5" />
                </div>
                <span>Intelligent Push Notifications so you never forget anniversaries</span>
              </div>
            </div>
          </div>

          {/* Right Calendar View */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl p-6 sm:p-7 bg-white/95 backdrop-blur-xl border border-rose-200/90 shadow-[0_15px_40px_-10px_rgba(244,63,94,0.12)] space-y-3.5">
              
              <div className="flex items-center justify-between pb-3.5 border-b border-rose-100">
                <h3 className="text-sm font-bold text-[#2a0818] flex items-center gap-2">
                  <span>Upcoming Romantic Agenda</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold">
                    September 2026
                  </span>
                </h3>
                <span className="text-xs text-[#78304f] font-medium">Both partners synced</span>
              </div>

              {/* Event Cards */}
              <div className="space-y-2.5">
                {EVENTS.map((evt) => {
                  const isSelected = selectedEvent.id === evt.id;
                  return (
                    <motion.div
                      key={evt.id}
                      onClick={() => setSelectedEvent(evt)}
                      whileHover={{ scale: 1.01 }}
                      className={`p-3.5 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all border ${
                        isSelected
                          ? "bg-gradient-to-r from-rose-50 to-pink-50 border-rose-300 shadow-sm"
                          : "bg-white border-rose-100 hover:border-rose-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex flex-col items-center justify-center text-white shrink-0 shadow-xs">
                          <span className="text-[9px] font-bold uppercase tracking-wider leading-none">
                            {evt.month}
                          </span>
                          <span className="text-sm font-black leading-none mt-0.5">
                            {evt.day}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-[#2a0818]">
                            {evt.title}
                          </h4>
                          <p className="text-[11px] text-[#5a2037] mt-0.5 flex items-center gap-1.5 font-medium">
                            <Clock className="w-3 h-3 text-rose-500" />
                            <span>{evt.time}</span>
                            <span className="w-1 h-1 rounded-full bg-rose-300" />
                            <span className="italic">{evt.partnerNote}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-rose-700 block">
                          {evt.countdown}
                        </span>
                        <span className="text-[9px] text-rose-600 font-bold flex items-center gap-0.5 justify-end mt-0.5">
                          <Bell className="w-2.5 h-2.5" /> Armed
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Event Guard Alert Bar */}
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-[#350b1d]">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    Smart Event Guard: <strong>{selectedEvent.reminderStatus}</strong>
                  </span>
                </div>
                <span className="text-rose-600 font-bold cursor-pointer hover:underline">
                  Alerts →
                </span>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
