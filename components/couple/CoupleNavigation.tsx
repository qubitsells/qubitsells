"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import styles from "./couple.module.css";

export const COUPLE_LINKS=[{label:"Overview",href:"/couple-space"},{label:"Couple Profile",href:"/couple-space/profile"},{label:"Shared Calendar",href:"/couple-space/calendar"},{label:"Shared Capsules",href:"/couple-space/time-capsules"},{label:"Vibe Generator",href:"/couple-space/date-ideas"}] as const;
export default function CoupleNavigation(){const pathname=usePathname();return <nav className={styles.navigation} aria-label="Couple Space navigation">{COUPLE_LINKS.map(item=><Link key={item.href} href={item.href} aria-current={pathname===item.href?"page":undefined}>{item.label}</Link>)}</nav>;}
