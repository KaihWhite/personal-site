import styles from '../styles/Footer.module.css';

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <a href="https://github.com/KaihWhite" target="_blank" rel="noopener noreferrer">
        <button className={styles.footerButton}>Github</button>
      </a>
      <a href="https://www.linkedin.com/in/kaihwhite/" target="_blank" rel="noopener noreferrer">
        <button className={styles.footerButton}>Linkedin</button>
      </a>
    </footer>
  );
};

export default Footer;
