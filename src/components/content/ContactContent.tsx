import styles from './ContactContent.module.scss';

export function ContactContent() {
  return (
    <section className={styles.section}>
      <h1 className={styles.heading}>Contact</h1>
      <p className={styles.lede}>The easiest ways to reach me.</p>
      <ul className={styles.links}>
        <li>
          <a href="mailto:kaihgwhite@outlook.com">kaihgwhite@outlook.com</a>
        </li>
        <li>
          <a href="https://github.com/KaihWhite" target="_blank" rel="noopener noreferrer">
            github.com/KaihWhite
          </a>
        </li>
      </ul>
    </section>
  );
}
