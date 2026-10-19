"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Flame, Trophy, CalendarDays, Sparkles } from "lucide-react";

interface HeatmapDay {
  day: number;
  level: number;
  activity: string;
  date: string;
}

export default function HeatMapShowcase() {
  const [selectedDay, setSelectedDay] = useState<HeatmapDay>({
    day: 28,
    level: 4,
    activity: "Midnight rooftop date + answered 3 intimacy cards 🍷✨",
    date: "Aug 28",
  });

  const weeks = Array.from({ length: 14 }).map((_, wIdx) =>
    Array.from({ length: 7 }).map((_, dIdx) => {
      const dayNum = wIdx * 7 + dIdx + 1;
      const seed = Math.sin(dayNum * 12.9898) * 43758.5453;
      const rand = seed - Math.floor(seed);
      const level = rand > 0.75 ? 4 : rand > 0.45 ? 3 : rand > 0.2 ? 2 : rand > 0.08 ? 1 : 0;
      
      const activities = [
        "Quiet evening walk & coffee talk ☕",
        "Cooked homemade pasta by candlelight 🍝",
        "Spontaneous blind date adventure 🎲",
        "Added $50 to Paris Saving Jar ✈️",
        "Sealed audio letter in Time Capsule ⏳",
        "Midnight rooftop date + answered 3 intimacy cards 🍷✨",
      ];

      return {
        day: dayNum,
        level,
        activity: activities[dayNum % activities.length],
        date: `Week ${wIdx + 1}, Day ${dIdx + 1}`,
      };
    })
  );

  const getLevelColor = (lvl: number) => {
    switch (lvl) {
      case 4:
        return "bg-gradient-to-tr from-rose-500 to-pink-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]";
      case 3:
        return "bg-rose-400";
      case 2:
        return "bg-rose-300";
      case 1:
        return "bg-rose-200/80";
      default:
        return "bg-rose-100/40";
    }
  };

  return (
    <section id="heatmap" className="relative py-18 sm:py-24 overflow-hidden bg-[#fff5f7]">
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column */}
          <div className="lg:col-span-5 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#2a0818] tracking-tight">
              The <span className="font-script text-5xl sm:text-6xl text-gradient-script font-normal inline-block px-1.5 py-0.5">Love Heatmap</span>
            </h2>

            <p className="text-sm text-[#5a2037] leading-relaxed">
              Just like athletes track workouts, couples thrive when intentional romance is nurtured daily.
              Watch your year transform into a tapestry of shared date nights, sweet nudges, and milestone memories.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-4 rounded-2xl bg-white border border-rose-100 shadow-xs">
                <div className="text-2xl font-black text-gradient-rose">48 Days</div>
                <div className="text-xs font-semibold text-[#78304f] mt-0.5">Connection Streak 🔥</div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-rose-100 shadow-xs">
                <div className="text-2xl font-black text-gradient-rose">94.2%</div>
                <div className="text-xs font-semibold text-[#78304f] mt-0.5">Touchpoint Rate ✨</div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-100/60 border border-rose-200 text-xs text-[#350b1d] font-medium flex items-start gap-2.5">
              <Trophy className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Monthly Milestone Reached!</span>
                You and your partner completed 8 date nights and 18 deep questions this month.
              </div>
            </div>
          </div>

          {/* Right Column: Grid Card */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl p-6 sm:p-7 bg-white/95 backdrop-blur-xl border border-rose-200/90 shadow-[0_15px_40px_-10px_rgba(244,63,94,0.12)]">
              
              {/* Top Card Header */}
              <div className="flex items-center justify-between pb-4 border-b border-rose-100">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-rose-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#350b1d]">
                    2026 Couple Connection Grid
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-[#78304f] font-semibold">
                  <span>Less Love</span>
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-100/50" />
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-200" />
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-400" />
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                  <span>More Sparks</span>
                </div>
              </div>

              {/* The Matrix */}
              <div className="py-5 overflow-x-auto">
                <div className="flex gap-2 min-w-[480px]">
                  {weeks.map((week, wIdx) => (
                    <div key={wIdx} className="flex flex-col gap-2">
                      {week.map((item) => (
                        <motion.button
                          key={item.day}
                          onClick={() => setSelectedDay(item)}
                          whileHover={{ scale: 1.3 }}
                          whileTap={{ scale: 0.9 }}
                          className={`w-4 sm:w-5 h-4 sm:h-5 rounded-md transition-all cursor-pointer ${getLevelColor(
                            item.level
                          )} ${
                            selectedDay.day === item.day
                              ? "ring-2 ring-rose-600 ring-offset-2 ring-offset-white"
                              : ""
                          }`}
                          title={`Day ${item.day}: ${item.activity}`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected Day Tooltip */}
              <div className="pt-3.5 border-t border-rose-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">
                    {selectedDay.date} Activity Logged
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-[#2a0818] mt-0.5">
                    {selectedDay.activity}
                  </p>
                </div>

                <div className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200">
                  Level {selectedDay.level}/4 Sparks
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
