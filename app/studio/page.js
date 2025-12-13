"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import * as THREE from "three";
import { Canvas, useLoader } from "@react-three/fiber";
import { Environment, OrbitControls, PerspectiveCamera, useGLTF } from "@react-three/drei";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import UVEditor from "@/components/UVEditor";
import UVEditorModal from "@/components/UVEditorModal";
import ModelUVDataLoader from "@/components/ModelUVDataLoader";
import { MODEL_FILES, getModelById, getModelsByCategory } from "./modelMapping";

const MODEL_OPTIONS = [
  { id: "shirt", label: "T‑Shirt", icon: "👕" },
  { id: "cup", label: "Cup", icon: "☕" },
  { id: "bottle", label: "Bottle", icon: "🍼" },
  { id: "box", label: "Box", icon: "📦" },
];

// Generate MODEL_VARIATIONS from MODEL_FILES
const MODEL_VARIATIONS = {};
Object.keys(MODEL_FILES).forEach(category => {
  MODEL_VARIATIONS[category] = MODEL_FILES[category].map(model => ({
    id: model.id,
    name: model.name,
    description: model.description,
  }));
});

function ShirtModel({ logoTexture, baseColor }) {
  // Enable caching for better performance
  const { scene } = useGLTF("/3d-models/t_shirt.glb", true);
  
  const clonedScene = useMemo(() => {
    const cloned = scene.clone();
    
    // Calculate bounding box only for visible meshes
    const box = new THREE.Box3();
    let hasVisibleMeshes = false;
    let boxInitialized = false;
    
    cloned.traverse((child) => {
      if (child.isMesh && child.visible !== false) {
        const childBox = new THREE.Box3().setFromObject(child);
        if (childBox.isEmpty() === false) {
          if (!boxInitialized) {
            box.copy(childBox);
            boxInitialized = true;
          } else {
            box.expandByPoint(childBox.min);
            box.expandByPoint(childBox.max);
          }
          hasVisibleMeshes = true;
        }
      }
    });
    
    // Center the model based on visible meshes
    if (hasVisibleMeshes) {
      const center = box.getCenter(new THREE.Vector3());
    cloned.position.x = -center.x;
    cloned.position.y = -center.y;
    cloned.position.z = -center.z;
    } else {
      // Fallback: center based on all meshes
      const fallbackBox = new THREE.Box3().setFromObject(cloned);
      const center = fallbackBox.getCenter(new THREE.Vector3());
      cloned.position.x = -center.x;
      cloned.position.y = -center.y;
      cloned.position.z = -center.z;
    }
    
    return cloned;
  }, [scene]);
  
  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
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
  
  return <primitive object={clonedScene} position={[0, 0, 0]} scale={[1, 1, 1]} />;
}

function CupModel({ logoTexture, baseColor }) {
  const obj = useLoader(OBJLoader, "/3d-models/Tea_Mug.obj");
  
  const clonedObj = useMemo(() => {
    const cloned = obj.clone();
    
    // Calculate bounding box only for visible meshes
    const box = new THREE.Box3();
    let hasVisibleMeshes = false;
    let boxInitialized = false;
    
    cloned.traverse((child) => {
      if (child.isMesh && child.visible !== false) {
        const childBox = new THREE.Box3().setFromObject(child);
        if (childBox.isEmpty() === false) {
          if (!boxInitialized) {
            box.copy(childBox);
            boxInitialized = true;
          } else {
            box.expandByPoint(childBox.min);
            box.expandByPoint(childBox.max);
          }
          hasVisibleMeshes = true;
        }
      }
    });
    
    // Center the model based on visible meshes
    if (hasVisibleMeshes) {
      const center = box.getCenter(new THREE.Vector3());
    cloned.position.x = -center.x;
    cloned.position.y = -center.y;
    cloned.position.z = -center.z;
    } else {
      // Fallback: center based on all meshes
      const fallbackBox = new THREE.Box3().setFromObject(cloned);
      const center = fallbackBox.getCenter(new THREE.Vector3());
      cloned.position.x = -center.x;
      cloned.position.y = -center.y;
      cloned.position.z = -center.z;
    }
    
    return cloned;
  }, [obj]);
  
  useEffect(() => {
    clonedObj.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (!child.material || !child.material.isMeshStandardMaterial) {
          child.material = new THREE.MeshStandardMaterial({
            color: logoTexture ? "#ffffff" : baseColor,
            roughness: 0.3,
            metalness: 0.05,
            map: logoTexture || null,
          });
        } else {
          child.material.color = new THREE.Color(logoTexture ? "#ffffff" : baseColor);
          child.material.map = logoTexture || null;
          child.material.needsUpdate = true;
        }
      }
    });
  }, [clonedObj, logoTexture, baseColor]);
  
  return <primitive object={clonedObj} position={[0, 0, 0]} scale={[1, 1, 1]} />;
}

// Loading fallback component for 3D models
function ModelLoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#3b82f6" wireframe />
    </mesh>
  );
}

// Error boundary component for model loading
function ModelErrorFallback({ error }) {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#ef4444" />
    </mesh>
  );
}

// Dynamic OBJ Model Loader Component with Component Selection
function DynamicOBJModel({ filePath, logoTexture, baseColor, selectedGroupName = null }) {
  // useLoader handles URL encoding automatically, so we can use the path directly
  const obj = useLoader(OBJLoader, filePath);
  
  const clonedObj = useMemo(() => {
    const cloned = obj.clone();
    
    // If a specific group is selected, filter by group name
    if (selectedGroupName) {
      // OBJLoader may organize groups differently
      // We'll check multiple possible locations for group information
      let foundMatch = false;
      
      cloned.traverse((child) => {
        if (child.isGroup) {
          // Check if this group's name matches
          const groupName = child.name || "";
          const matches = groupName.toLowerCase().includes(selectedGroupName.toLowerCase());
          child.visible = matches;
          if (matches) foundMatch = true;
          
          // Also check children meshes
          child.children.forEach((mesh) => {
            if (mesh.isMesh) {
              mesh.visible = matches;
            }
          });
        } else if (child.isMesh) {
          // Check mesh name, userData, and parent for group information
          const meshName = child.name || "";
          const userDataGroup = child.userData?.groupNames?.[0] || 
                               child.userData?.groupName || "";
          const parentName = child.parent?.name || "";
          const parentUserData = child.parent?.userData?.groupNames?.[0] ||
                               child.parent?.userData?.groupName || "";
          
          // Normalize group name for comparison (remove "cup " prefix if present)
          const normalizedSelected = selectedGroupName.toLowerCase().replace(/^cup\s+/, "");
          
          // Check if mesh belongs to selected group
          const matches = 
            meshName.toLowerCase().includes(normalizedSelected) ||
            userDataGroup.toLowerCase().includes(normalizedSelected) ||
            parentName.toLowerCase().includes(normalizedSelected) ||
            parentUserData.toLowerCase().includes(normalizedSelected) ||
            // Also check for exact group name matches
            meshName.toLowerCase().includes(selectedGroupName.toLowerCase()) ||
            userDataGroup.toLowerCase().includes(selectedGroupName.toLowerCase()) ||
            parentName.toLowerCase().includes(selectedGroupName.toLowerCase());
          
          child.visible = matches;
          if (matches) foundMatch = true;
        }
      });
      
      // If no matches found, show all (fallback)
      if (!foundMatch) {
        cloned.traverse((child) => {
          if (child.isMesh || child.isGroup) {
            child.visible = true;
          }
        });
      }
    } else {
      // Show all components
      cloned.traverse((child) => {
        if (child.isMesh || child.isGroup) {
          child.visible = true;
        }
      });
    }
    
    // Calculate bounding box only for visible meshes
    const box = new THREE.Box3();
    let hasVisibleMeshes = false;
    let boxInitialized = false;
    
    cloned.traverse((child) => {
      if (child.isMesh && child.visible) {
        const childBox = new THREE.Box3().setFromObject(child);
        if (childBox.isEmpty() === false) {
          if (!boxInitialized) {
            box.copy(childBox);
            boxInitialized = true;
          } else {
            box.expandByPoint(childBox.min);
            box.expandByPoint(childBox.max);
          }
          hasVisibleMeshes = true;
        }
      }
    });
    
    // Center the model based on visible meshes
    if (hasVisibleMeshes) {
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxSize = Math.max(size.x, size.y, size.z);
      
      // Scale down if model is too large (e.g., paper_cup.obj might be in a different unit system)
      let scaleFactor = 1;
      if (maxSize > 200) {
        // If model is very large, scale it down
        scaleFactor = 200 / maxSize;
        cloned.scale.multiplyScalar(scaleFactor);
        // Recalculate bounding box after scaling
        box.setFromObject(cloned);
        const newCenter = box.getCenter(new THREE.Vector3());
        cloned.position.x = -newCenter.x;
        cloned.position.y = -newCenter.y;
        cloned.position.z = -newCenter.z;
      } else {
        cloned.position.x = -center.x;
        cloned.position.y = -center.y;
        cloned.position.z = -center.z;
      }
    } else {
      // Fallback: center based on all meshes
      const fallbackBox = new THREE.Box3().setFromObject(cloned);
      const center = fallbackBox.getCenter(new THREE.Vector3());
      const size = fallbackBox.getSize(new THREE.Vector3());
      const maxSize = Math.max(size.x, size.y, size.z);
      
      // Scale down if model is too large
      if (maxSize > 200) {
        const scaleFactor = 200 / maxSize;
        cloned.scale.multiplyScalar(scaleFactor);
        const newBox = new THREE.Box3().setFromObject(cloned);
        const newCenter = newBox.getCenter(new THREE.Vector3());
        cloned.position.x = -newCenter.x;
        cloned.position.y = -newCenter.y;
        cloned.position.z = -newCenter.z;
      } else {
        cloned.position.x = -center.x;
        cloned.position.y = -center.y;
        cloned.position.z = -center.z;
      }
    }
    
    return cloned;
  }, [obj, selectedGroupName]);
  
  useEffect(() => {
    clonedObj.traverse((child) => {
      if (child.isMesh && child.visible) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (!child.material || !child.material.isMeshStandardMaterial) {
          child.material = new THREE.MeshStandardMaterial({
            color: logoTexture ? "#ffffff" : baseColor,
            roughness: 0.3,
            metalness: 0.05,
            map: logoTexture || null,
          });
        } else {
          child.material.color = new THREE.Color(logoTexture ? "#ffffff" : baseColor);
          child.material.map = logoTexture || null;
          child.material.needsUpdate = true;
        }
      }
    });
  }, [clonedObj, logoTexture, baseColor]);
  
  return <primitive object={clonedObj} position={[0, 0, 0]} scale={[1, 1, 1]} />;
}

// Dynamic GLB Model Loader Component
function DynamicGLBModel({ filePath, logoTexture, baseColor }) {
  // Use useGLTF with caching enabled for better performance
  const { scene } = useGLTF(filePath, true);
  
  const clonedScene = useMemo(() => {
    const cloned = scene.clone();
    
    // Calculate bounding box only for visible meshes
    const box = new THREE.Box3();
    let hasVisibleMeshes = false;
    let boxInitialized = false;
    
    cloned.traverse((child) => {
      if (child.isMesh && child.visible !== false) {
        const childBox = new THREE.Box3().setFromObject(child);
        if (childBox.isEmpty() === false) {
          if (!boxInitialized) {
            box.copy(childBox);
            boxInitialized = true;
          } else {
            box.expandByPoint(childBox.min);
            box.expandByPoint(childBox.max);
          }
          hasVisibleMeshes = true;
        }
      }
    });
    
    // Center the model based on visible meshes
    if (hasVisibleMeshes) {
      const center = box.getCenter(new THREE.Vector3());
      cloned.position.x = -center.x;
      cloned.position.y = -center.y;
      cloned.position.z = -center.z;
    } else {
      // Fallback: center based on all meshes
      const fallbackBox = new THREE.Box3().setFromObject(cloned);
      const center = fallbackBox.getCenter(new THREE.Vector3());
      cloned.position.x = -center.x;
      cloned.position.y = -center.y;
      cloned.position.z = -center.z;
    }
    
    return cloned;
  }, [scene]);
  
  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
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
  
  return <primitive object={clonedScene} position={[0, 0, 0]} scale={[1, 1, 1]} />;
}

function BottleModel({ logoTexture, baseColor }) {
  return (
    <group position={[0, 0, 0]}>
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
      <mesh position={[0, 1.4, 0]}>
        <sphereGeometry args={[0.65, 32, 24]} />
        <meshStandardMaterial color={baseColor} roughness={0.35} metalness={0.15} />
      </mesh>
      <mesh position={[0, 2.0, 0]}>
        <cylinderGeometry args={[0.23, 0.23, 0.7, 24]} />
        <meshStandardMaterial color={baseColor} roughness={0.35} metalness={0.15} />
      </mesh>
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

function ProductScene({ selectedModel, selectedVariation, logoTexture, baseColor, autoRotate, selectedComponent }) {
  // Get model file info from mapping
  const modelInfo = useMemo(() => {
    if (selectedVariation) {
      return getModelById(selectedVariation);
    }
    // Fallback to first model in category if no variation selected
    const categoryModels = getModelsByCategory(selectedModel);
    return categoryModels[0] || null;
  }, [selectedModel, selectedVariation]);
  
  // Get selected component group name if component is selected
  const componentGroupName = useMemo(() => {
    if (modelInfo?.components && selectedComponent) {
      const component = modelInfo.components.find(c => c.id === selectedComponent);
      return component?.groupName || null;
    }
    return null;
  }, [modelInfo, selectedComponent]);
  
  // Calculate appropriate camera distance based on model
  const cameraDistance = useMemo(() => {
    // If paper_cup model, use a larger distance to avoid being inside
    if (modelInfo?.file?.includes('paper_cup')) {
      return 8;
    }
    return 5;
  }, [modelInfo]);

  // Render model based on file type with Suspense for async loading
  const renderModel = () => {
    if (!modelInfo) {
      // Fallback to default models
  const components = {
    shirt: ShirtModel,
    cup: CupModel,
    bottle: BottleModel,
    box: BoxModel,
  };
      const DefaultModel = components[selectedModel] || ShirtModel;
      return (
        <Suspense fallback={<ModelLoadingFallback />}>
          <DefaultModel logoTexture={logoTexture} baseColor={baseColor} />
        </Suspense>
      );
    }

    // Use dynamic loader based on file type
    if (modelInfo.type === "obj") {
      return (
        <Suspense fallback={<ModelLoadingFallback />}>
          <DynamicOBJModel 
            filePath={modelInfo.file} 
            logoTexture={logoTexture} 
            baseColor={baseColor}
            selectedGroupName={componentGroupName}
          />
        </Suspense>
      );
    } else if (modelInfo.type === "glb" || modelInfo.type === "gltf") {
      return (
        <Suspense fallback={<ModelLoadingFallback />}>
          <DynamicGLBModel filePath={modelInfo.file} logoTexture={logoTexture} baseColor={baseColor} />
        </Suspense>
      );
    }

    // Fallback
  return (
      <Suspense fallback={<ModelLoadingFallback />}>
        <CupModel logoTexture={logoTexture} baseColor={baseColor} />
      </Suspense>
    );
  };

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, cameraDistance]} fov={48} />
      <OrbitControls 
        enablePan 
        enableZoom 
        autoRotate={autoRotate} 
        autoRotateSpeed={1.1}
        target={[0, 0, 0]}
        minDistance={0.5}
        maxDistance={50}
        zoomSpeed={1.2}
      />
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[4, 6, 4]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[-4, 3, -4]} intensity={0.4} />
      {renderModel()}
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

function StudioPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlModel = searchParams.get("model");
  const urlVariation = searchParams.get("variation");

  const [logoImages, setLogoImages] = useState([]);
  const [logoTexture, setLogoTexture] = useState(null);
  const [uvPositions, setUvPositions] = useState([]);
  const [uvScales, setUvScales] = useState([]);
  const [isUVModalOpen, setIsUVModalOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(urlModel || "shirt");
  const [selectedVariation, setSelectedVariation] = useState(urlVariation || null);
  const [selectedComponent, setSelectedComponent] = useState(null); // For multi-component models
  const [baseColor, setBaseColor] = useState("#ffffff");
  const [autoRotate, setAutoRotate] = useState(false);
  const [activeTab, setActiveTab] = useState("edit"); // "edit" or "model"


  useEffect(() => {
    if (urlModel) {
      setSelectedModel(urlModel);
    }
    if (urlVariation) {
      setSelectedVariation(urlVariation);
    }
  }, [urlModel, urlVariation]);

  const regenerateTexture = useCallback(
    (images, positions, scales) => {
      if (!images || images.length === 0) {
        setLogoTexture(null);
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw all images
      images.forEach((img, index) => {
        const pos = positions[index] || { u: 0.5, v: 0.5 };
        const scale = scales[index] || { u: 0.3, v: 0.3 };

        const baseWidth = canvas.width * scale.u;
        const baseHeight = canvas.height * scale.v;
        const imageAspect = img.width / img.height;
        const baseAspect = baseWidth / baseHeight;
        
        let targetWidth, targetHeight;
        if (imageAspect > baseAspect) {
          targetWidth = baseWidth;
          targetHeight = baseWidth / imageAspect;
        } else {
          targetHeight = baseHeight;
          targetWidth = baseHeight * imageAspect;
        }
        
        const x = canvas.width * pos.u - targetWidth / 2;
        const y = canvas.height * (1 - pos.v) - targetHeight / 2;

        ctx.drawImage(img, x, y, targetWidth, targetHeight);
      });

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.flipY = true;
      texture.needsUpdate = true;
      setLogoTexture(texture);
    },
    [baseColor]
  );

  useEffect(() => {
    regenerateTexture(logoImages, uvPositions, uvScales);
  }, [logoImages, uvPositions, uvScales, regenerateTexture]);


  const handleModelChange = (modelId, variationId) => {
    setSelectedModel(modelId);
    setSelectedVariation(variationId);
    setSelectedComponent(null); // Reset component selection when changing models
    router.push(`/studio?model=${modelId}&variation=${variationId || ""}`);
  };

  const currentVariations = MODEL_VARIATIONS[selectedModel] || [];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 text-sm sm:text-base">
            <span className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-sky-500 via-cyan-400 to-emerald-400 shadow-md shadow-sky-500/40 flex items-center justify-center text-[11px] font-bold">
              M3D
            </span>
            <div>
            <span className="font-medium text-slate-100">Mockup 3D Studio</span>
              {selectedVariation && (
                <span className="ml-2 text-xs text-slate-400">
                  • {selectedVariation.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase())}
          </span>
              )}
            </div>
          </Link>
          <Link
            href="/models"
            className="text-xs sm:text-sm text-slate-400 hover:text-sky-400 transition"
          >
            ← Back to Models
          </Link>
        </div>
      </header>

      <section className="flex-1 relative bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(56,189,248,0.08),_transparent_55%)]">
        {/* Left Floating Navbar */}
        <div className="fixed left-4 top-1/2 -translate-y-1/2 z-40 hidden lg:block">
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800/50 rounded-2xl p-2 shadow-2xl shadow-black/50">
            <nav className="flex flex-col gap-2">
              <button
                onClick={() => setActiveTab("edit")}
                className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                  activeTab === "edit"
                    ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-950 shadow-lg shadow-sky-500/50 scale-105"
                    : "text-slate-300 hover:bg-slate-800/50 hover:text-slate-100"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
              <button
                onClick={() => setActiveTab("model")}
                className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                  activeTab === "model"
                    ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-950 shadow-lg shadow-sky-500/50 scale-105"
                    : "text-slate-300 hover:bg-slate-800/50 hover:text-slate-100"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Change Model
              </button>
            </nav>
          </div>
        </div>

        {/* Mobile Navbar */}
        <div className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800/50 rounded-2xl p-2 shadow-2xl shadow-black/50">
            <nav className="flex gap-2">
              <button
                onClick={() => setActiveTab("edit")}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                  activeTab === "edit"
                    ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-950 shadow-lg shadow-sky-500/50"
                    : "text-slate-300 hover:bg-slate-800/50"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
              <button
                onClick={() => setActiveTab("model")}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                  activeTab === "model"
                    ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-950 shadow-lg shadow-sky-500/50"
                    : "text-slate-300 hover:bg-slate-800/50"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Change Model
              </button>
            </nav>
          </div>
        </div>

        {/* Left Panel */}
        <div className="fixed left-52 top-1/2 -translate-y-1/2 z-30 w-80 max-h-[80vh] overflow-y-auto hidden lg:block custom-scrollbar">
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800/50 rounded-2xl p-6 shadow-2xl shadow-black/50">
            {activeTab === "edit" ? (
              <div className="space-y-6">
                {/* UV Mapping */}
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
                        </svg>
              </div>
                      <h3 className="text-lg font-bold text-slate-100">UV Mapping</h3>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                  <ModelUVDataLoader selectedModel={selectedModel} selectedVariation={selectedVariation}>
                    {(uvData) => (
                      <UVEditor
                        images={logoImages}
                        uvPositions={uvPositions}
                        uvScales={uvScales}
                        onEditClick={() => setIsUVModalOpen(true)}
                        baseColor={baseColor}
                        uvData={uvData}
                      />
                    )}
                  </ModelUVDataLoader>
                    </div>
                </div>

                {/* Component Selector - Only show for models with components */}
                {(() => {
                  const currentModelInfo = selectedVariation ? getModelById(selectedVariation) : getModelsByCategory(selectedModel)[0];
                  const hasComponents = currentModelInfo?.components && currentModelInfo.components.length > 0;
                  
                  if (hasComponents) {
                    return (
                      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-bold text-slate-100">Select Component</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {currentModelInfo.components.map((component) => (
                            <button
                              key={component.id}
                              onClick={() => setSelectedComponent(component.id === selectedComponent ? null : component.id)}
                              className={`p-3 rounded-xl border transition-all duration-200 text-left ${
                                selectedComponent === component.id
                                  ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border-emerald-500/50 shadow-lg shadow-emerald-500/20"
                                  : "bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-sm font-semibold ${
                                  selectedComponent === component.id ? "text-emerald-300" : "text-slate-300"
                                }`}>
                                  {component.name}
                                </span>
                                {selectedComponent === component.id && (
                                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Base Color */}
                  <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 rounded-lg bg-pink-500/10 border border-pink-500/20">
                      <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-100">Base color</h3>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-800 bg-slate-950/50">
                    <div className="relative">
                    <input
                        type="color"
                        value={baseColor}
                        onChange={(e) => setBaseColor(e.target.value)}
                        className="h-14 w-14 rounded-xl border-2 border-slate-700 bg-slate-900 cursor-pointer hover:border-sky-500 transition-colors shadow-lg"
                        style={{ backgroundColor: baseColor }}
                      />
                      <div className="absolute inset-0 rounded-xl ring-2 ring-slate-800/50 pointer-events-none"></div>
                  </div>
                    <div className="flex-1">
                    <input
                        type="text"
                        value={baseColor}
                        onChange={(e) => setBaseColor(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-mono text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                        placeholder="#ffffff"
                    />
                  </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-slate-100">Select Model</h2>
                </div>
                <div className="space-y-4">
                  {MODEL_OPTIONS.map((model) => {
                    const categoryModels = getModelsByCategory(model.id);
                    const hasModels = categoryModels.length > 0;
                    
                    return (
                      <div key={model.id} className="space-y-3">
                        <button
                          onClick={() => {
                            setSelectedModel(model.id);
                            setSelectedVariation(null);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all duration-200 group ${
                            selectedModel === model.id
                              ? "border-sky-500 bg-gradient-to-r from-sky-500/20 to-cyan-500/20 text-sky-100 shadow-lg shadow-sky-500/20"
                              : "border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                          }`}
                        >
                          <span className="text-2xl group-hover:scale-110 transition-transform">{model.icon}</span>
                          <span className="font-semibold flex-1 text-left">{model.label}</span>
                          {hasModels && (
                            <span className="text-xs text-slate-400 bg-slate-800/50 px-2 py-1 rounded">
                              {categoryModels.length}
                      </span>
                          )}
                          {selectedModel === model.id && (
                            <svg className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        {selectedModel === model.id && hasModels && (
                          <div className="grid grid-cols-2 gap-3 ml-2 animate-in fade-in slide-in-from-top-2 duration-300">
                            {categoryModels.map((variation) => (
                              <button
                                key={variation.id}
                                onClick={() => handleModelChange(model.id, variation.id)}
                                className={`relative rounded-xl border-2 p-4 transition-all duration-200 group text-left ${
                                  selectedVariation === variation.id
                                    ? "border-sky-500 bg-gradient-to-br from-sky-500/30 to-cyan-500/20 shadow-lg shadow-sky-500/20 scale-105"
                                    : "border-slate-800 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-900 hover:scale-105"
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="text-3xl group-hover:scale-110 transition-transform">
                                    {variation.icon || model.icon}
                    </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-semibold text-slate-200 mb-1 line-clamp-1">
                                      {variation.name}
                                    </h3>
                                    <p className="text-xs text-slate-400 line-clamp-2">
                                      {variation.description}
                                    </p>
                  </div>
                                </div>
                                {selectedVariation === variation.id && (
                                  <div className="absolute top-2 right-2">
                                    <div className="w-5 h-5 rounded-full bg-sky-500 flex items-center justify-center">
                                      <svg className="w-3 h-3 text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </div>
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                        {selectedModel === model.id && !hasModels && (
                          <div className="ml-2 p-3 rounded-xl border border-slate-800 bg-slate-900/50 text-center">
                            <p className="text-xs text-slate-400">No models available yet</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Panel - Slides in from bottom */}
        <div className="lg:hidden fixed bottom-20 left-0 right-0 z-30 max-h-[60vh] overflow-y-auto">
          <div className="bg-slate-900/95 backdrop-blur-sm border-t border-slate-800 rounded-t-2xl p-6 shadow-2xl mx-4 mb-4">
            {activeTab === "edit" ? (
              <div className="space-y-6">
                <div>
                    <h3 className="text-sm font-semibold text-slate-200 mb-3">UV Mapping</h3>
                    <ModelUVDataLoader selectedModel={selectedModel} selectedVariation={selectedVariation}>
                      {(uvData) => (
                        <UVEditor
                          images={logoImages}
                          uvPositions={uvPositions}
                          uvScales={uvScales}
                          onEditClick={() => setIsUVModalOpen(true)}
                          baseColor={baseColor}
                          uvData={uvData}
                        />
                      )}
                    </ModelUVDataLoader>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-200 mb-3">Base color</h3>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={baseColor}
                    onChange={(e) => setBaseColor(e.target.value)}
                      className="h-12 w-12 rounded-lg border border-slate-700 bg-slate-900 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={baseColor}
                    onChange={(e) => setBaseColor(e.target.value)}
                      className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-mono text-slate-100"
                  />
                </div>
              </div>
            </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-base font-semibold mb-4 text-slate-200">Select Model</h2>
                <div className="space-y-3">
                  {MODEL_OPTIONS.map((model) => (
                    <div key={model.id} className="space-y-2">
                      <button
                        onClick={() => {
                          setSelectedModel(model.id);
                          setSelectedVariation(null);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                          selectedModel === model.id
                            ? "border-sky-500 bg-sky-500/15 text-sky-100"
                            : "border-slate-800 bg-slate-900/70 text-slate-300"
                        }`}
                      >
                        <span className="text-2xl">{model.icon}</span>
                        <span className="font-medium">{model.label}</span>
                      </button>
                      {selectedModel === model.id && (
                        <div className="grid grid-cols-3 gap-2 ml-12">
                          {(MODEL_VARIATIONS[model.id] || []).map((variation) => (
                            <button
                              key={variation.id}
                              onClick={() => handleModelChange(model.id, variation.id)}
                              className={`aspect-square rounded-lg border p-2 transition-all ${
                                selectedVariation === variation.id
                                  ? "border-sky-500 bg-sky-500/20"
                                  : "border-slate-800 bg-slate-900/70"
                              }`}
                            >
                              <div className="text-2xl mb-1">{model.icon}</div>
                              <p className="text-[10px] text-slate-400 line-clamp-2">{variation.name}</p>
                            </button>
                          ))}
            </div>
                      )}
          </div>
                  ))}
              </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - 3D Viewer (Full Width) */}
        <div className="ml-0 lg:ml-[36rem] h-[calc(100vh-73px)] pb-20 lg:pb-0">
          <div className="h-full relative">
            <div className="absolute top-4 right-4 z-10">
              <label className="flex items-center gap-2 cursor-pointer bg-slate-900/90 backdrop-blur-md border border-slate-800/50 rounded-xl px-4 py-2.5 shadow-lg hover:bg-slate-900 transition-colors group">
                <input
                  type="checkbox"
                  checked={autoRotate}
                  onChange={(e) => setAutoRotate(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all"
                />
                <span className="text-xs font-medium text-slate-300 group-hover:text-slate-100 transition-colors">Auto rotate</span>
                <svg className={`w-4 h-4 text-sky-400 transition-transform ${autoRotate ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </label>
            </div>
              <Canvas
                shadows
                dpr={[1, 2]}
              gl={{ 
                preserveDrawingBuffer: true,
                antialias: true,
                powerPreference: "high-performance"
              }}
              className="w-full h-full"
            >
              <Suspense fallback={<ModelLoadingFallback />}>
                <ProductScene
                  selectedModel={selectedModel}
                  selectedVariation={selectedVariation}
                  logoTexture={logoTexture}
                  baseColor={baseColor}
                  autoRotate={autoRotate}
                  selectedComponent={selectedComponent}
                />
              </Suspense>
              </Canvas>
              {logoImages.length === 0 && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="rounded-2xl bg-slate-950/90 backdrop-blur-sm px-8 py-6 border border-slate-800/50 text-center shadow-2xl max-w-sm mx-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-sky-500/20 to-cyan-500/20 border border-sky-500/30 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-base font-bold text-slate-100 mb-2">
                      Upload artwork to start
                    </p>
                  <p className="text-xs text-slate-400">
                    Use the panel on the left to add an image and customize your mockup
                    </p>
                  </div>
                </div>
              )}
          </div>
        </div>
      </section>

      {/* UV Editor Modal */}
      <ModelUVDataLoader selectedModel={selectedModel} selectedVariation={selectedVariation}>
        {(uvData) => (
          <UVEditorModal
            isOpen={isUVModalOpen}
            onClose={() => setIsUVModalOpen(false)}
            images={logoImages}
            onImagesChange={setLogoImages}
            uvPositions={uvPositions}
            uvScales={uvScales}
            onPositionsChange={setUvPositions}
            onScalesChange={setUvScales}
            baseColor={baseColor}
            uvData={uvData}
            selectedModel={selectedModel}
            selectedVariation={selectedVariation}
            onTextureUpdate={setLogoTexture}
          />
        )}
      </ModelUVDataLoader>
    </main>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400 mx-auto mb-4"></div>
            <p className="text-slate-400">Loading...</p>
          </div>
        </div>
      </main>
    }>
      <StudioPageContent />
    </Suspense>
  );
}
