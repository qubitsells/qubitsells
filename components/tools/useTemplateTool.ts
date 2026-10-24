"use client";
import { useCallback, useEffect, useRef, useState } from "react";

function endpoint(code: string, tool: string, manage?: string | null) {
  const params = new URLSearchParams();
  const token = manage || new URLSearchParams(window.location.search).get("manage");
  if (token && /^[a-f0-9]{64}$/.test(token)) params.set("manage", token);
  return `/api/templates/${encodeURIComponent(code)}/${tool}${params.size ? `?${params}` : ""}`;
}

export function useTemplateTool<T>(code: string, tool: string, manage?: string | null, watch = false) {
  const [data, setData] = useState<T | null>(null), [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const mounted = useRef(false), request = useRef<AbortController | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve()), pending = useRef(0);
  const reload = useCallback(async () => {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    try {
      const response = await fetch(endpoint(code, tool, manage), { cache: "no-store", signal: controller.signal });
      const value = await response.json();
      if (!response.ok || !value.success) throw Error(value.error || "Could not load this activity.");
      if (mounted.current && !controller.signal.aborted) setData(value);
    } catch (reason) { if (mounted.current && !controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not load this activity."); }
    finally { if (mounted.current && !controller.signal.aborted) setLoading(false); }
  }, [code, tool, manage]);
  useEffect(() => {
    mounted.current = true;
    // Loading synchronizes with an external API; updates follow its response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
    const refresh = () => { if (document.visibilityState === "visible" && !pending.current) void reload(); };
    const timer = watch ? setInterval(refresh, 15000) : null;
    if (watch) window.addEventListener("focus", refresh);
    return () => { mounted.current = false; request.current?.abort(); if (timer) clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [reload, watch]);
  const write = useCallback((body: unknown, method = "POST", refresh = true) => {
    pending.current++; setBusy(true); setError("");
    const operation = queue.current.then(async () => {
      if (!mounted.current) return null;
      try {
        const response = await fetch(endpoint(code, tool, manage), { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const value = await response.json();
        if (!response.ok || !value.success) throw Error(value.error || "Your changes could not be saved. Try again.");
        if (mounted.current && refresh) await reload();
        return value;
      } catch (reason) { if (mounted.current) setError(reason instanceof Error ? reason.message : "Your changes could not be saved."); return null; }
      finally { pending.current--; if (mounted.current && !pending.current) setBusy(false); }
    });
    queue.current = operation; return operation;
  }, [code, tool, manage, reload]);
  return { data, loading, busy, error, write, reload, clearError: () => setError("") };
}

export function useActivityDraft<T>(answers: T, save: (answers: T) => Promise<unknown>) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null), active = useRef(true), dirty = useRef(false);
  const saveRef = useRef(save), answersRef = useRef(answers);
  const [status, setStatus] = useState("");
  useEffect(() => { saveRef.current = save; answersRef.current = answers; });
  useEffect(() => { active.current = true; return () => { active.current = false; if (timer.current) clearTimeout(timer.current); }; }, []);
  const cancel = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; dirty.current = false; };
  const persist = async () => { cancel(); setStatus("Saving draft…"); const result = await saveRef.current(answersRef.current); if (active.current) setStatus(result ? "Draft saved privately." : "Draft not saved. Try again."); };
  useEffect(() => {
    if (!dirty.current) return;
    timer.current = setTimeout(() => { void persist(); }, 1000);
    return () => { if (timer.current) clearTimeout(timer.current); };
    // Saving follows answer changes; the current save callback lives in a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers]);
  return { status, changed: () => { dirty.current = true; setStatus("Unsaved changes"); }, save: persist, cancel };
}
