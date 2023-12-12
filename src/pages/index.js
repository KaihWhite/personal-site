// pages/index.js
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import React, { useEffect } from 'react';
import { motion as m3 } from 'framer-motion-3d';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Canvas, useFrame, useThree } from '@react-three/fiber';


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
      meshRef.current.position.z = -progress.current * 10;
      // console.log(progress.current)
    }
  });

  return (
    <m3.mesh ref={meshRef} position={[0, 0, 0]}>
      <boxBufferGeometry geometry='geometry' args={[3, 3, 3]}/>
      <meshStandardMaterial wireframe color="white"/>
    </m3.mesh>
  );
}


// Explosion animation
function explosion() {
  const Model = () => {
    //const gltf = useLoader(GLTFLoader, "./scene.gltf")
    return (
        <>
            <primitive position={[0, 0, 0]} object={gltf.scene} scale={1} />
        </>
    );
 };
  return (
    <div>
      <Canvas>
        <ambientLight />
        <pointLight position={[10, 10, 10]} />
        <Model />
      </Canvas>
    </div>
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
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', zIndex: '1' }}>
      <img style={{width: '150px', height: 'auto', transform: 'rotate(90deg)'}} src="/Me.png" alt="A picture of yours" />
      <div>
        About me goes here
      </div>
    </div>
  );
}


// Home page
export default function Home() {
  return (
    <div className={styles.home}>
      <Head>
        <title>Welcome</title>
        <meta name="description" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/PrettyIcon.png" />
      </Head>

      

      <div className={styles.cubeContainer}>
        <Canvas >
          <ambientLight />
          <Box />
        </Canvas>
      </div>

      <div style={{position: 'relative', display:'flex', width:'100vw', height:'100vh', justifyContent:'center', alignItems:'center'}}>
        <Intro />
      </div>

      <About />
    </div>
  );
}
