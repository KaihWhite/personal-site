// components/ShadedPyramid.js
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const ShadedPyramid = () => {
  const canvasRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const scene = new THREE.Scene();

    const pyramidGeometry = new THREE.ConeGeometry(1, 2, 4);

    const material = new THREE.MeshPhongMaterial({
      color: 0xffffff,
    });

    const pyramid = new THREE.Mesh(pyramidGeometry, material);
    scene.add(pyramid);

    const light = new THREE.PointLight(0xffffff, 1, 100);
    light.position.set(10, 2, 5);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.05);
    scene.add(ambientLight);

    camera.position.z = 3;

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', onResize);
    onResize();

    const animate = () => {
      requestAnimationFrame(animate);

      pyramid.rotation.x += 0.01;
      pyramid.rotation.y += 0.01;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      material.dispose();
      pyramidGeometry.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'absolute', zIndex: -1 }} />;
};

export default ShadedPyramid;
