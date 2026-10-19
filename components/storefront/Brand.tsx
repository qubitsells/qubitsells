import Link from "next/link";
import Image from "next/image";
import styles from "./storefront.module.css";

export default function Brand({ id, compact = false, variant = "header" }: { id?: string; compact?: boolean; variant?: "header" | "footer" }) {
  const footer = variant === "footer";
  return <Link id={id} href="/" className={`${styles.brand} ${compact ? styles.brandCompact : ""}`} aria-label="QubitSells home">
    <Image src={footer ? "/logo/white.png" : "/logo/bonded-logo-cyan.png"} alt="" width={footer ? 940 : 1291} height={footer ? 887 : 1218} sizes={footer ? "80px" : compact ? "30px" : "64px"} className={styles.brandLogo} />
  </Link>;
}
