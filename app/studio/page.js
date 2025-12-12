"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useLoader } from "@react-three/fiber";
import { Environment, OrbitControls, PerspectiveCamera, useGLTF } from "@react-three/drei";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import Link from "next/link";

const MODEL_OPTIONS = [
  { id: "shirt", label: "T‑Shirt" },
  { id: "cup", label: "Cup" },
  { id: "bottle", label: "Bottle" },
  { id: "box", label: "Box" },
];

function ShirtModel({ logoTexture, baseColor }) {
  const { scene } = useGLTF("/3d-models/t_shirt.glb");
  
  // Clone the scene to avoid mutating the original
  const clonedScene = useMemo(() => {
    const cloned = scene.clone();
    
    // Calculate bounding box to center the model
    const box = new THREE.Box3().setFromObject(cloned);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    // Center the model at origin
    cloned.position.x = -center.x;
    cloned.position.y = -center.y;
    cloned.position.z = -center.z;
    
    return cloned;
  }, [scene]);
  
  // Apply texture and color to all meshes in the model
  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        // Apply texture and color to the material
        if (child.material) {
          // Handle both single material and array of materials
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          
          materials.forEach((material) => {
            if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
              material.color = new THREE.Color(logoTexture ? "#ffffff" : baseColor);
              material.map = logoTexture || null;
              material.needsUpdate = true;
            }
          });
        }
      }
    });
  }, [clonedScene, logoTexture, baseColor]);
  
  return (
    <primitive 
      object={clonedScene} 
      position={[0, 0, 0]}
      scale={[1, 1, 1]}
    />
  );
}

function CupModel({ logoTexture, baseColor }) {
  const obj = useLoader(OBJLoader, "/3d-models/cup.obj");
  
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
  
  // Apply texture and color to all meshes in the model
  useEffect(() => {
    clonedObj.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        // Create or update material
        if (!child.material || !child.material.isMeshStandardMaterial) {
          child.material = new THREE.MeshStandardMaterial({
            color: logoTexture ? "#ffffff" : baseColor,
            roughness: 0.3,
            metalness: 0.05,
            map: logoTexture || null,
          });
        } else {
          // Update existing material
          child.material.color = new THREE.Color(logoTexture ? "#ffffff" : baseColor);
          child.material.map = logoTexture || null;
          child.material.needsUpdate = true;
        }
      }
    });
  }, [clonedObj, logoTexture, baseColor]);
  
  return (
    <primitive 
      object={clonedObj} 
      position={[0, 0, 0]}
      scale={[1, 1, 1]}
    />
  );
}

function BottleModel({ logoTexture, baseColor }) {
  return (
    <group position={[0, 0, 0]}>
      {/* Body */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.7, 0.7, 2.4, 40]} />
        <meshStandardMaterial
          color={logoTexture ? "#ffffff" : baseColor}
          roughness={0.35}
          metalness={0.15}
          map={logoTexture || null}
          transparent={false}
        />
      </mesh>
      {/* Shoulder */}
      <mesh position={[0, 1.4, 0]}>
        <sphereGeometry args={[0.65, 32, 24]} />
        <meshStandardMaterial color={baseColor} roughness={0.35} metalness={0.15} />
      </mesh>
      {/* Neck */}
      <mesh position={[0, 2.0, 0]}>
        <cylinderGeometry args={[0.23, 0.23, 0.7, 24]} />
        <meshStandardMaterial color={baseColor} roughness={0.35} metalness={0.15} />
      </mesh>
      {/* Cap */}
      <mesh position={[0, 2.5, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.2, 24]} />
        <meshStandardMaterial color="#e5e7eb" roughness={0.5} metalness={0.1} />
      </mesh>
    </group>
  );
}

function BoxModel({ logoTexture, baseColor }) {
  return (
    <group position={[0, 0, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.0, 1.4, 1.5]} />
        <meshStandardMaterial
          color={logoTexture ? "#ffffff" : baseColor}
          roughness={0.6}
          metalness={0.05}
          map={logoTexture || null}
          transparent={false}
        />
      </mesh>
    </group>
  );
}

function ProductScene({ selectedModel, logoTexture, baseColor, autoRotate }) {
  const components = {
    shirt: ShirtModel,
    cup: CupModel,
    bottle: BottleModel,
    box: BoxModel,
  };

  const SelectedModel = components[selectedModel] || ShirtModel;

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 1.3, 5]} fov={48} />
      <OrbitControls enablePan enableZoom autoRotate={autoRotate} autoRotateSpeed={1.1} />

      <ambientLight intensity={0.6} />
      <directionalLight
        position={[4, 6, 4]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[-4, 3, -4]} intensity={0.4} />

      <SelectedModel logoTexture={logoTexture} baseColor={baseColor} />

      <Environment preset="studio" />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.0, 0]}
        receiveShadow
      >
        <planeGeometry args={[20, 20]} />
        <shadowMaterial opacity={0.22} />
      </mesh>
    </>
  );
}

export default function StudioPage() {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [logoImage, setLogoImage] = useState(null);
  const [logoTexture, setLogoTexture] = useState(null);
  const [logoPosition, setLogoPosition] = useState({ x: 0, y: 0 });
  const [logoScale, setLogoScale] = useState(1);
  const [selectedModel, setSelectedModel] = useState("shirt");
  const [baseColor, setBaseColor] = useState("#ffffff");
  const [autoRotate, setAutoRotate] = useState(false);

  const fileInputRef = useRef(null);

  const regenerateTexture = useCallback(
    (img) => {
      if (!img) {
        setLogoTexture(null);
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext("2d");

      // Use base color as background, image will be drawn on top
      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const maxWidth = canvas.width * 0.65 * logoScale;
      const targetWidth = maxWidth;
      const targetHeight = (img.height / img.width) * targetWidth;

      const offsetX = logoPosition.x * canvas.width * 0.3;
      const offsetY = logoPosition.y * canvas.height * 0.3;
      const x = canvas.width / 2 - targetWidth / 2 + offsetX;
      const y = canvas.height / 2 - targetHeight / 2 + offsetY;

      ctx.drawImage(img, x, y, targetWidth, targetHeight);

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.flipY = false;
      texture.needsUpdate = true;
      setLogoTexture(texture);
    },
    [logoPosition, logoScale, baseColor]
  );

  useEffect(() => {
    regenerateTexture(logoImage);
  }, [logoImage, logoPosition, logoScale, regenerateTexture]);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setLogoImage(img);
        setUploadedImage(event.target?.result ?? null);
        setLogoPosition({ x: 0, y: 0 });
        setLogoScale(1);
      };
      img.src = event.target?.result ?? "";
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setUploadedImage(null);
    setLogoImage(null);
    setLogoTexture(null);
    setLogoPosition({ x: 0, y: 0 });
    setLogoScale(1);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 text-sm sm:text-base">
            <span className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-sky-500 via-cyan-400 to-emerald-400 shadow-md shadow-sky-500/40 flex items-center justify-center text-[11px] font-bold">
              M3D
            </span>
            <span className="font-medium text-slate-100">Mockup 3D Studio</span>
          </Link>
          <span className="text-xs sm:text-sm text-slate-400">
            Drag &amp; drop artwork onto your products
          </span>
        </div>
      </header>

      <section className="flex-1 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(56,189,248,0.08),_transparent_55%)]">
        <div className="max-w-7xl mx-auto px-6 py-8 grid gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          {/* Left controls */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/50">
              <h2 className="text-base font-semibold mb-3">Upload artwork</h2>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/40 hover:bg-sky-400 transition flex items-center justify-center gap-2"
              >
                Choose image
              </button>

              {uploadedImage ? (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-400 font-medium">
                      Image ready
                    </span>
                    <button
                      onClick={removeImage}
                      className="text-slate-400 hover:text-red-300 underline underline-offset-2"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                    <img
                      src={uploadedImage}
                      alt="Artwork preview"
                      className="h-40 w-full object-contain"
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-3 space-y-1">
                  <p className="text-[11px] text-slate-400">
                    PNG, JPG or SVG. Transparent backgrounds work best.
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Recommended: 1024×1024px or larger (square format preferred)
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-5">
              <div>
                <div className="flex items-center justify-between text-xs sm:text-[13px] mb-1">
                  <span className="font-medium text-slate-200">
                    Horizontal position
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">
                    {logoPosition.x.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.02}
                  value={logoPosition.x}
                  onChange={(e) =>
                    setLogoPosition((prev) => ({
                      ...prev,
                      x: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-sky-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs sm:text-[13px] mb-1">
                  <span className="font-medium text-slate-200">
                    Vertical position
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">
                    {logoPosition.y.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.02}
                  value={logoPosition.y}
                  onChange={(e) =>
                    setLogoPosition((prev) => ({
                      ...prev,
                      y: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-sky-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs sm:text-[13px] mb-1">
                  <span className="font-medium text-slate-200">
                    Artwork scale
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">
                    {logoScale.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min={0.4}
                  max={1.8}
                  step={0.05}
                  value={logoScale}
                  onChange={(e) => setLogoScale(parseFloat(e.target.value))}
                  className="w-full accent-sky-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs sm:text-[13px] mb-2">
                  <span className="font-medium text-slate-200">Base color</span>
                  <span className="font-mono text-[11px] text-slate-400">
                    {baseColor}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={baseColor}
                    onChange={(e) => setBaseColor(e.target.value)}
                    className="h-10 w-10 rounded-lg border border-slate-700 bg-slate-900 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={baseColor}
                    onChange={(e) => setBaseColor(e.target.value)}
                    className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-mono text-slate-100"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-[11px] sm:text-xs text-slate-400">
                Tip: for best results, use high‑resolution artwork and solid
                background colors that match your product.
              </p>
            </div>
          </div>

          {/* Right viewer */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Choose product</h2>
                <p className="text-[11px] sm:text-xs text-slate-400">
                  Click a product to preview your design on it.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRotate}
                  onChange={(e) => setAutoRotate(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500 focus:ring-offset-slate-950"
                />
                <span className="text-xs sm:text-sm text-slate-300">
                  Auto rotate
                </span>
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {MODEL_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSelectedModel(option.id)}
                  className={`rounded-xl border px-3.5 py-2.5 text-[11px] sm:text-xs font-medium transition ${
                    selectedModel === option.id
                      ? "border-sky-400 bg-sky-500/15 text-sky-100 shadow-[0_0_0_1px_rgba(56,189,248,0.5)]"
                      : "border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-600"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="relative h-[540px] rounded-[2rem] border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 shadow-2xl shadow-black/60 overflow-hidden">
              <Canvas
                shadows
                dpr={[1, 2]}
                gl={{ preserveDrawingBuffer: true }}
              >
                <ProductScene
                  selectedModel={selectedModel}
                  logoTexture={logoTexture}
                  baseColor={baseColor}
                  autoRotate={autoRotate}
                />
              </Canvas>

              {!uploadedImage && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="rounded-2xl bg-slate-950/80 px-6 py-4 border border-slate-800 text-center">
                    <p className="text-sm font-semibold text-slate-100">
                      Upload artwork to start
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Use the panel on the left to add an image and position it.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}


