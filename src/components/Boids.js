import React, {useState, useEffect} from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';

function Triangle(props) {
  const geometry = new THREE.BufferGeometry();

  const vertices = new Float32Array([
    0, 1, 0,
    -1, -1, 0,
    1, -1, 0
  ]);

  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

  return (
    <mesh geometry={geometry} position={props.position}>
      <meshBasicMaterial color={props.color || "blue"} side={THREE.DoubleSide} />
    </mesh>
  );
}


class TriangleObj {
  constructor(position = [0,0,0], color = "white") {
    this.position = position;
    this.color = color;
  }
}


export default function Boids(){

  const [triangles, setTriangles] = useState([]);

  useEffect(() => {
    const t1 = new TriangleObj([0, 0, 0]);
    const t2 = new TriangleObj([-2, 0, 0]);
    setTriangles([t1, t2]);
  }, []);

  return(
      triangles.map((triangle, index) => (
        <Triangle key={index} position={triangle.position} color={triangle.color} />
      ))
  );
}