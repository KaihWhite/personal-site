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

    camera.position.z = 5;

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const cursorPosition = new THREE.Vector3(10000, 10000, 10000); // Far away from the initial octahedron position
    const repulsionForce = new THREE.Vector3();

    const onMouseMove = (event) => {
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = -(event.clientY / window.innerHeight) * 2 + 1;
      cursorPosition.set(x, y, 0.5).unproject(camera);
    };
    

    window.addEventListener('mousemove', onMouseMove);  

    window.addEventListener('resize', onResize);
    onResize();

    let wobble = 0;

    const animate = () => {
      requestAnimationFrame(animate);

      // Calculate the repulsion force
      const distanceToOctahedron = camera.position.distanceTo(octahedron.position);
      const distanceToCursor = camera.position.distanceTo(cursorPosition);
      const distanceRatio = distanceToOctahedron / distanceToCursor;

      const projectedCursorPosition = new THREE.Vector3().lerpVectors(camera.position, cursorPosition, distanceRatio);
      const forceMagnitude = 0.05 / projectedCursorPosition.distanceTo(octahedron.position);
      repulsionForce.subVectors(octahedron.position, projectedCursorPosition).normalize().multiplyScalar(forceMagnitude);

      // Apply the repulsion force
      octahedron.position.x += repulsionForce.x;
      octahedron.position.y += repulsionForce.y;
      //octahedron.position.z += repulsionForce.z;

      // Wrap around screen edges
      const frustumHeight = 2.0 * Math.tan(camera.fov * 0.5 * (Math.PI / 180)) * camera.position.z;
      const frustumWidth = frustumHeight * camera.aspect;

      const halfWidth = frustumWidth / 2;
      const halfHeight = frustumHeight / 2;

      const offset = 1.2;

      if (octahedron.position.x < -halfWidth) {
        octahedron.position.x += 2 * halfWidth - offset;
      } else if (octahedron.position.x > halfWidth) {
        octahedron.position.x -= 2 * halfWidth - offset;
      }

      if (octahedron.position.y < -halfHeight) {
        octahedron.position.y += 2 * halfHeight - offset;
      } else if (octahedron.position.y > halfHeight) {
        octahedron.position.y -= 2 * halfHeight - offset;
      }


      // Apply wobbling effect
      wobble += 0.01;
      octahedron.rotation.x = Math.sin(wobble) * 0.1;
      octahedron.rotation.y = Math.sin(wobble * 0.5) * 0.1;
      octahedron.rotation.z = Math.sin(wobble * 0.3) * 0.1;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      glassMaterial.dispose();
      octahedronGeometry.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'absolute', zIndex: -1 }} />;
};

export default WobblingGlassOctahedron;
