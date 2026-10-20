import type {ReactNode} from "react";
import Link from "next/link";
import {ArrowUpRight,HeartHandshake} from "lucide-react";
import StoreHeader from "@/components/storefront/StoreHeader";
import Footer from "@/components/Footer";
import CoupleNavigation from "./CoupleNavigation";
import store from "@/components/storefront/storefront.module.css";
import styles from "./couple.module.css";

export default function CoupleShell({children,title,description}: {children:ReactNode;title?:string;description?:string}){
  return <div className={store.storefront}><StoreHeader/><main id="main-content" className={`${store.container} ${styles.main}`}><div className={styles.spaceBar}><Link href="/couple-space" className={styles.spaceBrand}><HeartHandshake size={20} aria-hidden="true"/><span>Couple Space<small>A place for the two of you</small></span></Link><Link href="/profile" className={styles.accountSwitch}>Personal account<ArrowUpRight size={14} aria-hidden="true"/></Link></div><CoupleNavigation/>{title&&<header className={styles.pageHeading}><p className={styles.eyebrow}>Your Couple Space</p><h1>{title}</h1>{description&&<p>{description}</p>}</header>}<div className={styles.content}>{children}</div></main><Footer/></div>;
}
