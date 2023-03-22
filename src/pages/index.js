// pages/index.js
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Homepage</title>
        <meta name="description" content="Homepage with a banner" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className={styles.banner}>
        <h1>Placeholder Text</h1>
        <Navbar />
      </header>

      <Footer />
    </div>
  );
}
