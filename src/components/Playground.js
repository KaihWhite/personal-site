import { Cone, Plane} from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import styles from '../styles/playground.module.css'
import React, { useEffect, useRef, useState } from 'react'
import { MeshStandardMaterial, BoxBufferGeometry } from 'three';



// Creates a pyramid object when called
function Pyramid() {
  const pyramidMaterial = new MeshStandardMaterial({ color: '#d24dff', roughness: 0.8 });
  const pyramidRef = useRef();

  useFrame(() => {
    if (pyramidRef.current) {
      pyramidRef.current.rotation.y += 0.01;
    }
  });

  return(
    <Cone ref={pyramidRef} args={[1, 2, 4]} position={[0, 1, 0]} material={pyramidMaterial}/>
  )
}


// Creates a cube object when called
function Display() {
  const cubeMaterial = new MeshStandardMaterial({ color: '#f9f9f9', roughness: 0.8 });
  const cubeRef = useRef();
  const [scrollY, setScrollY] = useState(0);

  const handleScroll = () => {
    setScrollY(window.scrollY);
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

   // Rotate cube on each frame based on scrollY
   useFrame(() => {
    if (cubeRef.current) {
      // cubeRef.current.rotation.x = scrollY / 500;
      cubeRef.current.rotation.y = scrollY / 500;
    }
  });

  // <Cube ref={cubeRef} args={[1, 2, 4]} position={[0, 1, 0]} material={cubeMaterial}/>
  return(
    <mesh 
      ref={cubeRef} 
      geometry={new BoxBufferGeometry(1, 1, 1)} 
      position={[0, 0, 3]} 
      material={cubeMaterial}
    />
  )
}


// Final component that renders the scenes
export default function App() {
  const container = useRef(null);
  const planeMaterial = new MeshStandardMaterial({ color: '#808080', roughness: 0.5 });
  
  return (
    <div ref={container}>
      <div className={styles.scene}>
        <Canvas style={{ background: "#171717" }}>
          
          <ambientLight intensity={0.5} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
          <pointLight position={[0, 0, 5]} />
          {/* <Plane args={[10, 10]} position={[0, -0.5,0]} rotation={[-Math.PI / 2, 0, 0]} material={planeMaterial}/> */}
          <Platformer/>
        </Canvas>
      </div>
    </div>
  );
}
