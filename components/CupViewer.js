"use client";

import { useMemo, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Environment } from "@react-three/drei";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";

function CupModel() {
  const obj = useLoader(OBJLoader, "/3d-models/Tea_Mug.obj");
  
  // Clone the object to avoid mutating the original
  const clonedObj = useMemo(() => {
    const cloned = obj.clone();
    
    // Calculate bounding box to center the model
    const box = new THREE.Box3().setFromObject(cloned);
    const center = box.getCenter(new THREE.Vector3());
    
    // Center the model at origin
    cloned.position.x = -center.x;
    cloned.position.y = -center.y;
    cloned.position.z = -center.z;
    
    return cloned;
  }, [obj]);
  
  // Apply material to all meshes in the model
  useEffect(() => {
    clonedObj.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        // Create or update material
        if (!child.material || !child.material.isMeshStandardMaterial) {
          child.material = new THREE.MeshStandardMaterial({
            color: "#ffffff",
            roughness: 0.3,
            metalness: 0.05,
          });
        }
      }
    });
  }, [clonedObj]);
  
  return (
    <primitive 
      object={clonedObj} 
      position={[0, 0, 0]}
      scale={[1, 1, 1]}
    />
  );
}

export default function CupViewer() {
  return (
    <div className="aspect-[16/10] rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 1.3, 5]} fov={50} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
        <pointLight position={[-5, 3, -5]} intensity={0.4} />
        <CupModel />
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          enableRotate={true}
          autoRotate={true}
          autoRotateSpeed={1}
          minDistance={3}
          maxDistance={8}
        />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}

