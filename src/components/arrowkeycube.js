import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';


function Box(props) {
  const mesh = useRef();

  useFrame(() => (mesh.current.rotation.x = mesh.current.rotation.y += 0.01));

  return (
    <mesh ref={mesh} {...props}>
      <boxBufferGeometry attach="geometry" args={[1, 1, 1]} />
      <meshStandardMaterial attach="material" color="orange" />
    </mesh>
  );
}


function Character(props) {
  const mesh = useRef();
  const [position, setPosition] = useState([0, 0, 0]);

  useFrame(() => {
    mesh.current.position.x = position[0];
    mesh.current.position.y = position[1];
  });

  window.addEventListener('keydown', (event) => {
    switch (event.key) {
      case 'ArrowUp':
        setPosition([position[0], position[1] + 1, position[2]]);
        break;
      case 'ArrowDown':
        setPosition([position[0], position[1] - 1, position[2]]);
        break;
      case 'ArrowLeft':
        setPosition([position[0] - 1, position[1], position[2]]);
        break;
      case 'ArrowRight':
        setPosition([position[0] + 1, position[1], position[2]]);
        break;
      default:
        break;
    }
  });

  return (
    <mesh ref={mesh} position={position} {...props}>
      <boxBufferGeometry attach="geometry" args={[1, 1, 1]} />
      <meshStandardMaterial attach="material" color="orange" />
    </mesh>
  );
}


export default function Platformer() {



  return(
    <group>
      <Character />
      <Box position={[1.2, 0, 0]} />
    </group>
  )
}