import Link from "next/link";
import { ArrowUp, ArrowUpRight } from "lucide-react";
import Brand from "./storefront/Brand";
import { OPERATOR_NAME } from "@/lib/public-information";
import styles from "./storefront/storefront.module.css";

const groups = [
  { title: "Explore", links: [["Templates", "/templates"], ["Couple Space", "/couple-space"], ["About QubitSells", "/about"]] },
  { title: "Support & legal", links: [["Contact & help", "/contact"], ["Privacy policy", "/privacy"], ["Terms", "/terms"], ["Refund policy", "/refund-policy"]] },
];

export default function Footer() {
  return <footer className={styles.footer}>
    <div className={`${styles.container} ${styles.footerGrid}`}>
      <div className={styles.footerBrand}>
        <Brand variant="footer" />
        <p>Little worlds for the people<br />who mean the world to you.</p>
        <span>Personalized digital gifts, made to be shared.</span>
      </div>
      {groups.map(group => <nav key={group.title} aria-label={group.title}>
        <h2>{group.title}</h2>
        <ul>{group.links.map(([label, href]) => <li key={href}><Link href={href}><span>{label}</span><ArrowUpRight size={15} aria-hidden="true" /></Link></li>)}</ul>
      </nav>)}
    </div>
    <div className={`${styles.container} ${styles.footerBottom}`}>
      <small>© {new Date().getFullYear()} {OPERATOR_NAME}.</small>
      <span>Made with a little thought.</span>
      <a href="#" className={styles.footerTop}>Back to top <ArrowUp size={15} aria-hidden="true" /></a>
    </div>
  </footer>;
}
