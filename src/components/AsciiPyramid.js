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
  uniform sampler2D asciiTexture;
  varying vec3 vWorldPosition;

  float intensity(vec3 pos) {
    float dist = distance(lightPosition, pos);
    return 1.0 / (dist * dist);
  }

  void main() {
    float i = intensity(vWorldPosition);
    vec2 uv = vec2(1.0 - i, 0.5);
    vec4 texColor = texture2D(asciiTexture, uv);
    float brightness = texColor.r;
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


    const loader = new THREE.TextureLoader();
    const asciiTexture = loader.load("/ascii_chars.png");

    const material = new THREE.ShaderMaterial({
      uniforms: {
        lightPosition: { value: new THREE.Vector3(0, -5, 10) },
        asciiTexture: { value: asciiTexture },
      },
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
