// components/WobblingGlassOctahedron.js
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

// generates a random rotation for collisions
function randomRotationPattern() {
  const min = -50;
  const max = 50;
  const rotationX = Math.random() * (max - min) + min;
  const rotationY = Math.random() * (max - min) + min;
  const rotationZ = Math.random() * (max - min) + min;

  return [rotationX, rotationY, rotationZ];
}

// Generate a random small force
function randomSmallForce() {
  const min = -0.01;
  const max = 0.01;
  return Math.random() * (max - min) + min;
}

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

    const numOctahedrons = 6; // Number of octahedrons
    const octahedrons = []; // Array to store the octahedrons
    const Zpos = 0; // z position of octahedrons
    const rotations = []; // 2d array with all the octahedron's rotations

    //might need to copy over what's inside onResize
    let halfWidth = Math.tan(camera.fov * 0.5 * (Math.PI / 180)) * camera.position.z;
    let halfHeight = halfWidth / camera.aspect;

    // Create multiple octahedrons
    for (let i = 0; i < numOctahedrons; i++) {
      const octahedron = new THREE.Mesh(octahedronGeometry, glassMaterial);
      octahedron.position.set((Math.random() * halfWidth) - halfWidth, (Math.random() * halfHeight) - halfHeight, Zpos);
      octahedrons.push(octahedron);
      rotations.push(randomRotationPattern());
      scene.add(octahedron);
    }

    // Add point light
    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    camera.position.z = 10;

    //defining the edges of the screen to allow the octahedron to bounch off of them
    const screenBounds = new THREE.Box3(
      new THREE.Vector3(-halfWidth, -halfHeight, Zpos - 1),
      new THREE.Vector3(halfWidth, halfHeight, Zpos + 1)
    );    

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);

      const widthPadding = 5.5;
      const bottomPadding = 2.5;
      const topPadding = 0.5;
    
      halfWidth = Math.tan(camera.fov * 0.5 * (Math.PI / 180)) * camera.position.z;
      halfHeight = halfWidth / camera.aspect;
    
      // Update screenBounds
      screenBounds.min.set(-(halfWidth+widthPadding), -(halfHeight+bottomPadding), Zpos - 1);
      screenBounds.max.set(halfWidth+widthPadding, halfHeight+topPadding, Zpos + 1);
    };

    
    const cursorPosition = new THREE.Vector3(10000, 10000, 10000); // Far away from the initial octahedron position
    const repulsionForces = Array(numOctahedrons).fill().map(() => new THREE.Vector3());

    const interactionRadius = 1; // Adjust this value to control the interaction distance
    const bounceFactor = 1; // Adjust this value to control the amount of bounce

    const onMouseMove = (event) => {
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = -(event.clientY / window.innerHeight) * 2 + 1;
      cursorPosition.set(x, y, 0.5).unproject(camera);
    };
    

    window.addEventListener('mousemove', onMouseMove);  

    window.addEventListener('resize', onResize);
    onResize();

    let spinSpeed = 0.001;
    const animate = () => {
      requestAnimationFrame(animate);

      octahedrons.forEach((octahedron, i) => {

        // Calculate the repulsion force
        const distanceToOctahedron = camera.position.distanceTo(octahedron.position);
        const distanceToCursor = camera.position.distanceTo(cursorPosition);
        const distanceRatio = distanceToOctahedron / distanceToCursor;

        const projectedCursorPosition = new THREE.Vector3().lerpVectors(camera.position, cursorPosition, distanceRatio);
        //const forceMagnitude = 0.05 / projectedCursorPosition.distanceTo(octahedron.position);

        const distanceToProjectedCursor = projectedCursorPosition.distanceTo(octahedron.position);
        if (distanceToProjectedCursor <= interactionRadius) {
          repulsionForces[i].subVectors(octahedron.position, projectedCursorPosition).normalize().multiplyScalar(0.05);
        } 
        
        for (let j = 0; j < numOctahedrons; j++) {
          if (j !== i) {
            const otherOctahedron = octahedrons[j];
            const distanceBetweenOctahedrons = octahedron.position.distanceTo(otherOctahedron.position);
            const minDistance = (octahedron.geometry.parameters.radius + otherOctahedron.geometry.parameters.radius) * 1.1;
      
            if (distanceBetweenOctahedrons < minDistance) {
              rotations[i] = randomRotationPattern();

              // Calculate the collision response
              const collisionNormal = new THREE.Vector3().subVectors(octahedron.position, otherOctahedron.position).normalize();
              const relativeVelocity = new THREE.Vector3().subVectors(repulsionForces[i], repulsionForces[j]);
              const impulse = relativeVelocity.dot(collisionNormal);
              const impulseVector = collisionNormal.clone().multiplyScalar(impulse);

              // Update the velocities
              repulsionForces[i].sub(impulseVector);
              repulsionForces[j].add(impulseVector);

              
            }
          }
        }


        // Update the octahedron's world position
        octahedron.updateMatrixWorld();
        const worldPosition = new THREE.Vector3();
        octahedron.getWorldPosition(worldPosition);

        // Check if the octahedron is outside the screen bounds and reflect its position and velocity
        if (!screenBounds.containsPoint(octahedron.position)) {
          const bounceFactor = 1; // Adjust this value to control the amount of bounce
          rotations[i] = randomRotationPattern();
          if (octahedron.position.x < screenBounds.min.x || octahedron.position.x > screenBounds.max.x) {
            repulsionForces[i].x = -repulsionForces[i].x * bounceFactor;
            octahedron.position.x = Math.max(screenBounds.min.x, Math.min(octahedron.position.x, screenBounds.max.x));
          }
          if (octahedron.position.y < screenBounds.min.y || octahedron.position.y > screenBounds.max.y) {
            repulsionForces[i].y = -repulsionForces[i].y * bounceFactor;
            octahedron.position.y = Math.max(screenBounds.min.y, Math.min(octahedron.position.y, screenBounds.max.y));
          }
        }

        // Apply the force
        repulsionForces[i].z = 0;
        octahedron.position.add(repulsionForces[i]);

        // if (repulsionForces[i].length() > 0) {
        //   octahedron.position.add(repulsionForces[i]);
        //   previousForces[i].copy(repulsionForces[i]);
        // } else {
        //   octahedron.position.add(previousForces[i]);
        // }

        // Apply spinning effect
        octahedron.rotation.x += spinSpeed*rotations[i][0];
        octahedron.rotation.y += spinSpeed*rotations[i][1];
        octahedron.rotation.z += spinSpeed*rotations[i][2];


        });

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
