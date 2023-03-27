// components/WobblingGlassOctahedron.js
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const WobblingGlassOctahedron = () => {
  const canvasRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const scene = new THREE.Scene();

    // Create octahedron geometry
    const octahedronGeometry = new THREE.OctahedronGeometry(1);

    // Create a glass-like material
    const glassMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      shininess: 100,
      refractionRatio: 0.99,
    });

    const octahedron = new THREE.Mesh(octahedronGeometry, glassMaterial);
    scene.add(octahedron);

    // Add point light
    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    camera.position.z = 3;

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', onResize);
    onResize();

    let wobble = 0;

    const animate = () => {
      requestAnimationFrame(animate);

      // Apply wobbling effect
      wobble += 0.01;
      octahedron.rotation.x = Math.sin(wobble) * 0.1;
      octahedron.rotation.y = Math.sin(wobble * 0.5) * 0.1;
      octahedron.rotation.z = Math.sin(wobble * 0.3) * 0.1;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      glassMaterial.dispose();
      octahedronGeometry.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'absolute', zIndex: -1 }} />;
};

export default WobblingGlassOctahedron;
