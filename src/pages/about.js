import Head from 'next/head';
import styles from '../styles/Home.module.css';
import Navbar from '../components/Navbar';

export default function About() {
  return (
    <div className={styles.container}>
      <Head>
        <title>About Page</title>
        <meta name="description" content="About Page" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className={styles.banner}>
        <h1>About</h1>
        <Navbar />
      </header>

      <main>
        <p>This is the About page.</p>
      </main>
    </div>
  );
}
