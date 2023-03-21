import styles from './Footer.module.css';

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <a href="https://www.example.com" target="_blank" rel="noopener noreferrer">
        <button className={styles.footerButton}>Visit Example Site</button>
      </a>
      <a href="https://www.another-example.com" target="_blank" rel="noopener noreferrer">
        <button className={styles.footerButton}>Visit Another Example Site</button>
      </a>
    </footer>
  );
};

export default Footer;
