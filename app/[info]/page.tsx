import type { Metadata } from "next";
import { notFound } from "next/navigation";
import StoreHeader from "@/components/storefront/StoreHeader";
import Footer from "@/components/Footer";
import { PUBLIC_INFORMATION, SUPPORT_EMAIL } from "@/lib/public-information";
import { getSiteUrl } from "@/lib/storefront";
import styles from "@/components/storefront/storefront.module.css";

type InfoKey = keyof typeof PUBLIC_INFORMATION;
const isInfoKey = (key: string): key is InfoKey => Object.hasOwn(PUBLIC_INFORMATION, key);
export const dynamicParams = false;
export function generateStaticParams() { return Object.keys(PUBLIC_INFORMATION).map(info => ({ info })); }
export async function generateMetadata({ params }: { params: Promise<{ info: string }> }): Promise<Metadata> {
  const { info } = await params;
  if (!isInfoKey(info)) notFound();
  const page = PUBLIC_INFORMATION[info];
  const url = getSiteUrl();
  return { title: `${page.title} — QubitSells`, description: page.intro, alternates: url ? { canonical: `${url}/${info}` } : undefined };
}
export default async function InformationPage({ params }: { params: Promise<{ info: string }> }) {
  const { info } = await params;
  if (!isInfoKey(info)) notFound();
  const page = PUBLIC_INFORMATION[info];
  return <div className={styles.storefront}><StoreHeader /><main id="main-content" className={`${styles.container} ${styles.infoPage}`}><p className={styles.eyebrow}>QubitSells / {info.replaceAll("-", " ")}</p><h1>{page.title}</h1><p>{page.intro}</p>{page.sections.map(([heading, body]) => <section key={heading}><h2>{heading}</h2><p>{body}</p></section>)}{info === "contact" && <section><h2>Email our team</h2><p><a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p></section>}</main><Footer /></div>;
}
