"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { type CoupleData, getExistingCouple, getOrCreateCouple, pairWithLoveCode, disconnectCouple } from "@/lib/supabase/couple";
import { clearCapsuleCache } from "@/lib/supabase/timeCapsules";

type Result = { success: boolean; message: string };
interface AuthContextType {
  user: User | null; session: Session | null; loading: boolean;
  couple: CoupleData | null; coupleLoading: boolean; coupleError: string | null;
  isConnected: boolean; coupleCode: string; partnerName: string | null; fullName: string | null; partnerNickname: string | null;
  signOut: () => Promise<void>;
  refreshCouple: () => Promise<void>;
  createCoupleSpace: () => Promise<Result>;
  pairWithCode: (code: string) => Promise<Result>;
  disconnect: () => Promise<Result>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null, session: null, loading: true, couple: null, coupleLoading: true, coupleError: null,
  isConnected: false, coupleCode: "", partnerName: null, fullName: null, partnerNickname: null,
  signOut: async () => {}, refreshCouple: async () => {}, createCoupleSpace: async () => ({ success: false, message: "Please sign in." }),
  pairWithCode: async () => ({ success: false, message: "Please sign in." }), disconnect: async () => ({ success: false, message: "Please sign in." }),
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [couple, setCouple] = useState<CoupleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [coupleLoading, setCoupleLoading] = useState(true);
  const [coupleError, setCoupleError] = useState<string | null>(null);
  const currentUserId = useRef<string | null>(null);
  const supabase = createClient();

  const loadCoupleData = useCallback(async (account: User) => {
    try {
      const data = await getExistingCouple(supabase, account.id, account.user_metadata);
      if (currentUserId.current === account.id) { setCouple(data); setCoupleError(null); }
    } catch {
      if (currentUserId.current === account.id) setCoupleError("Your couple profile couldn’t be loaded. Please try again.");
    } finally {
      if (currentUserId.current === account.id) setCoupleLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    clearCapsuleCache();
    let authEventReceived = false;
    let cancelled = false;
    const acceptSession = (next: Session | null) => {
      if (cancelled) return;
      const nextId = next?.user.id || null;
      if (currentUserId.current !== nextId) { setCouple(null); setCoupleError(null); setCoupleLoading(Boolean(next)); clearCapsuleCache(); }
      currentUserId.current = nextId;
      setSession(next); setUser(next?.user || null); setLoading(false);
      if (!next) setCoupleLoading(false);
    };
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!authEventReceived) acceptSession(session);
    }).catch(() => { if (!authEventReceived) acceptSession(null); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      authEventReceived = true;
      acceptSession(next);
    });
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, [supabase]);

  // Signing in reads an existing relationship only. Creating one is an explicit
  // action on the separate couple profile, never a prerequisite for an account.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void getExistingCouple(supabase, user.id, user.user_metadata).then(data => {
      if (!cancelled && currentUserId.current === user.id) { setCouple(data); setCoupleError(null); }
    }).catch(() => {
      if (!cancelled && currentUserId.current === user.id) setCoupleError("Your couple profile couldn’t be loaded. Please try again.");
    }).finally(() => { if (!cancelled && currentUserId.current === user.id) setCoupleLoading(false); });
    return () => { cancelled = true; };
  }, [supabase, user]);

  useEffect(() => {
    if (!user || !couple?.id) return;
    const channel = supabase.channel(`couple-live-${couple.id}`).on("postgres_changes", {
      event: "*", schema: "public", table: "couples", filter: `id=eq.${couple.id}`,
    }, () => { clearCapsuleCache(); void loadCoupleData(user); }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [supabase, user, couple?.id, loadCoupleData]);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error("You couldn’t be signed out. Please try again.");
    currentUserId.current = null;
    clearCapsuleCache(); setUser(null); setSession(null); setCouple(null); setCoupleLoading(false); setCoupleError(null);
  };
  const refreshCouple = async () => { if (user) { setCoupleLoading(true); await loadCoupleData(user); } };
  const createCoupleSpace = async (): Promise<Result> => {
    if (!user) return { success: false, message: "Please sign in to create a Couple Space." };
    const account = user;
    setCoupleLoading(true);
    try {
      const data = await getOrCreateCouple(supabase, account.id, account.user_metadata);
      if (currentUserId.current !== account.id) return { success: false, message: "Your account changed. Please try again." };
      setCouple(data); setCoupleError(null);
      return { success: true, message: "Your Couple Space is ready. Invite your partner whenever you like." };
    } catch { return { success: false, message: "Your Couple Space couldn’t be created. Please try again." }; }
    finally { if (currentUserId.current === account.id) setCoupleLoading(false); }
  };
  const pairWithCode = async (code: string): Promise<Result> => {
    if (!user) return { success: false, message: "Please sign in to connect with your partner." };
    const account = user;
    try {
      const result = await pairWithLoveCode(supabase, account.id, code);
      if (result.success && currentUserId.current === account.id) await loadCoupleData(account);
      return result;
    } catch { return { success: false, message: "The invitation couldn’t be accepted. Please try again." }; }
  };
  const disconnect = async (): Promise<Result> => {
    if (!user) return { success: false, message: "Please sign in to disconnect." };
    const account = user;
    const result = await disconnectCouple(supabase);
    if (result.success && currentUserId.current === account.id) { clearCapsuleCache(); await loadCoupleData(account); }
    return result;
  };
  const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || null;
  const partnerNickname = couple?.partner_name || user?.user_metadata?.partner_nickname || null;
  return <AuthContext.Provider value={{ user, session, loading, couple, coupleLoading, coupleError,
    isConnected: Boolean(couple?.is_connected), coupleCode: couple?.couple_code || "", partnerName: partnerNickname,
    fullName, partnerNickname, signOut, refreshCouple, createCoupleSpace, pairWithCode, disconnect,
  }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
