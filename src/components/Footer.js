import styles from '../Footer.module.css';

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <a href="https://github.com/KaihWhite" target="_blank" rel="noopener noreferrer">
        <button className={styles.footerButton}>Visit Example Site</button>
      </a>
      <a href="hhttps://www.linkedin.com/in/kaihwhite/" target="_blank" rel="noopener noreferrer">
        <button className={styles.footerButton}>Visit Another Example Site</button>
      </a>
    </footer>
  );
};

export default Footer;
