import styles from "@/components/PageLoading.module.css";

export default function Loading() {
  return <main className={styles.page} aria-busy="true" aria-label="Loading page">
    <p className={styles.label} role="status">Opening your next page…</p>
    <div className={styles.heading} aria-hidden="true" />
    <div className={styles.line} aria-hidden="true" />
    <div className={styles.cards} aria-hidden="true"><div/><div/><div/></div>
  </main>;
}
