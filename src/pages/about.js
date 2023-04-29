// pages/about.js
import Head from 'next/head';
import styles from '../styles/about.module.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
//import RotatingLight from '../components/RotatingLight'
import WobblingGlassOctahedron from '../components/WobblingGlassOctahedron';
import AboutMeModal from '../components/AboutMeModal';


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
        <AboutMeModal />
      </main>

      <Footer />
    </div>
  );
}
