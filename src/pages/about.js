// pages/about.js
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
//import RotatingLight from '../components/RotatingLight'
import WobblingGlassOctahedron from '../components/WobblingGlassOctahedron';


export default function About() {
  return (
    <div className={styles.container}>
        <WobblingGlassOctahedron />
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

      <Footer />
    </div>
  );
}
