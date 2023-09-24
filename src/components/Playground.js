import { Cone, Plane} from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import styles from '../styles/playground.module.css'
import React, { useEffect, useRef } from 'react'
import { MeshStandardMaterial } from 'three';



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


export default function App() {
  const container = useRef(null);
  const planeMaterial = new MeshStandardMaterial({ color: '#808080', roughness: 0.5 });
  
  return (
    <div ref={container} className={styles.main}>
      <div className={styles.scene}>
        <Canvas style={{ background: "#171717" }}>
          
          <ambientLight intensity={0.5} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
          <pointLight position={[10, 10, -10]} />
          <Plane args={[10, 10]} position={[0, -0.5,0]} rotation={[-Math.PI / 2, 0, 0]} material={planeMaterial}/>
          <Pyramid />
        </Canvas>
      </div>
    </div>
  );
}
