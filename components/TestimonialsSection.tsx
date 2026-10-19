"use client";

import { motion } from "framer-motion";
import { Star, Heart, Quote, CheckCircle2 } from "lucide-react";

interface Testimonial {
  id: string;
  couple: string;
  duration: string;
  location: string;
  avatarA: string;
  avatarB: string;
  quote: string;
  favoriteFeature: string;
  rating: number;
}

const TESTIMONIALS: Testimonial[] = [
  {
    id: "elena-julian",
    couple: "Elena & Julian",
    duration: "4 Years Together",
    location: "San Francisco, CA",
    avatarA: "E",
    avatarB: "J",
    quote:
      "The Vibe Check feature completely revolutionized our Friday nights. We used to spend 45 minutes debating where to go — now we just tap our mood and get an unforgettable date flow!",
    favoriteFeature: "Vibe Check & Mystery Dates",
    rating: 5,
  },
  {
    id: "maya-liam",
    couple: "Maya & Liam",
    duration: "Engaged · 6 Years",
    location: "London, UK",
    avatarA: "M",
    avatarB: "L",
    quote:
      "We sealed our pre-wedding vows in a 1-year Time Capsule. Unlocking it together on our anniversary brought us both to happy tears. It’s so much more romantic than generic note apps.",
    favoriteFeature: "Digital Time Capsule",
    rating: 5,
  },
  {
    id: "chloe-alex",
    couple: "Chloe & Alex",
    duration: "2 Years Together",
    location: "Austin, TX",
    avatarA: "C",
    avatarB: "A",
    quote:
      "Having a shared calendar that is ONLY for our dates and anniversaries keeps our relationship sacred. No work tasks, no grocery reminders — just us.",
    favoriteFeature: "Date-Only Shared Calendar",
    rating: 5,
  },
];

export default function TestimonialsSection() {
  return (
    <section id="stories" className="relative py-18 sm:py-24 overflow-hidden bg-[#fff8fa]">
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#2a0818] tracking-tight">
            Loved by Over <span className="font-script text-5xl sm:text-6xl md:text-7xl text-gradient-script font-normal inline-block px-1.5 py-0.5">85,000+ Couples</span>
          </h2>
          <p className="mt-2 text-sm sm:text-base text-[#64243d]">
            Real couples on how QubitSells brought spark, intention, and playful intimacy back to daily life.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {TESTIMONIALS.map((t, idx) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              className="rounded-3xl p-6 bg-white border border-rose-200/80 shadow-[0_10px_30px_-8px_rgba(244,63,94,0.08)] flex flex-col justify-between glass-card-hover"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex gap-1 text-rose-500">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                    ))}
                  </div>
                  <Quote className="w-5 h-5 text-rose-200" />
                </div>

                <p className="text-xs sm:text-sm text-[#3d1223] italic leading-relaxed mb-5 font-serif font-medium">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>

              <div className="pt-3.5 border-t border-rose-100">
                <div className="flex items-center gap-2.5">
                  <div className="flex -space-x-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-rose-500 to-pink-400 flex items-center justify-center text-[10px] font-bold text-white shadow-sm border border-white">
                      {t.avatarA}
                    </div>
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-rose-400 to-pink-400 flex items-center justify-center text-[10px] font-bold text-white shadow-sm border border-white">
                      {t.avatarB}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-[#2a0818] flex items-center gap-1">
                      <span>{t.couple}</span>
                      <CheckCircle2 className="w-3 h-3 text-rose-600" />
                    </h4>
                    <p className="text-[10px] text-[#78304f] font-medium">
                      {t.duration} · {t.location}
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 text-[9px] text-rose-700 font-bold px-2 py-0.5 rounded-full bg-rose-50 inline-block border border-rose-100">
                  Favorite: {t.favoriteFeature}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
