import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";
import StoreHeader from "@/components/storefront/StoreHeader";
import Footer from "@/components/Footer";
import store from "@/components/storefront/storefront.module.css";
import styles from "./auth.module.css";

export default function AuthPage({ mode }: { mode: "login" | "signup" }) {
  return <div className={store.storefront}><StoreHeader /><main id="main-content" className={`${store.container} ${styles.authMain}`}><Suspense fallback={<div className={styles.authLoading} role="status">Loading account access…</div>}><AuthForm initialMode={mode} /></Suspense></main><Footer /></div>;
}
