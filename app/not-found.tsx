import Link from "next/link";

import styles from "@/components/library/Library.module.css";

export default function GlobalNotFound() {
  return (
    <main className={styles.page}>
      <div className={`${styles.frame} ${styles.notFoundFrame}`}>
        <section className={styles.notFound}>
          <p className={styles.notFoundLabel}>页面或牌库档案不可用</p>
          <h1>没有找到这张牌</h1>
          <p>牌的编号不存在，或牌库资料尚未完成。</p>
          <p>如果你访问的不是牌库地址，这个页面也可能已移动或不存在。</p>
          <div className={styles.notFoundActions}>
            <Link href="/library">返回牌库</Link>
            <Link href="/">返回首页</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
