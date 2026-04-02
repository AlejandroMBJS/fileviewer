import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { renderDxf } from '../lib/dxf-renderer';
import { loadSTL, load3MF, loadSTEP } from '../lib/model-loaders';
import { Maximize2, Minimize2, RotateCcw, ZoomIn, ZoomOut, Box as BoxIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface ViewerProps {
  fileData: {
    data: string | ArrayBuffer;
    type: 'dxf' | 'stl' | '3mf' | 'step';
    name: string;
  } | null;
}

export const Viewer: React.FC<ViewerProps> = ({ fileData }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      100000
    );
    camera.position.set(0, 0, 500);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls setup
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    // Grid helper
    const grid = new THREE.GridHelper(2000, 100, 0x333333, 0x222222);
    grid.rotation.x = Math.PI / 2;
    scene.add(grid);

    // Lighting for 3D models
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    hemisphereLight.position.set(0, 20, 0);
    scene.add(hemisphereLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      rendererRef.current.setSize(width, height);
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    if (!fileData || !sceneRef.current || !cameraRef.current || !controlsRef.current) return;

    // Clear previous group
    if (groupRef.current) {
      sceneRef.current.remove(groupRef.current);
    }

    const loadModel = async () => {
      console.log('Loading model:', fileData.name, 'type:', fileData.type);
      try {
        let group: THREE.Group;
        
        switch (fileData.type) {
          case 'stl':
            group = await loadSTL(fileData.data as ArrayBuffer);
            break;
          case '3mf':
            group = await load3MF(fileData.data as ArrayBuffer);
            break;
          case 'step':
            group = await loadSTEP(new Uint8Array(fileData.data as ArrayBuffer));
            break;
          case 'dxf':
          default:
            group = renderDxf(fileData.data as string);
            break;
        }

        console.log('Model loaded successfully, children:', group.children.length);
        sceneRef.current?.add(group);
        groupRef.current = group;

        // Add a box helper for debugging
        const helper = new THREE.BoxHelper(group, 0xffff00);
        sceneRef.current?.add(helper);

        // Center camera on geometry
        const box = new THREE.Box3().setFromObject(group);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        
        console.log('Model dimensions:', size.x, size.y, size.z, 'maxDim:', maxDim);

        if (maxDim === 0) {
          console.warn('Model has zero dimensions');
        }

        // Update grid size based on model
        const grid = sceneRef.current?.children.find(c => c instanceof THREE.GridHelper) as THREE.GridHelper;
        if (grid) {
          sceneRef.current?.remove(grid);
        }
        const newGrid = new THREE.GridHelper(Math.max(10, maxDim * 10), 20);
        sceneRef.current?.add(newGrid);

        // Adjust camera clipping planes based on model size
        cameraRef.current!.near = Math.max(0.001, maxDim / 1000);
        cameraRef.current!.far = Math.max(1000, maxDim * 100);
        cameraRef.current!.updateProjectionMatrix();

        const fov = cameraRef.current!.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 2.5; // Zoom out a bit more

        cameraRef.current!.position.set(center.x + maxDim, center.y + maxDim, center.z + cameraZ);
        cameraRef.current!.lookAt(center);
        controlsRef.current!.target.copy(center);
        controlsRef.current!.update();

      } catch (err) {
        console.error('Error loading model:', err);
      }
    };

    loadModel();
  }, [fileData]);

  const handleZoomIn = () => {
    if (cameraRef.current) {
      cameraRef.current.position.multiplyScalar(0.8);
    }
  };

  const handleZoomOut = () => {
    if (cameraRef.current) {
      cameraRef.current.position.multiplyScalar(1.2);
    }
  };

  const handleReset = () => {
    if (groupRef.current && cameraRef.current && controlsRef.current) {
      const box = new THREE.Box3().setFromObject(groupRef.current);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = cameraRef.current.fov * (Math.PI / 180);
      let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;
      cameraRef.current.position.set(center.x, center.y, cameraZ);
      controlsRef.current.target.copy(center);
    }
  };

  return (
    <div className="relative w-full h-full bg-neutral-900 overflow-hidden rounded-xl border border-neutral-800 shadow-2xl">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* Controls Overlay */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-neutral-800/80 backdrop-blur-md rounded-full border border-neutral-700 shadow-lg">
        <button 
          onClick={handleZoomIn}
          className="p-2 hover:bg-neutral-700 rounded-full transition-colors text-neutral-200"
          title="Zoom In"
        >
          <ZoomIn size={20} />
        </button>
        <button 
          onClick={handleZoomOut}
          className="p-2 hover:bg-neutral-700 rounded-full transition-colors text-neutral-200"
          title="Zoom Out"
        >
          <ZoomOut size={20} />
        </button>
        <div className="w-px h-6 bg-neutral-700 mx-1" />
        <button 
          onClick={handleReset}
          className="p-2 hover:bg-neutral-700 rounded-full transition-colors text-neutral-200"
          title="Reset View"
        >
          <RotateCcw size={20} />
        </button>
      </div>

      {/* Info Overlay */}
      <div className="absolute top-6 left-6 flex flex-col gap-1">
        <div className="px-3 py-1.5 bg-neutral-800/80 backdrop-blur-md rounded-lg border border-neutral-700 text-xs font-medium text-neutral-300">
          {fileData ? `Loaded: ${fileData.name}` : 'No File Loaded'}
        </div>
      </div>
    </div>
  );
};
