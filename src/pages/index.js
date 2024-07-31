// pages/index.js
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import React, { useEffect } from 'react';
import { motion as m3 } from 'framer-motion-3d';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Canvas, useFrame, useThree } from '@react-three/fiber';

import Menu from '../components/Menu';
import Portfolio from './portfolio';


// Jumping text animation
const AnimatedName = ({ name }) => {
  return (
    <div style={{ display: 'inline-block' }}>
      {name.split('').map((letter, index) => (
        <motion.span
          key={index}
          animate={{
            y: [0, -20, 0],
            transition: {
              duration: 0.5,
              ease: "easeInOut",
              repeat: Infinity,
              repeatDelay: 2.0,
              delay: index * 0.1 // Staggered delay for each letter
            }
          }}
          style={{ display: 'inline-block', marginRight: '2px' }}
        >
          {letter}
        </motion.span>
      ))}
    </div>
  );
};


// wireframe box 
function Box() {
  const meshRef = React.useRef();
  const { scrollYProgress } = useScroll();
  const progress = useTransform(scrollYProgress, [0, 1], [0, 100])

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.00125;
      meshRef.current.rotation.y += 0.0025;
      meshRef.current.position.z = -progress.current;
      
      // if (progress.current > 50) {
      //   meshRef.current.visible = false;
      // }
      // else {
      //   meshRef.current.visible = true;
      // }
    }
  });

  return (
    <m3.mesh ref={meshRef} position={[0, 0, 0]}>
      <boxBufferGeometry geometry='geometry' args={[3.5, 3.5, 3.5]}/>
      <meshStandardMaterial wireframe color="white"/>
    </m3.mesh>
  );
}


// Component to create a link with an icon
function IconLink({ href, iconPath, margin}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', margin: margin || '20px'}}>
      <img src={iconPath} alt="icon" style={{ width: '30px', height: '30px' }} />
    </a>
  );
}


// Intro
function Intro() {
  return (
    <div className={styles.intro}>
      <div style={{ fontSize: '48px', fontWeight: 'bold', position: 'relative', top: '0px'}}>
        Hello there,
      </div>
      <div style={{ fontSize: '36px', fontWeight: 'bold', position: 'relative', top: '0px', paddingLeft:'1rem'}}>
        <br/><br/>my name is <AnimatedName name="Kaih White" />
      </div>
    </div>
  ); 
}

function About() {

  return (
    <div>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', paddingBottom: '30px'}}>
        <motion.div style={{ fontSize: '48px', fontWeight: 'bold', position: 'relative', top: '0px' }}>Who am I?</motion.div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: '1', flexDirection: 'row', padding: '0 20px'}}>
        <div style={{width: '50%', maxWidth: '300px'}}> {/* Explicit width for image container */}
          <img style={{width: '100%', height: 'auto', objectFit: 'contain', transform: 'rotate(0deg)'}} src="/me.PNG" alt="Picture of me" />
          {/* <ImageComponent imageName="me.png" /> */}
        </div>
        <div style={{width: '50%', padding: '0 20px'}}> {/* Explicit width for paragraph container */}
          <p style={{fontSize: '22px'}}>
            I am a tinkerer who grew up on systems that were before my time and got to see the information revolution unfold before my eyes. Every system has always been a magical black box waiting to have its contents emptied.
            It all started with modifying game code to find exploits and dissesemlbing electric skateboards to replace components for friends. I didn't realize it, but I was practicing my ability to understand systems and reverse engineer them.
            My fascination with systems and solutions only grows with every opportunity I have to work on complex topics and diverse problems.
          </p>
        </div>
      </div>
    </div>
  );
}

// Home page
export default function Home() {
  return (
    <div className={styles.home}>
      <Head>
        <title>Meet Kaih White</title>
        <meta name="description" content="Hello there! Welcome to Kaih's site." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/THIS_IS_IT.png" />
      </Head>

      <div className={styles.cubeContainer}>
        <Canvas >
          <ambientLight />
          <Box />
        </Canvas>
      </div>

      <div style={{position: 'relative', display: 'flex', paddingBottom: '25%', paddingTop: '25%', justifyContent:'center', alignItems:'center', overflow: 'hidden'}}>
        <Intro />
      </div>

      <About />

      <Portfolio />

      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: '2', flexDirection: 'row', padding: '10px'}}>
        <IconLink href="https://github.com/KaihWhite" iconPath="/github.png" />
        <IconLink href="https://www.linkedin.com/in/kaihwhite/" iconPath="/linkedin.png" />
      </div>

    </div>
  );
}
