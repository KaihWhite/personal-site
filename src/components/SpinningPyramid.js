// components/SpinningPyramid.js
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const SpinningPyramid = () => {
  const canvasRef = useRef();

  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0); // Set the background color to transparent
    canvasRef.current.appendChild(renderer.domElement);

    const pyramidGeometry = new THREE.ConeGeometry(1, 2, 4);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
    const pyramid = new THREE.Mesh(pyramidGeometry, material);

    const pyramidGroup = new THREE.Group();
    pyramidGroup.add(pyramid);

    pyramid.position.y - -1;

    scene.add(pyramidGroup);

    camera.position.z = 5;

    const animate = () => {
      requestAnimationFrame(animate);

      pyramidGroup.rotation.x += 0.01;
      pyramidGroup.rotation.y += 0.01;
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      renderer.dispose();
      material.dispose();
      pyramidGeometry.dispose();
    };
  }, []);

  return <div ref={canvasRef} style={{ position: 'absolute', zIndex: -1 }} />;
};

export default SpinningPyramid;
