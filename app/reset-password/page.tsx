import type { Metadata } from "next";
import PasswordReset from "@/components/account/PasswordReset";
import StoreHeader from "@/components/storefront/StoreHeader";
import Footer from "@/components/Footer";
import styles from "@/components/storefront/storefront.module.css";

export const metadata: Metadata = { title: "Reset password — QubitSells", robots: { index: false, follow: false } };

export default function ResetPasswordPage() {
  return <div className={styles.storefront}><StoreHeader /><PasswordReset /><Footer /></div>;
}
