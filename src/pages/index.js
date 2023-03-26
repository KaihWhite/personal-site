// pages/index.js
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
//import SpinningPyramid from '../components/SpinningPyramid';
//import AsciiPyramid from '../components/AsciiPyramid.js';
import ShadedPyramid from '../components/ShadedPyramid';

export default function Home() {
  return (
    <div className={styles.container}>
      <ShadedPyramid/>
      <Head>
        <title>Homepage</title>
        <meta name="description" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className={styles.banner}>
        <h1>Kaih White</h1>
        <Navbar />
      </header>

      <Footer />
    </div>
  );
}
