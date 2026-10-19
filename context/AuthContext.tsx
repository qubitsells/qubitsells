"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { User, Session, RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { CoupleData, getOrCreateCouple, pairWithLoveCode, disconnectCouple } from "@/lib/supabase/couple";
import confetti from "canvas-confetti";
import { clearCapsuleCache } from "@/lib/supabase/timeCapsules";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  couple: CoupleData | null;
  isConnected: boolean;
  coupleCode: string;
  partnerName: string | null;
  fullName: string | null;
  partnerNickname: string | null;
  signOut: () => Promise<void>;
  refreshCouple: () => Promise<void>;
  pairWithCode: (code: string) => Promise<{ success: boolean; message: string }>;
  disconnect: () => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  couple: null,
  isConnected: false,
  coupleCode: "",
  partnerName: null,
  fullName: null,
  partnerNickname: null,
  signOut: async () => {},
  refreshCouple: async () => {},
  pairWithCode: async () => ({ success: false, message: "" }),
  disconnect: async () => ({ success: false, message: "" }),
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [couple, setCouple] = useState<CoupleData | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const currentUserIdRef = useRef<string | null>(null);

  // Load couple data for current user
  const loadCoupleData = useCallback(
    async (currentUser: User) => {
      try {
        const data = await getOrCreateCouple(
          supabase,
          currentUser.id,
          currentUser.user_metadata
        );
        if (currentUserIdRef.current === currentUser.id) setCouple(data);
      } catch (err) {
        console.error("Shared space could not be loaded.");
      }
    },
    [supabase]
  );

  // 1. Initial auth session setup
  useEffect(() => {
    clearCapsuleCache();
    let authEventReceived = false;
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (authEventReceived) return;
        currentUserIdRef.current = session?.user.id || null;
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

      } catch (err) {
        console.error("Error retrieving Supabase session:", err);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // 2. Real-time auth state changes listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventReceived = true;
      currentUserIdRef.current = session?.user.id || null;
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (!currentUser) {
        setCouple(null);
        clearCapsuleCache();
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, loadCoupleData]);

  // Database work stays outside the auth event callback; ignore results after an account change.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getOrCreateCouple(supabase, user.id, user.user_metadata)
      .then(data => { if (!cancelled) setCouple(data); })
      .catch(() => { if (!cancelled) setCouple(null); });
    return () => { cancelled = true; };
  }, [supabase, user]);

  // 3. Real-time PostgreSQL Changes & Couple Live Pairing Listener
  useEffect(() => {
    if (!user || !couple?.id) return;

    let channel: RealtimeChannel;

    try {
      channel = supabase
        .channel(`couple-live-${couple.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "couples",
            filter: `id=eq.${couple.id}`,
          },
          (payload) => {
            if (payload.eventType === "DELETE") {
              clearCapsuleCache();
              setCouple(null);
              if (user) void loadCoupleData(user);
              return;
            }
            const updated = payload.new as Partial<CoupleData>;
            if (updated) {
              const isNowConnected =
                !!updated.partner_1_id && !!updated.partner_2_id;
              if (!isNowConnected) {
                clearCapsuleCache();
              }
              setCouple((prev) => ({
                ...(prev || ({} as CoupleData)),
                ...updated,
                is_connected: isNowConnected,
              }));
              void loadCoupleData(user);

              // If partner just joined live, celebrate with confetti!
              if (isNowConnected && !couple.is_connected) {
                try {
                  confetti({
                    particleCount: 100,
                    spread: 90,
                    origin: { y: 0.5 },
                    colors: ["#f43f5e", "#fda4af", "#be123c", "#fff"],
                  });
                } catch {}
              }
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.warn("Realtime subscription not active:", e);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, couple?.id, couple?.is_connected, supabase, loadCoupleData]);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      clearCapsuleCache();
      setUser(null);
      setSession(null);
      setCouple(null);
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  const refreshCouple = async () => {
    if (user) {
      await loadCoupleData(user);
    }
  };

  const pairWithCode = async (codeInput: string) => {
    if (!user) {
      return { success: false, message: "Please log in to pair." };
    }

    const result = await pairWithLoveCode(
      supabase,
      user.id,
      codeInput,
      user.user_metadata
    );

    if (result.success) {
      try {
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#f43f5e", "#fda4af", "#be123c", "#fff"],
        });
      } catch {}

      await loadCoupleData(user);
    }

    return result;
  };

  const disconnect = async () => {
    if (!user) {
      return { success: false, message: "Please log in to disconnect." };
    }

    const result = await disconnectCouple(supabase);
    if (result.success) {
      clearCapsuleCache();
      setCouple(null);
      await loadCoupleData(user);
    }

    return result;
  };

  const fullName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    null;

  const partnerNickname =
    couple?.partner_name ||
    user?.user_metadata?.partner_nickname ||
    null;

  const isConnected = !!couple?.is_connected;
  const coupleCode = couple?.couple_code || "";

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        couple,
        isConnected,
        coupleCode,
        partnerName: partnerNickname,
        fullName,
        partnerNickname,
        signOut,
        refreshCouple,
        pairWithCode,
        disconnect,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
