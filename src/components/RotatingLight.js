// components/RotatingLight.js
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const RotatingLight = () => {
  const canvasRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const scene = new THREE.Scene();

    // Create a white sphere
    const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
    const sphereMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(sphere);

    // Create a point light
    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    scene.add(pointLight);

    // Set the initial position of the point light
    const lightRadius = 3;
    pointLight.position.set(lightRadius, 0, 0);

    // Add ambient light to the scene
    // const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    // scene.add(ambientLight);

    camera.position.z = 5;

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', onResize);
    onResize();

    // Random rotation speeds
    const randomSpeedX = 0.001 * (Math.random() * 2 - 1);
    const randomSpeedY = 0.001 * (Math.random() * 2 - 1);
    const randomSpeedZ = 0.001 * (Math.random() * 2 - 1);

    const animate = () => {
      requestAnimationFrame(animate);

      // Rotate the point light around the sphere with random speeds
      pointLight.position.x = lightRadius * Math.cos((Date.now() * (0.001 + randomSpeedX)));
      pointLight.position.y = lightRadius * Math.sin((Date.now() * (0.001 + randomSpeedY)));
      pointLight.position.z = lightRadius * Math.sin((Date.now() * (0.001 + randomSpeedZ)));

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      sphereMaterial.dispose();
      sphereGeometry.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'absolute', zIndex: -1 }} />;
};

export default RotatingLight;
