import type { Metadata } from "next";
import CapsuleWorkspace from "@/components/CapsuleWorkspace";
import StoreHeader from "@/components/storefront/StoreHeader";
import Footer from "@/components/Footer";
import store from "@/components/storefront/storefront.module.css";
import styles from "@/components/capsules/capsules.module.css";

export const metadata: Metadata = {
  title: "Time capsules — QubitSells",
  description: "Save letters, photos, voice notes, and memories in a personal time capsule or an optional shared capsule.",
  robots: {index: false, follow: false, noarchive: true},
};

export default function TimeCapsulePage() {
  return <div className={`${store.storefront} ${styles.page}`}><StoreHeader /><main id="main-content" className={`${store.container} ${styles.main}`}><CapsuleWorkspace /></main><Footer /></div>;
}
