"use client";

import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { Canvas, useLoader } from "@react-three/fiber";
import { PerspectiveCamera, OrbitControls, useGLTF, Bounds } from "@react-three/drei";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";

// Centers and scales an Object3D so its bounding box is at the world origin
// and its largest dimension equals targetSize.
// Uses updateWorldMatrix so nested hierarchies (GLB, FBX) are handled correctly.
function centerAndScale(object, targetSize = 1.6) {
  // Force world matrices to be computed even without a scene
  object.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return;

  // Step 1: shift so bounding-box center sits at world origin
  const center = box.getCenter(new THREE.Vector3());
  object.position.sub(center);

  // Step 2: scale so the longest axis equals targetSize
  object.updateWorldMatrix(true, true);
  const box2 = new THREE.Box3().setFromObject(object);
  const size = box2.getSize(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z) || 1;
  object.scale.setScalar(targetSize / maxSize);

  // Step 3: re-center after scale (scaling around the pivot shifts the center)
  object.updateWorldMatrix(true, true);
  const box3 = new THREE.Box3().setFromObject(object);
  const finalCenter = box3.getCenter(new THREE.Vector3());
  object.position.x -= finalCenter.x;
  object.position.y -= finalCenter.y;
  object.position.z -= finalCenter.z;
}

function CenteredOBJ({ file }) {
  const obj = useLoader(OBJLoader, file);

  const centered = useMemo(() => {
    const cloned = obj.clone();
    centerAndScale(cloned);
    return cloned;
  }, [obj]);

  return <primitive object={centered} />;
}

function CenteredGLB({ file }) {
  const { scene } = useGLTF(file, true);

  const centered = useMemo(() => {
    const cloned = scene.clone();
    centerAndScale(cloned);
    return cloned;
  }, [scene]);

  return <primitive object={centered} />;
}

function CenteredFBX({ file }) {
  const fbx = useLoader(FBXLoader, file);

  const centered = useMemo(() => {
    const cloned = fbx.clone();
    centerAndScale(cloned);
    return cloned;
  }, [fbx]);

  return <primitive object={centered} />;
}

function CenteredSTL({ file }) {
  const geometry = useLoader(STLLoader, file);

  const stlGroup = useMemo(() => {
    const geo = geometry.clone();
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color: "#cccccc", roughness: 0.4, metalness: 0.1 });
    const mesh = new THREE.Mesh(geo, mat);
    const group = new THREE.Group();
    group.add(mesh);
    centerAndScale(group);
    return group;
  }, [geometry]);

  return <primitive object={stlGroup} />;
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
      <Bounds fit clip observe margin={1.2}>
        {type === "obj" && <CenteredOBJ file={file} />}
        {(type === "glb" || type === "gltf") && <CenteredGLB file={file} />}
        {type === "fbx" && <CenteredFBX file={file} />}
        {type === "stl" && <CenteredSTL file={file} />}
        {!type && <CenteredOBJ file={file} />}
      </Bounds>
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate
        autoRotateSpeed={1.2}
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
