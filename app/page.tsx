import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import StoreHeader from "@/components/storefront/StoreHeader";
import GiftHero from "@/components/storefront/GiftHero";
import ProductGrid from "@/components/storefront/ProductGrid";
import ExperienceDemo from "@/components/storefront/ExperienceDemo";
import Footer from "@/components/Footer";
import { getSiteUrl, PLANNED_PRICING_DESCRIPTION } from "@/lib/storefront";
import styles from "@/components/storefront/storefront.module.css";

const siteUrl = getSiteUrl();
export const metadata: Metadata = {
  title: "QubitSells — Personalized digital gifts, made to be shared",
  description: "Make a thoughtful digital gift with illustrated stories, your own words and photos, and optional interactive surprises. Personalize a web experience and share it by link.",
  alternates: siteUrl ? { canonical: siteUrl } : undefined,
  openGraph: { title: "A little thought. A lasting feeling. — QubitSells", description: "Personalized digital gifts, made to be shared.", type: "website", ...(siteUrl ? { url: siteUrl, images: [{ url: `${siteUrl}/templates/halloween-pumpkin-moon/06-our-pumpkin-moon-date.png`, width: 1672, height: 941, alt: "Pumpkin Moon Date by QubitSells" }] } : {}) },
};

const questions = [
  ["What am I purchasing?", `You’re creating a personalized web experience: an illustrated story with your names, words, photos, and any supported interactions you choose. ${PLANNED_PRICING_DESCRIPTION} Choose your duration on the product page. Publishing requires a confirmed purchase; checkout availability and test mode are shown before payment. It is a shared webpage, rather than a downloadable video.`],
  ["Can I send it to a friend or family member?", "You don’t need a partner connection to make or receive a template. You can personalize the names and message for someone close to you. Our current illustrated collection is mainly romantic, so preview the artwork and story to make sure they suit your recipient."],
  ["Does the recipient need an account or need to pay?", "No account or payment is required to open a template’s share link or use its supported recipient interactions. Anyone with the link can open it, so send it only to the intended recipient. Private Couple Space and capsule features have separate sign-in and consent requirements."],
  ["How long does the shared page remain available?", "Choose an expiry in the editor before generating the link. The featured editors offer 24 hours, 3 days, 7 days, or 30 days. After expiry, the link stops working and the template, replies, and associated media are scheduled for deletion. This is not permanent hosting or an archive."],
  ["Can I edit or delete it?", "You can edit the design before generating its share link. The existing editors do not offer full editing of a published gift: create a new version if you need to change it. Keep your original browser or private creator management link to delete the original. Copies or screenshots kept by a recipient cannot be removed remotely."],
  ["Where can I get help or request a refund?", <>See our <Link href="/contact">help page</Link> for guidance and our <Link href="/refund-policy">refund policy</Link> for payment information. Orders appear in your personal profile. Test purchases are labelled and do not collect a real payment. The planned support address is support@qubitsells.com.</>],
];

export default function Home() {
  return <div className={styles.storefront}>
    <StoreHeader />
    <main id="main-content">
      <GiftHero />
      <ProductGrid />
      <section id="how-it-works" className={styles.howSection}>
        <div className={styles.container}>
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>From a thought to their inbox</p><h2>A personal gift,<br />without starting from scratch.</h2></div><p>You bring the meaning.<br />We give it somewhere to live.</p></div>
        <ol className={styles.steps}>
          <li><span>01</span><h3>Pick a design.</h3><p>Find a little world that feels like your person, and preview the story.</p></li>
          <li><span>02</span><h3>Make it unmistakably yours.</h3><p>Add your words, photos, and optional interactions. The small details make it personal.</p></li>
          <li><span>03</span><h3>Send a link. Make their day.</h3><p>After checkout, personalize and publish your page. Share its link and find responses in My creations.</p></li>
        </ol>
        <p className={styles.deliveryNote}>Your gift is a personalized web experience, ready to open in their browser.</p>
        </div>
      </section>
      <ExperienceDemo />
      <section className={`${styles.container} ${styles.coupleSection}`}>
        <div className={styles.coupleVisual}>
          <Image src="/couple-space-shared-memories.png" alt="A couple opening a cyan memory box with photos, a letter, and a voice note" fill sizes="(max-width: 760px) 100vw, 600px" className={styles.sharedMemoriesImage} />
          <span>Shared memories · illustration</span>
        </div>
        <div className={styles.coupleCopy}><p className={styles.eyebrow}>A space to keep coming back to</p><h2>For the two of you,<br />there’s Couple Space.</h2><p>Beyond a single gift, keep a private corner for your relationship — with shared milestones and memories to open another day.</p><ul><li>Plan a date with the Vibe Check generator.</li><li>Keep photos, letters, and voice notes in capsules.</li><li>Co-seal shared capsules with your partner’s consent.</li></ul><Link href="/couple-space" className={`${styles.button} ${styles.coupleExplore}`}><span>Explore Couple Space</span><span className={styles.coupleExploreIcon} aria-hidden="true"><ArrowUpRight size={19} /></span></Link><p className={styles.purchaseNote}>Separate from gifting. Private features require sign-in.</p></div>
      </section>
      <section className={`${styles.container} ${styles.faqSection}`}><div><p className={styles.eyebrow}>The little details</p><h2>Before you send.</h2><p>A few things to know<br />before making their day.</p></div><div className={styles.accordion}>{questions.map(([question, answer], index) => <details key={index}><summary>{question}<span aria-hidden="true">+</span></summary><div>{answer}</div></details>)}</div></section>
      <section className={styles.closing}><div className={`${styles.container} ${styles.closingInner}`}><div><h2>Have someone in mind?</h2><p>Find a design and make it theirs.</p></div><Link href="/templates" className={`${styles.button} ${styles.primary}`}>Browse templates <ArrowRight size={18} /></Link></div></section>
    </main>
    <Footer />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "WebSite", name: "QubitSells", description: "Personalized digital gifts, made to be shared.", ...(siteUrl ? { url: siteUrl } : {}) }).replace(/</g, "\\u003c") }} />
  </div>;
}
