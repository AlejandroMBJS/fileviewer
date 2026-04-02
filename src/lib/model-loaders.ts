import * as THREE from 'three';
import { STLLoader } from 'three-stdlib';
import { ThreeMFLoader } from 'three-stdlib';
import initOpenCascade from 'occt-import-js';

export async function loadSTL(data: ArrayBuffer): Promise<THREE.Group> {
  const loader = new STLLoader();
  const geometry = loader.parse(data);
  
  if (geometry.attributes.position.count === 0) {
    throw new Error('STL file contains no geometry data.');
  }
  
  // Ensure normals are computed for proper lighting
  geometry.computeVertexNormals();
  geometry.center(); // Center the geometry itself

  const material = new THREE.MeshStandardMaterial({ 
    color: 0x999999, 
    flatShading: false,
    side: THREE.DoubleSide,
    metalness: 0.2,
    roughness: 0.8
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  const group = new THREE.Group();
  group.add(mesh);
  return group;
}

export async function load3MF(data: ArrayBuffer): Promise<THREE.Group> {
  const loader = new ThreeMFLoader();
  // ThreeMFLoader.parse expects the data to be an ArrayBuffer
  const group = loader.parse(data);
  return group;
}

export async function loadSTEP(data: Uint8Array): Promise<THREE.Group> {
  const occt = await initOpenCascade({
    locateFile: (path: string) => {
      if (path.endsWith('.wasm')) {
        return '/occt-import-js.wasm';
      }
      return path;
    }
  });
  const result = occt.ReadStepFile(data);
  
  const group = new THREE.Group();
  if (!result || !result.meshes) return group;

  result.meshes.forEach((meshData: any) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(meshData.attributes.position.array, 3));
    if (meshData.attributes.normal) {
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(meshData.attributes.normal.array, 3));
    }
    if (meshData.index) {
      geometry.setIndex(new THREE.Uint32BufferAttribute(meshData.index.array, 1));
    }
    
    const material = new THREE.MeshStandardMaterial({ 
      color: meshData.color ? new THREE.Color(meshData.color[0], meshData.color[1], meshData.color[2]) : 0xcccccc,
      metalness: 0.5,
      roughness: 0.5
    });
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);
  });

  return group;
}

/**
 * DWG to DXF conversion is extremely complex in pure JS.
 * In a real production environment, this would typically be handled by a backend service
 * using a tool like LibreCAD's dwg2dxf or ODA File Converter.
 * 
 * For this implementation, we provide a placeholder that explains the requirement
 * or uses a hypothetical conversion route.
 */
export async function convertDwgToDxf(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/convert-dwg', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to convert DWG');
    }

    return await response.text();
  } catch (err) {
    console.error('DWG Conversion Error:', err);
    throw new Error('DWG conversion requires a backend service. Please use DXF for now or ensure the backend is configured.');
  }
}
