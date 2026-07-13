import Link from "next/link";

import styles from "@/components/library/Library.module.css";

export default function TarotCardNotFound() {
  return (
    <main className={styles.page}>
      <div className={`${styles.frame} ${styles.notFoundFrame}`}>
        <section className={styles.notFound}>
          <p className={styles.notFoundLabel}>牌库档案不可用</p>
          <h1>没有找到这张牌</h1>
          <p>牌的编号不存在，或牌库资料尚未完成。</p>
          <div className={styles.notFoundActions}>
            <Link href="/library">返回牌库</Link>
            <Link href="/">返回首页</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
