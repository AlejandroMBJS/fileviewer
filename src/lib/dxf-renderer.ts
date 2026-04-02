import * as THREE from 'three';
import DxfParser from 'dxf-parser';
import { NURBSCurve } from 'three/examples/jsm/curves/NURBSCurve.js';

export function renderDxf(dxfData: string): THREE.Group {
  const parser = new DxfParser();
  let dxf;
  
  // Robustness: Ensure the DXF data ends with the mandatory EOF marker
  // Some exporters omit this, which causes dxf-parser to throw an error.
  let processedData = dxfData.trim();
  if (!processedData.toUpperCase().endsWith('EOF')) {
    processedData += '\n0\nEOF';
  }

  try {
    dxf = parser.parseSync(processedData);
  } catch (err) {
    console.error('Error parsing DXF:', err);
    // If it fails again, try one more time without the manual EOF if we added it
    // or just throw a more descriptive error.
    throw new Error('Failed to parse DXF file. The file might be malformed or in a binary format not supported by this parser.');
  }

  const group = new THREE.Group();
  const material = new THREE.LineBasicMaterial({ color: 0xffffff });

  if (!dxf || !dxf.entities) return group;

  dxf.entities.forEach((entity: any) => {
    let geometry: THREE.BufferGeometry | null = null;

    switch (entity.type) {
      case 'LINE':
        geometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(entity.vertices[0].x, entity.vertices[0].y, entity.vertices[0].z || 0),
          new THREE.Vector3(entity.vertices[1].x, entity.vertices[1].y, entity.vertices[1].z || 0),
        ]);
        break;

      case 'LWPOLYLINE':
      case 'POLYLINE':
        const points = entity.vertices.map((v: any) => new THREE.Vector3(v.x, v.y, v.z || 0));
        if (entity.shape) points.push(points[0]); // Close polyline
        geometry = new THREE.BufferGeometry().setFromPoints(points);
        break;

      case 'CIRCLE':
        const circlePoints = [];
        const segments = 64;
        for (let i = 0; i <= segments; i++) {
          const theta = (i / segments) * Math.PI * 2;
          circlePoints.push(
            new THREE.Vector3(
              entity.center.x + Math.cos(theta) * entity.radius,
              entity.center.y + Math.sin(theta) * entity.radius,
              entity.center.z || 0
            )
          );
        }
        geometry = new THREE.BufferGeometry().setFromPoints(circlePoints);
        break;

      case 'ARC':
        const arcPoints = [];
        const arcSegments = 32;
        const startAngle = entity.startAngle;
        const endAngle = entity.endAngle;
        const delta = endAngle < startAngle ? (endAngle + 2 * Math.PI - startAngle) : (endAngle - startAngle);
        
        for (let i = 0; i <= arcSegments; i++) {
          const theta = startAngle + (i / arcSegments) * delta;
          arcPoints.push(
            new THREE.Vector3(
              entity.center.x + Math.cos(theta) * entity.radius,
              entity.center.y + Math.sin(theta) * entity.radius,
              entity.center.z || 0
            )
          );
        }
        geometry = new THREE.BufferGeometry().setFromPoints(arcPoints);
        break;

      case 'POINT':
        // Points are hard to see as lines, maybe use a small cross or circle
        break;

      case 'SPLINE':
        geometry = createSplineGeometry(entity);
        break;
    }

    if (geometry) {
      const color = entity.color ? `#${entity.color.toString(16).padStart(6, '0')}` : 0xcccccc;
      const lineMaterial = new THREE.LineBasicMaterial({ color });
      const line = new THREE.Line(geometry, lineMaterial);
      group.add(line);
    }
  });

  return group;
}

function createSplineGeometry(entity: any): THREE.BufferGeometry | null {
  const controlPoints = Array.isArray(entity.controlPoints) ? entity.controlPoints : [];
  if (controlPoints.length < 2) {
    return null;
  }

  try {
    const degree = typeof entity.degreeOfSplineCurve === 'number' ? entity.degreeOfSplineCurve : 3;
    const knots = Array.isArray(entity.knotValues) ? entity.knotValues : [];

    if (knots.length >= controlPoints.length + degree + 1) {
      const nurbsPoints = controlPoints.map(
        (point: any) => new THREE.Vector4(point.x, point.y, point.z || 0, 1)
      );
      const curve = new NURBSCurve(degree, knots, nurbsPoints);
      const sampledPoints = curve.getPoints(getSplineSegments(controlPoints.length));
      if (entity.closed && sampledPoints.length > 0) {
        sampledPoints.push(sampledPoints[0].clone());
      }
      return new THREE.BufferGeometry().setFromPoints(sampledPoints);
    }
  } catch (error) {
    console.warn('Falling back to control-point spline rendering.', error);
  }

  const fallbackPoints = controlPoints.map(
    (point: any) => new THREE.Vector3(point.x, point.y, point.z || 0)
  );
  if (entity.closed && fallbackPoints.length > 0) {
    fallbackPoints.push(fallbackPoints[0].clone());
  }
  return new THREE.BufferGeometry().setFromPoints(fallbackPoints);
}

function getSplineSegments(controlPointCount: number) {
  return Math.max(24, controlPointCount * 8);
}
