import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { renderDxf } from '../lib/dxf-renderer';
import { loadSTL, load3MF, loadSTEP } from '../lib/model-loaders';
import { AlertCircle, Grid3X3, Move3D, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
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
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const axesRef = useRef<THREE.AxesHelper | null>(null);
  const frameRef = useRef<number | null>(null);
  const fitTargetRef = useRef<{ box: THREE.Box3; center: THREE.Vector3; size: THREE.Vector3; type: ViewerFileType } | null>(null);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [showAxes, setShowAxes] = useState(false);

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

    // Lighting for 3D models
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0xdbeafe, 0x0f172a, 1.2);
    hemisphereLight.position.set(0, 20, 0);
    scene.add(hemisphereLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(8, 12, 10);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.8);
    rimLight.position.set(-10, 6, -8);
    scene.add(rimLight);

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
      clearSceneDecorations(scene, gridRef, axesRef);
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
      clearSceneDecorations(sceneRef.current, gridRef, axesRef);

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
        fitTargetRef.current = { box, center, size, type: fileData.type };

        updateSceneDecorations(sceneRef.current!, box, size, fileData.type, showGrid, showAxes, gridRef, axesRef);
        fitCameraToModel(cameraRef.current!, controlsRef.current!, center, size, fileData.type);

      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to render this file.';
        console.error('Error loading model:', err);
        setViewerError(message);
      }
    };

    loadModel();
  }, [fileData, showGrid, showAxes]);

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

      <div className="absolute top-6 right-6 flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-900/80 px-2 py-2 text-xs text-neutral-300 backdrop-blur-md shadow-lg">
        <button
          onClick={() => setShowGrid((value) => !value)}
          className={`flex items-center gap-2 rounded-full px-3 py-1.5 transition-colors ${showGrid ? 'bg-blue-500/20 text-blue-200' : 'hover:bg-neutral-800'}`}
          title="Toggle grid"
        >
          <Grid3X3 size={14} />
          <span>Grid</span>
        </button>
        <button
          onClick={() => setShowAxes((value) => !value)}
          className={`flex items-center gap-2 rounded-full px-3 py-1.5 transition-colors ${showAxes ? 'bg-blue-500/20 text-blue-200' : 'hover:bg-neutral-800'}`}
          title="Toggle axes helper"
        >
          <Move3D size={14} />
          <span>Axes</span>
        </button>
      </div>
      
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

function updateSceneDecorations(
  scene: THREE.Scene,
  box: THREE.Box3,
  size: THREE.Vector3,
  type: ViewerFileType,
  showGrid: boolean,
  showAxes: boolean,
  gridRef: React.MutableRefObject<THREE.GridHelper | null>,
  axesRef: React.MutableRefObject<THREE.AxesHelper | null>,
) {
  clearSceneDecorations(scene, gridRef, axesRef);

  const maxDim = Math.max(size.x, size.y, size.z, 1);

  if (showGrid) {
    const grid = createGridHelper(box, size, type);
    gridRef.current = grid;
    scene.add(grid);
  }

  if (showAxes && type !== 'dxf') {
    const axes = new THREE.AxesHelper(Math.max(maxDim * 0.2, 25));
    const floorY = box.min.y - maxDim * 0.02;
    axes.position.set(box.min.x - maxDim * 0.12, floorY, box.min.z - maxDim * 0.12);
    axesRef.current = axes;
    scene.add(axes);
  }
}

function createGridHelper(box: THREE.Box3, size: THREE.Vector3, type: ViewerFileType) {
  const span = Math.max(size.x, size.z, size.y, 20);
  const divisions = clampDivisions(Math.round(span / 10));
  const grid = new THREE.GridHelper(Math.max(span * 2, 40), divisions, 0x2a3441, 0x1b2530);
  const material = grid.material as THREE.Material | THREE.Material[];
  const materials = Array.isArray(material) ? material : [material];
  materials.forEach((entry) => {
    entry.transparent = true;
    entry.opacity = type === 'dxf' ? 0.18 : 0.26;
    entry.depthWrite = false;
  });

  if (type === 'dxf') {
    grid.rotation.x = Math.PI / 2;
    grid.position.z = box.min.z - Math.max(size.x, size.y, 1) * 0.01;
  } else {
    grid.position.y = box.min.y - Math.max(size.y, 1) * 0.02;
  }

  return grid;
}

function clampDivisions(value: number) {
  return Math.max(8, Math.min(40, value));
}

function clearSceneDecorations(
  scene: THREE.Scene,
  gridRef: React.MutableRefObject<THREE.GridHelper | null>,
  axesRef: React.MutableRefObject<THREE.AxesHelper | null>,
) {
  if (gridRef.current) {
    scene.remove(gridRef.current);
    disposeHelper(gridRef.current);
    gridRef.current = null;
  }

  if (axesRef.current) {
    scene.remove(axesRef.current);
    disposeHelper(axesRef.current);
    axesRef.current = null;
  }
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

function disposeHelper(object: THREE.Object3D) {
  object.traverse((child) => {
    const line = child as THREE.LineSegments;
    if (line.geometry) {
      line.geometry.dispose();
    }

    if (!line.material) {
      return;
    }

    if (Array.isArray(line.material)) {
      line.material.forEach((material) => material.dispose());
      return;
    }

    line.material.dispose();
  });
}
