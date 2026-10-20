"use client";

import {useRef, useState} from "react";
import {ArrowUpRight, Loader2} from "lucide-react";
import styles from "./commerce.module.css";

export default function ResumeOrderPayment({orderId, expired}: {orderId: string; expired: boolean}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const resume = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/checkout", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({order_id: orderId})});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Payment couldn’t be opened. Please try again.");
      window.location.assign(data.url);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Payment couldn’t be opened. Please try again.");
      pending.current = false; setBusy(false);
    }
  };
  return <div className={styles.resumePayment}>
    <button type="button" disabled={busy} aria-busy={busy} className={`${styles.button} ${styles.primary}`} onClick={() => void resume()}>
      {busy && <Loader2 size={14} className={styles.spinner} aria-hidden="true"/>}
      {busy ? "Opening checkout…" : expired ? "Retry payment" : "Complete payment"}
      {!busy && <ArrowUpRight size={14} aria-hidden="true"/>}
    </button>
    <span>Continue this order · Same template and price</span>
    {error && <p className={styles.error} role="alert">{error}</p>}
  </div>;
}
