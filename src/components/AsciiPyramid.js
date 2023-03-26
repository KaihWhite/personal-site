// components/AsciiPyramid.js
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const vertexShader = `
  varying vec3 vWorldPosition;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform vec3 lightPosition;
  varying vec3 vWorldPosition;

  float intensity(vec3 pos) {
    vec3 lightDirection = normalize(lightPosition - pos);
    vec3 normal = normalize(cross(dFdx(pos), dFdy(pos)));
    float cosTheta = max(dot(normal, lightDirection), 0.0);
    float dist = distance(lightPosition, pos);
    return cosTheta / (dist * dist);
  }

  void main() {
    float i = intensity(vWorldPosition);
    float step = 1.0 / 9.0;

    // ASCII characters as brightness values
    float ascii[9] = float[9](0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9);
    float brightness = 0.0;
    
    for (int j = 0; j < 9; j++) {
      if (i >= float(j) * step && i <= float(j + 1) * step) {
        brightness = ascii[j];
        break;
      }
    }

    gl_FragColor = vec4(vec3(brightness), 1.0);
  }
`;


const AsciiPyramid = () => {
  const canvasRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const scene = new THREE.Scene();

    const pyramidGeometry = new THREE.ConeGeometry(1, 2, 4);

    const material = new THREE.ShaderMaterial({
      uniforms: { lightPosition: { value: new THREE.Vector3(0, -5, 10) } },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
    });    
    
    const pyramid = new THREE.Mesh(pyramidGeometry, material);
    scene.add(pyramid);

    camera.position.z = 5;

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

export default AsciiPyramid;
