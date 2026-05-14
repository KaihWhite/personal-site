import styles from './PlaceholderLanding.module.scss';

export function PlaceholderLanding() {
  return (
    <main className={styles.landing}>
      <h1 className={styles.title}>Hello there.</h1>
      <p className={styles.subtitle}>
        My name is Kaih White. The interactive version of this site is still under construction —
        the menu in the top-right will take you everywhere you need to go for now.
      </p>
      <p className={styles.menuHint}>↗ Top-right corner</p>
    </main>
  );
}
