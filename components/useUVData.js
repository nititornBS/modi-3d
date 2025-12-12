"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";


// Export the extract function for use outside hooks
export function extractUVData(object) {
  const uvData = {
    meshes: [],
    bounds: { minU: Infinity, minV: Infinity, maxU: -Infinity, maxV: -Infinity },
  };

  object.traverse((child) => {
    if (child.isMesh && child.geometry) {
      const geometry = child.geometry;
      
      // Check if geometry has UV coordinates
      if (geometry.hasAttribute("uv")) {
        const uvAttribute = geometry.getAttribute("uv");
        const positionAttribute = geometry.getAttribute("position");
        const index = geometry.index;

        const meshData = {
          name: child.name || "mesh",
          triangles: [],
          bounds: { minU: Infinity, minV: Infinity, maxU: -Infinity, maxV: -Infinity },
        };

        // Extract triangles with UV coordinates
        const vertexCount = index ? index.count : positionAttribute.count;
        const triangleCount = index ? index.count / 3 : vertexCount / 3;

        for (let i = 0; i < triangleCount; i++) {
          const triangle = { vertices: [] };

          for (let j = 0; j < 3; j++) {
            const vertexIndex = index ? index.getX(i * 3 + j) : i * 3 + j;
            const u = uvAttribute.getX(vertexIndex);
            const v = uvAttribute.getY(vertexIndex);

            triangle.vertices.push({ u, v });

            // Update mesh bounds
            meshData.bounds.minU = Math.min(meshData.bounds.minU, u);
            meshData.bounds.minV = Math.min(meshData.bounds.minV, v);
            meshData.bounds.maxU = Math.max(meshData.bounds.maxU, u);
            meshData.bounds.maxV = Math.max(meshData.bounds.maxV, v);
          }

          meshData.triangles.push(triangle);
        }

        // Update global bounds
        uvData.bounds.minU = Math.min(uvData.bounds.minU, meshData.bounds.minU);
        uvData.bounds.minV = Math.min(uvData.bounds.minV, meshData.bounds.minV);
        uvData.bounds.maxU = Math.max(uvData.bounds.maxU, meshData.bounds.maxU);
        uvData.bounds.maxV = Math.max(uvData.bounds.maxV, meshData.bounds.maxV);

        if (meshData.triangles.length > 0) {
          uvData.meshes.push(meshData);
        }
      }
    }
  });

  return uvData;
}

// Generate UV layout for procedural geometries (bottle, box)
export function generateProceduralUV(modelType) {
  const uvData = {
    meshes: [],
    bounds: { minU: 0, minV: 0, maxU: 1, maxV: 1 },
  };

  if (modelType === "bottle") {
    // Cylinder UV layout - unwrapped
    const segments = 40;
    const meshData = {
      name: "bottle_body",
      triangles: [],
      bounds: { minU: 0, minV: 0, maxU: 1, maxV: 1 },
    };

    // Create cylinder unwrap visualization
    for (let i = 0; i < segments; i++) {
      const u1 = i / segments;
      const u2 = (i + 1) / segments;
      
      meshData.triangles.push({
        vertices: [
          { u: u1, v: 0 },
          { u: u2, v: 0 },
          { u: u1, v: 1 },
        ],
      });
      meshData.triangles.push({
        vertices: [
          { u: u2, v: 0 },
          { u: u2, v: 1 },
          { u: u1, v: 1 },
        ],
      });
    }

    uvData.meshes.push(meshData);
  } else if (modelType === "box") {
    // Box UV layout - 6 faces
    const faces = [
      { name: "front", u: 0.25, v: 0.33, width: 0.25, height: 0.33 },
      { name: "back", u: 0.75, v: 0.33, width: 0.25, height: 0.33 },
      { name: "top", u: 0.25, v: 0, width: 0.25, height: 0.33 },
      { name: "bottom", u: 0.25, v: 0.66, width: 0.25, height: 0.33 },
      { name: "left", u: 0, v: 0.33, width: 0.25, height: 0.33 },
      { name: "right", u: 0.5, v: 0.33, width: 0.25, height: 0.33 },
    ];

    faces.forEach((face) => {
      const meshData = {
        name: face.name,
        triangles: [
          {
            vertices: [
              { u: face.u, v: face.v },
              { u: face.u + face.width, v: face.v },
              { u: face.u, v: face.v + face.height },
            ],
          },
          {
            vertices: [
              { u: face.u + face.width, v: face.v },
              { u: face.u + face.width, v: face.v + face.height },
              { u: face.u, v: face.v + face.height },
            ],
          },
        ],
        bounds: {
          minU: face.u,
          minV: face.v,
          maxU: face.u + face.width,
          maxV: face.v + face.height,
        },
      };
      uvData.meshes.push(meshData);
    });
  }

  return uvData;
}

// These hooks are kept for potential future use inside Canvas context
// For now, we'll extract UV data directly from model references
export function useShirtUVData() {
  const { scene } = useGLTF("/3d-models/t_shirt.glb");
  
  return useMemo(() => {
    const cloned = scene.clone();
    return extractUVData(cloned);
  }, [scene]);
}

export function useCupUVData() {
  const obj = useLoader(OBJLoader, "/3d-models/cup.obj");
  
  return useMemo(() => {
    const cloned = obj.clone();
    return extractUVData(cloned);
  }, [obj]);
}

export function useProceduralUVData(modelType) {
  return useMemo(() => {
    return generateProceduralUV(modelType);
  }, [modelType]);
}

