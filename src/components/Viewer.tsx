import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { renderDxf } from '../lib/dxf-renderer';
import { loadSTL, load3MF, loadSTEP } from '../lib/model-loaders';
import { AlertCircle, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { FileData, ViewerFileType } from '../lib/cad-types';

interface ViewerProps {
  fileData: FileData | null;
}

export const Viewer: React.FC<ViewerProps> = ({ fileData }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const frameRef = useRef<number | null>(null);
  const fitTargetRef = useRef<{ center: THREE.Vector3; size: THREE.Vector3; type: ViewerFileType } | null>(null);
  const [viewerError, setViewerError] = useState<string | null>(null);

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
      frameRef.current = requestAnimationFrame(animate);
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
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
      if (groupRef.current) {
        clearCurrentModel(scene, groupRef);
      }
      controls.dispose();
      renderer.dispose();
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    if (!fileData || !sceneRef.current || !cameraRef.current || !controlsRef.current) return;

    const loadModel = async () => {
      setViewerError(null);
      fitTargetRef.current = null;
      clearCurrentModel(sceneRef.current, groupRef);

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

        if (group.children.length === 0) {
          throw new Error('The file was parsed, but it does not contain renderable geometry.');
        }

        sceneRef.current?.add(group);
        groupRef.current = group;

        const box = new THREE.Box3().setFromObject(group);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        fitTargetRef.current = { center, size, type: fileData.type };

        replaceGrid(sceneRef.current!, size, fileData.type === 'dxf');
        fitCameraToModel(cameraRef.current!, controlsRef.current!, center, size, fileData.type);

      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to render this file.';
        console.error('Error loading model:', err);
        setViewerError(message);
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
    if (fitTargetRef.current && cameraRef.current && controlsRef.current) {
      fitCameraToModel(
        cameraRef.current,
        controlsRef.current,
        fitTargetRef.current.center,
        fitTargetRef.current.size,
        fitTargetRef.current.type,
      );
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

      {viewerError && (
        <div className="absolute inset-x-6 top-20 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 backdrop-blur-md">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{viewerError}</span>
        </div>
      )}
    </div>
  );
};

function replaceGrid(scene: THREE.Scene, size: THREE.Vector3, isPlanar: boolean) {
  const previousGrid = scene.children.find((child) => child instanceof THREE.GridHelper);
  if (previousGrid) {
    scene.remove(previousGrid);
  }

  const maxDim = Math.max(size.x, size.y, size.z, 10);
  const grid = new THREE.GridHelper(Math.max(50, maxDim * 4), 20, 0x3b82f6, 0x222222);
  if (isPlanar) {
    grid.rotation.x = Math.PI / 2;
  }
  scene.add(grid);
}

function fitCameraToModel(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  center: THREE.Vector3,
  size: THREE.Vector3,
  type: ViewerFileType,
) {
  const maxDim = Math.max(size.x, size.y, size.z, 1);
  camera.near = Math.max(0.001, maxDim / 1000);
  camera.far = Math.max(1000, maxDim * 100);
  camera.updateProjectionMatrix();

  const fov = THREE.MathUtils.degToRad(camera.fov);
  const distance = Math.max(maxDim / (2 * Math.tan(fov / 2)), maxDim) * (type === 'dxf' ? 1.8 : 2.2);

  if (type === 'dxf') {
    camera.position.set(center.x, center.y, center.z + distance);
  } else {
    camera.position.set(center.x + distance, center.y + distance * 0.7, center.z + distance);
  }

  camera.lookAt(center);
  controls.target.copy(center);
  controls.update();
}

function clearCurrentModel(
  scene: THREE.Scene,
  groupRef: React.MutableRefObject<THREE.Group | null>,
) {
  if (!groupRef.current) {
    return;
  }

  scene.remove(groupRef.current);
  disposeObject(groupRef.current);
  groupRef.current = null;
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }

    if (!mesh.material) {
      return;
    }

    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((material) => material.dispose());
      return;
    }

    mesh.material.dispose();
  });
}
