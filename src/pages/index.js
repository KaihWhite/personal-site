// pages/index.js
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Playground from '../components/Playground';

export default function Home() {
  return (
    <div >
      <Playground />
      <Head>
        <title>Homepage</title>
        <meta name="description" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/PrettyIcon.png" />
      </Head>

      <header className={styles.banner}>
        <h1>Kaih White</h1>
      </header>
      <div className={styles.container}>
        <Footer />
      </div>
    </div>
  );
}
