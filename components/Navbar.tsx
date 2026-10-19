"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Menu,
  X,
  ArrowRight,
  User as UserIcon,
  LogOut,
  Sparkles,
  ChevronDown,
  ShieldCheck,
  Flame,
} from "lucide-react";
import Link from "next/link";
import Brand from "@/components/storefront/Brand";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { user, loading, signOut, fullName, partnerNickname, isConnected } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openVibeCheck = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.location.pathname !== "/couple-space") {
      window.location.assign("/couple-space#vibe-check");
      return;
    }
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    window.dispatchEvent(new CustomEvent("open-vibe-check"));
  };

  const handleSignOut = async () => {
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    await signOut();
  };

  const navLinks = [
    { name: "Creator Center", href: "/creator-center" },
    { name: "Time Capsule", href: "/time-capsule" },
    { name: "Templates", href: "/templates" },
    { name: "Vibe Check", href: "/couple-space#vibe-check", onClick: openVibeCheck },
    { name: "Couple Space", href: "/couple-space" },
  ];

  const displayName = fullName || user?.email?.split("@")[0] || "Lover";
  const userInitial = displayName.charAt(0).toUpperCase();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300">
      <div className="max-w-4xl mx-auto px-4 pt-3 sm:pt-4">
        <motion.nav
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className={`relative flex items-center justify-between px-4 sm:px-5 py-2 rounded-full transition-all duration-300 ${
            scrolled
              ? "bg-white/95 backdrop-blur-2xl border border-rose-200 shadow-[0_10px_25px_-5px_rgba(244,63,94,0.12)]"
              : "bg-white/85 backdrop-blur-xl border border-rose-200/60 shadow-sm"
          }`}
        >
          {/* Minimalist Brand Logo */}
          <Brand id="nav-brand-logo" compact />

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-5">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={link.onClick}
                className="text-xs font-semibold text-[#4a182b] hover:text-rose-600 transition-colors relative py-1 group cursor-pointer"
              >
                <span>{link.name}</span>
                <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-rose-500 rounded-full transition-all duration-200 group-hover:w-full" />
              </a>
            ))}
          </div>

          {/* Dynamic Desktop Auth Actions */}
          <div className="hidden sm:flex items-center gap-2" ref={dropdownRef}>
            {loading ? (
              <div className="w-20 h-7 rounded-full bg-rose-100/60 animate-pulse" />
            ) : user ? (
              /* Authenticated User Profile Pill */
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className={`flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full border transition-all duration-200 shadow-2xs hover:shadow-xs cursor-pointer group ${
                    isConnected
                      ? "bg-gradient-to-r from-rose-100/90 to-pink-100/80 border-rose-300 text-[#3a1022]"
                      : "bg-gradient-to-r from-amber-50/90 to-rose-50/80 border-amber-200 text-[#451428]"
                  }`}
                >
                  <div className="relative">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center text-xs font-bold shadow-2xs group-hover:scale-105 transition-transform">
                      {userInitial}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${
                        isConnected ? "bg-emerald-500" : "bg-amber-400 animate-pulse"
                      }`}
                    />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold leading-tight truncate max-w-[100px]">
                      {isConnected && partnerNickname
                        ? `${displayName} & ${partnerNickname}`
                        : `${displayName} • Pair`}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-3 h-3 text-rose-500 transition-transform duration-200 ${
                      userDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Romantic User Dropdown Menu */}
                <AnimatePresence>
                  {userDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-64 p-3 rounded-2xl bg-white/95 backdrop-blur-2xl border border-rose-200 shadow-xl space-y-2 z-50 text-xs"
                    >
                      {/* User & Couple Status */}
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-50 to-pink-50/60 border border-rose-100 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#2d091a] truncate">
                            {displayName}
                          </span>
                          {isConnected ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80 shadow-2xs">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                              </span>
                              <span>Connected</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                              Unpaired
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#712743] truncate font-medium">
                          {user.email}
                        </p>
                        {isConnected && partnerNickname ? (
                          <div className="pt-1 border-t border-rose-200/50 flex items-center gap-1.5 text-[11px] font-semibold text-rose-800">
                            <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                            <span>Partner: {partnerNickname}</span>
                          </div>
                        ) : (
                          <div className="pt-1 border-t border-amber-200/50 flex items-center justify-between text-[11px] font-semibold text-amber-900">
                            <span>Not paired with partner</span>
                            <Link href="/profile" onClick={() => setUserDropdownOpen(false)} className="text-rose-600 font-bold underline">
                              Pair now
                            </Link>
                          </div>
                        )}
                      </div>

                      {/* Dropdown Actions */}
                      <div className="space-y-1 pt-1">
                        <Link
                          href="/creator-center"
                          onClick={() => setUserDropdownOpen(false)}
                          className="w-full px-3 py-2 rounded-xl text-left font-semibold text-[#3d1223] hover:bg-rose-50 hover:text-rose-600 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                          <span>Creator Center &amp; Replies</span>
                        </Link>

                        <Link
                          href="/profile"
                          onClick={() => setUserDropdownOpen(false)}
                          className="w-full px-3 py-2 rounded-xl text-left font-semibold text-[#3d1223] hover:bg-rose-50 hover:text-rose-600 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <UserIcon className="w-3.5 h-3.5 text-rose-500" />
                          <span>My Couple Space & Profile</span>
                        </Link>

                        <Link
                          href="/time-capsule"
                          onClick={() => setUserDropdownOpen(false)}
                          className="w-full px-3 py-2 rounded-xl text-left font-semibold text-[#3d1223] hover:bg-rose-50 hover:text-rose-600 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                          <span>Time Capsule Vault</span>
                        </Link>

                        <Link
                          href="/templates"
                          onClick={() => setUserDropdownOpen(false)}
                          className="w-full px-3 py-2 rounded-xl text-left font-semibold text-[#3d1223] hover:bg-rose-50 hover:text-rose-600 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                          <span>Couple Templates</span>
                        </Link>

                        <button
                          type="button"
                          onClick={openVibeCheck}
                          className="w-full px-3 py-2 rounded-xl text-left font-semibold text-[#3d1223] hover:bg-rose-50 hover:text-rose-600 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Flame className="w-3.5 h-3.5 text-rose-500" />
                          <span>Generate Tonight&#39;s Vibe</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="w-full px-3 py-2 rounded-xl text-left font-semibold text-rose-700 hover:bg-rose-100/70 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5 text-rose-600" />
                          <span>Sign Out of Sanctuary</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              /* Guest Actions */
              <>
                <Link
                  href="/login"
                  className="text-xs font-bold text-[#5c1c34] hover:text-rose-600 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                >
                  Sign In
                </Link>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    href="/signup"
                    className="btn-love-primary text-xs font-bold text-white px-4 py-1.5 rounded-full flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Join Free</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </motion.div>
              </>
            )}
          </div>

          {/* Mobile Menu Trigger */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-full text-rose-800 hover:bg-rose-50 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </motion.nav>
      </div>

      {/* Mobile Dropdown Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="md:hidden max-w-xs mx-auto mt-2 p-4 rounded-2xl bg-white/95 backdrop-blur-2xl border border-rose-200 shadow-xl space-y-2"
          >
            {/* Authenticated user banner in mobile menu */}
            {user && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/80 mb-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-bold">
                    {userInitial}
                  </div>
                  <span className="text-xs font-bold text-rose-950 truncate">
                    {displayName}
                  </span>
                </div>
                <p className="text-[10px] text-rose-700 truncate">{user.email}</p>
              </div>
            )}

            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={(e) => {
                    setMobileMenuOpen(false);
                    if (link.onClick) link.onClick(e);
                  }}
                  className="px-3 py-2 rounded-xl text-[#3d1223] hover:text-rose-600 hover:bg-rose-50 transition-all text-xs font-semibold"
                >
                  {link.name}
                </a>
              ))}
            </div>

            <div className="pt-2 border-t border-rose-100 flex flex-col gap-2">
              {user ? (
                <>
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2 rounded-xl bg-rose-50 text-rose-900 border border-rose-200 text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-rose-500" />
                    <span>My Couple Space & Profile</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full text-center py-2 rounded-xl bg-rose-100 text-rose-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-600" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2 rounded-xl bg-rose-50 text-rose-900 border border-rose-200 text-xs font-bold"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2 rounded-xl btn-love-primary text-white text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <span>Join Free as Couple</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
