"use client";

import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { Canvas, useLoader } from "@react-three/fiber";
import { PerspectiveCamera, OrbitControls, useGLTF } from "@react-three/drei";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";

// Helper function to calculate the visual center (bounding box center) of the object
// This calculates the center in local space for accurate geometric centering
function calculateVisualCenter(object) {
  const box = new THREE.Box3();
  let hasVisibleMeshes = false;
  
  // Calculate bounding box from geometry in local space (relative to object)
  // This ensures we get the true geometric center before any transforms
  object.traverse((child) => {
    if (child.isMesh && child.visible && child.geometry) {
      const geometry = child.geometry;
      
      // Compute bounding box for this geometry if not already computed
      if (!geometry.boundingBox) {
        geometry.computeBoundingBox();
      }
      
      if (geometry.boundingBox && !geometry.boundingBox.isEmpty()) {
        const geometryBox = geometry.boundingBox.clone();
        
        // Get the child's local transform (position, rotation, scale relative to parent)
        const localMatrix = new THREE.Matrix4();
        localMatrix.compose(
          child.position,
          child.quaternion,
          child.scale
        );
        
        // Transform the geometry bounding box by the child's local transform
        geometryBox.applyMatrix4(localMatrix);
        
        if (!hasVisibleMeshes) {
          box.copy(geometryBox);
          hasVisibleMeshes = true;
        } else {
          // Expand box to include this geometry's bounding box
          box.expandByPoint(geometryBox.min);
          box.expandByPoint(geometryBox.max);
        }
      }
    }
  });
  
  // Return the center of the bounding box in local space
  if (hasVisibleMeshes && !box.isEmpty()) {
    return box.getCenter(new THREE.Vector3());
  }
  
  // Fallback: use setFromObject (this works in local space when object is at origin)
  const fallbackBox = new THREE.Box3();
  object.traverse((child) => {
    if (child.isMesh && child.visible) {
      fallbackBox.expandByObject(child);
    }
  });
  
  if (!fallbackBox.isEmpty()) {
    return fallbackBox.getCenter(new THREE.Vector3());
  }
  
  // Last fallback: return origin
  return new THREE.Vector3(0, 0, 0);
}

function CenteredOBJ({ file }) {
  const obj = useLoader(OBJLoader, file);

  const centered = useMemo(() => {
    const cloned = obj.clone();
    
    // Calculate visual center (bounding box center) for accurate centering
    const visualCenter = calculateVisualCenter(cloned);
    
    // Center the model at origin BEFORE scaling
    cloned.position.x = -visualCenter.x;
    cloned.position.y = -visualCenter.y;
    cloned.position.z = -visualCenter.z;
    
    // Calculate bounding box size for scaling (after initial centering)
    const box = new THREE.Box3();
    cloned.traverse((child) => {
      if (child.isMesh && child.visible) {
        box.expandByObject(child);
      }
    });
    
    const size = box.getSize(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z) || 1;
    
    // Scale to fit inside small preview
    const scale = 1.6 / maxSize;
    cloned.scale.setScalar(scale);
    
    // Recalculate center after scaling to ensure model is truly centered at origin
    // This accounts for any numerical precision issues
    const finalBox = new THREE.Box3();
    cloned.traverse((child) => {
      if (child.isMesh && child.visible) {
        finalBox.expandByObject(child);
      }
    });
    
    const finalCenter = finalBox.getCenter(new THREE.Vector3());
    
    // Adjust position to ensure model is centered at origin (0, 0, 0)
    cloned.position.x -= finalCenter.x;
    cloned.position.y -= finalCenter.y;
    cloned.position.z -= finalCenter.z;
    
    return cloned;
  }, [obj]);

  return <primitive object={centered} />;
}

function CenteredGLB({ file }) {
  const { scene } = useGLTF(file, true);

  const centered = useMemo(() => {
    const cloned = scene.clone();
    
    // Calculate visual center (bounding box center) for accurate centering
    const visualCenter = calculateVisualCenter(cloned);
    
    // Center the model at origin BEFORE scaling
    cloned.position.x = -visualCenter.x;
    cloned.position.y = -visualCenter.y;
    cloned.position.z = -visualCenter.z;
    
    // Calculate bounding box size for scaling (after initial centering)
    const box = new THREE.Box3();
    cloned.traverse((child) => {
      if (child.isMesh && child.visible) {
        box.expandByObject(child);
      }
    });
    
    const size = box.getSize(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z) || 1;
    
    // Scale to fit inside small preview
    const scale = 1.6 / maxSize;
    cloned.scale.setScalar(scale);
    
    // Recalculate center after scaling to ensure model is truly centered at origin
    // This accounts for any numerical precision issues
    const finalBox = new THREE.Box3();
    cloned.traverse((child) => {
      if (child.isMesh && child.visible) {
        finalBox.expandByObject(child);
      }
    });
    
    const finalCenter = finalBox.getCenter(new THREE.Vector3());
    
    // Adjust position to ensure model is centered at origin (0, 0, 0)
    cloned.position.x -= finalCenter.x;
    cloned.position.y -= finalCenter.y;
    cloned.position.z -= finalCenter.z;
    
    return cloned;
  }, [scene]);

  return <primitive object={centered} />;
}

function PreviewScene({ model }) {
  const file = model.file;
  const type = model.type;

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 4]} fov={40} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 4, 5]} intensity={0.9} />
      <directionalLight position={[-4, -2, -3]} intensity={0.3} />
      {type === "obj" && <CenteredOBJ file={file} />}
      {(type === "glb" || type === "gltf") && <CenteredGLB file={file} />}
      {!type && <CenteredOBJ file={file} />}
      <OrbitControls 
        enablePan={false} 
        enableZoom={false} 
        autoRotate 
        autoRotateSpeed={1.2}
        target={[0, 0, 0]} // Explicitly target the origin to ensure model stays centered
      />
    </>
  );
}

function PreviewFallback({ icon }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
      <div className="text-4xl opacity-60">{icon}</div>
    </div>
  );
}

export default function ModelPreview({ model }) {
  const icon =
    model.icon ||
    (model.category === "box"
      ? "📦"
      : model.category === "bottle"
      ? "🍼"
      : model.category === "cup"
      ? "☕"
      : model.category === "shirt"
      ? "👕"
      : "📦");

  if (!model.file || !model.type) {
    return (
      <div className="aspect-square border-b border-slate-800 overflow-hidden">
        <PreviewFallback icon={icon} />
      </div>
    );
  }

  return (
    <div className="aspect-square border-b border-slate-800 overflow-hidden bg-slate-900">
      <Suspense fallback={<PreviewFallback icon={icon} />}>
        <Canvas dpr={[1, 2]} gl={{ antialias: true }}>
          <PreviewScene model={model} />
        </Canvas>
      </Suspense>
    </div>
  );
}
