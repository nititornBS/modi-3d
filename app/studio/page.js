"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import * as THREE from "three";
import { Canvas, useLoader } from "@react-three/fiber";
import { Environment, OrbitControls, PerspectiveCamera, useGLTF } from "@react-three/drei";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter";
import { OBJExporter } from "three/examples/jsm/exporters/OBJExporter";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import UVEditor from "@/components/UVEditor";
import UVEditorModal from "@/components/UVEditorModal";
import ModelUVDataLoader from "@/components/ModelUVDataLoader";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { MODEL_FILES, getModelById, getModelsByCategory } from "./modelMapping";

const MODEL_OPTIONS = [
  { id: "shirt", label: "T‑Shirt", icon: "👕" },
  { id: "cup", label: "Cup", icon: "☕" },
  { id: "bottle", label: "Bottle", icon: "🍼" },
  { id: "box", label: "Box", icon: "📦" },
];

// Normalizes any object to a consistent size and centers it at world origin
function normalizeModel(object, targetSize = 2.0) {
  object.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return;

  const center = box.getCenter(new THREE.Vector3());
  object.position.sub(center);

  object.updateWorldMatrix(true, true);
  const box2 = new THREE.Box3().setFromObject(object);
  const size = box2.getSize(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z) || 1;
  object.scale.setScalar(targetSize / maxSize);

  object.updateWorldMatrix(true, true);
  const box3 = new THREE.Box3().setFromObject(object);
  const finalCenter = box3.getCenter(new THREE.Vector3());
  object.position.x -= finalCenter.x;
  object.position.y -= finalCenter.y;
  object.position.z -= finalCenter.z;
}

// Normalize UV coordinates to [0,1] using global bounds across all meshes
function normalizeUVs(object) {
  let minU = Infinity, minV = Infinity, maxU = -Infinity, maxV = -Infinity;
  object.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    const uv = child.geometry.getAttribute("uv");
    if (!uv) return;
    for (let i = 0; i < uv.count; i++) {
      const u = uv.getX(i), v = uv.getY(i);
      if (u < minU) minU = u; if (u > maxU) maxU = u;
      if (v < minV) minV = v; if (v > maxV) maxV = v;
    }
  });
  if (!isFinite(minU)) return;
  // Only normalize if UVs are outside [0,1] range
  if (minU >= 0 && maxU <= 1 && minV >= 0 && maxV <= 1) return;
  const uR = maxU - minU || 1, vR = maxV - minV || 1;
  object.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    const uv = child.geometry.getAttribute("uv");
    if (!uv) return;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, (uv.getX(i) - minU) / uR, (uv.getY(i) - minV) / vR);
    }
    uv.needsUpdate = true;
  });
}

// Generate UV coords for geometry that has none (cylindrical or planar)
function generateUV(geometry) {
  if (geometry.hasAttribute("uv")) return;
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const size = new THREE.Vector3().subVectors(max, min);
  const isCyl = size.y > Math.max(size.x, size.z) * 0.8;
  const pos = geometry.getAttribute("position");
  const uvs = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (isCyl) {
      uvs.push(Math.atan2(z, x) / (2 * Math.PI) + 0.5, 1 - (y - min.y) / size.y);
    } else {
      uvs.push((x - min.x) / size.x, 1 - (y - min.y) / size.y);
    }
  }
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
}

// Replace all mesh materials with MeshStandardMaterial
function applyMaterial(object, baseColor, logoTexture) {
  object.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
    child.material = new THREE.MeshStandardMaterial({
      color: logoTexture ? "#ffffff" : baseColor,
      roughness: 0.3,
      metalness: 0.05,
      map: logoTexture || null,
    });
  });
}

// Generate MODEL_VARIATIONS from MODEL_FILES
const MODEL_VARIATIONS = {};
Object.keys(MODEL_FILES).forEach(category => {
  MODEL_VARIATIONS[category] = MODEL_FILES[category].map(model => ({
    id: model.id,
    name: model.name,
    description: model.description,
  }));
});

function LoadingBox() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#3b82f6" wireframe />
    </mesh>
  );
}

// ── OBJ ──────────────────────────────────────────────────────────────────────
function OBJModel({ filePath, logoTexture, baseColor, groupFilter, onReady }) {
  const obj = useLoader(OBJLoader, filePath);

  const model = useMemo(() => {
    const clone = obj.clone();

    if (groupFilter) {
      let found = false;
      clone.traverse((child) => {
        if (!child.isMesh && !child.isGroup) return;
        const n = [(child.name || ""), (child.parent?.name || "")];
        const match = n.some(s => s.toLowerCase().includes(groupFilter.toLowerCase()));
        child.visible = match;
        if (match) found = true;
      });
      if (!found) clone.traverse((c) => { if (c.isMesh || c.isGroup) c.visible = true; });
    }

    clone.traverse((child) => {
      if (child.isMesh && child.geometry) generateUV(child.geometry);
    });

    normalizeUVs(clone);
    normalizeModel(clone);
    return clone;
  }, [obj, groupFilter]);

  useEffect(() => { applyMaterial(model, baseColor, logoTexture); }, [model, baseColor, logoTexture]);

  useEffect(() => {
    if (!onReady) return;
    const { y } = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    if (y > 0) onReady(y);
  }, [model, onReady]);

  return <primitive object={model} />;
}

// ── GLB / GLTF ───────────────────────────────────────────────────────────────
function GLBModel({ filePath, logoTexture, baseColor, onReady }) {
  const { scene } = useGLTF(filePath, true);

  const model = useMemo(() => {
    const clone = scene.clone();
    normalizeModel(clone);
    return clone;
  }, [scene]);

  useEffect(() => {
    model.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((m) => {
        if (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) {
          m.color.set(logoTexture ? "#ffffff" : baseColor);
          m.map = logoTexture || null;
          m.needsUpdate = true;
        }
      });
    });
  }, [model, logoTexture, baseColor]);

  useEffect(() => {
    if (!onReady) return;
    const { y } = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    if (y > 0) onReady(y);
  }, [model, onReady]);

  return <primitive object={model} />;
}

// ── FBX ──────────────────────────────────────────────────────────────────────
function FBXModel({ filePath, logoTexture, baseColor, onReady }) {
  const fbx = useLoader(FBXLoader, filePath);

  const model = useMemo(() => {
    const clone = fbx.clone();
    normalizeModel(clone);
    return clone;
  }, [fbx]);

  useEffect(() => { applyMaterial(model, baseColor, logoTexture); }, [model, baseColor, logoTexture]);

  useEffect(() => {
    if (!onReady) return;
    const { y } = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    if (y > 0) onReady(y);
  }, [model, onReady]);

  return <primitive object={model} />;
}

// ── STL ──────────────────────────────────────────────────────────────────────
function STLModel({ filePath, logoTexture, baseColor, onReady }) {
  const geometry = useLoader(STLLoader, filePath);

  const model = useMemo(() => {
    const geo = geometry.clone();
    geo.computeVertexNormals();
    generateUV(geo);

    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.05 })
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const group = new THREE.Group();
    group.add(mesh);
    normalizeModel(group);
    return group;
  }, [geometry]);

  useEffect(() => {
    model.traverse((child) => {
      if (!child.isMesh) return;
      child.material.color.set(logoTexture ? "#ffffff" : baseColor);
      child.material.map = logoTexture || null;
      child.material.needsUpdate = true;
    });
  }, [model, logoTexture, baseColor]);

  useEffect(() => {
    if (!onReady) return;
    const { y } = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    if (y > 0) onReady(y);
  }, [model, onReady]);

  return <primitive object={model} />;
}

// ── Scene ─────────────────────────────────────────────────────────────────────
function ProductScene({ selectedModel, selectedVariation, logoTexture, baseColor, autoRotate, selectedComponent }) {
  const modelInfo = useMemo(() => {
    if (selectedVariation) return getModelById(selectedVariation);
    return getModelsByCategory(selectedModel)[0] || null;
  }, [selectedModel, selectedVariation]);

  const groupFilter = useMemo(() => {
    if (!modelInfo?.components || !selectedComponent) return null;
    return modelInfo.components.find(c => c.id === selectedComponent)?.groupName || null;
  }, [modelInfo, selectedComponent]);

  const [modelHeight, setModelHeight] = useState(2.0);
  const cameraZ = Math.min(Math.max(modelHeight * 1.8, 3), 20);
  const shared = { logoTexture, baseColor, onReady: setModelHeight };

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, cameraZ]} fov={48} />
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
      <directionalLight position={[4, 6, 4]} intensity={1} castShadow shadow-mapSize={[2048, 2048]} />
      <pointLight position={[-4, 3, -4]} intensity={0.4} />
      <Environment preset="studio" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <shadowMaterial opacity={0.22} />
      </mesh>
      <Suspense fallback={<LoadingBox />}>
        {modelInfo?.type === "obj" && (
          <OBJModel filePath={modelInfo.file} groupFilter={groupFilter} {...shared} />
        )}
        {(modelInfo?.type === "glb" || modelInfo?.type === "gltf") && (
          <GLBModel filePath={modelInfo.file} {...shared} />
        )}
        {modelInfo?.type === "fbx" && (
          <FBXModel filePath={modelInfo.file} {...shared} />
        )}
        {modelInfo?.type === "stl" && (
          <STLModel filePath={modelInfo.file} {...shared} />
        )}
      </Suspense>
    </>
  );
}

function StudioPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { success, error: showError } = useToast();
  const urlModel = searchParams.get("model");
  const urlVariation = searchParams.get("variation");

  const [logoImages, setLogoImages] = useState([]);
  const [logoTexture, setLogoTexture] = useState(null);
  const [uvPositions, setUvPositions] = useState([]);
  const [uvScales, setUvScales] = useState([]);
  const [uvRotations, setUvRotations] = useState([]);
  const [isUVModalOpen, setIsUVModalOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(urlModel || "shirt");
  const [selectedVariation, setSelectedVariation] = useState(urlVariation || null);
  const [selectedComponent, setSelectedComponent] = useState(null); // For multi-component models
  const [baseColor, setBaseColor] = useState("#ffffff");
  const [autoRotate, setAutoRotate] = useState(false);
  const [activeTab, setActiveTab] = useState("edit"); // "edit" or "model"
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);


  useEffect(() => {
    if (urlModel) {
      setSelectedModel(urlModel);
    }
    if (urlVariation) {
      setSelectedVariation(urlVariation);
    }
  }, [urlModel, urlVariation]);

  // Rebuild the canvas texture whenever images, positions, scales, or base color change
  useEffect(() => {
    if (!logoImages || logoImages.length === 0) {
      setLogoTexture(null);
      return;
    }

    const SIZE = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, SIZE, SIZE);

    logoImages.forEach((img, i) => {
      const pos   = uvPositions[i] || { u: 0.5, v: 0.5 };
      const scale = uvScales[i]    || { u: 0.3, v: 0.3 };
      const rot   = (uvRotations[i] || 0) * Math.PI / 180;

      const boxW = SIZE * scale.u;
      const boxH = SIZE * scale.v;
      const aspect = img.width / img.height;
      const [tw, th] = aspect > boxW / boxH
        ? [boxW, boxW / aspect]
        : [boxH * aspect, boxH];

      const cx = SIZE * pos.u, cy = SIZE * (1 - pos.v);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.drawImage(img, -tw / 2, -th / 2, tw, th);
      ctx.restore();
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.flipY = true;
    texture.needsUpdate = true;
    setLogoTexture(texture);
  }, [logoImages, uvPositions, uvScales, uvRotations, baseColor]);


  const handleModelChange = (modelId, variationId) => {
    setSelectedModel(modelId);
    setSelectedVariation(variationId);
    setSelectedComponent(null); // Reset component selection when changing models
    router.push(`/studio?model=${modelId}&variation=${variationId || ""}`);
  };

  // Export function to download model with texture
  const handleExport = useCallback(async () => {
    // Check if user is authenticated
    if (!isAuthenticated()) {
      const currentPath = window.location.pathname + window.location.search;
      router.push(`/login?returnUrl=${encodeURIComponent(currentPath)}`);
      return;
    }

    if (!sceneRef.current) {
      showError("Model not ready. Please wait for the model to load.");
      return;
    }

    try {
      const modelInfo = selectedVariation
        ? getModelById(selectedVariation)
        : getModelsByCategory(selectedModel)[0];

      if (!modelInfo) {
        showError("No model selected.");
        return;
      }

      // Get the scene from the ref
      const scene = sceneRef.current;

      // Find the model in the scene (skip lights, camera, environment, plane, etc.)
      let modelObject = null;
      const modelCandidates = [];

      scene.traverse((child) => {
        // Skip lights, cameras, and helper objects
        if (child.isLight || child.isCamera || child.isHelper) {
          return;
        }

        // Skip the shadow plane
        if (child.name && child.name.includes("shadow")) {
          return;
        }

        // Collect potential model objects
        if (child.isMesh || (child.isGroup && child.children.length > 0)) {
          // Check if it has geometry (is a mesh) or is a group with meshes
          if (child.isMesh || (child.isGroup && child.children.some(c => c.isMesh))) {
            modelCandidates.push(child);
          }
        }
      });

      // Find the root model object (usually the one that's a direct child of scene or a group)
      if (modelCandidates.length > 0) {
        // Prefer groups that contain meshes, or the largest group
        modelObject = modelCandidates.find(c => c.isGroup && c.children.some(ch => ch.isMesh))
          || modelCandidates.find(c => c.isGroup)
          || modelCandidates[0];

        // If we found a mesh, try to get its parent group
        if (modelObject && modelObject.isMesh && modelObject.parent && modelObject.parent.isGroup) {
          modelObject = modelObject.parent;
        }
      }

      if (!modelObject) {
        showError("Could not find model in scene. Please ensure the model is loaded.");
        return;
      }

      // Clone the model to avoid modifying the original
      const clonedModel = modelObject.clone(true);

      // Ensure texture is applied to all meshes in the cloned model
      clonedModel.traverse((child) => {
        if (child.isMesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material) => {
            if (logoTexture) {
              material.map = logoTexture;
              material.needsUpdate = true;
            } else {
              // Apply base color if no texture
              material.color = new THREE.Color(baseColor);
              material.needsUpdate = true;
            }
          });
        }
      });

      // Helper to get texture as blob for embedding
      const getTextureBlob = () => {
        return new Promise((resolve) => {
          if (logoTexture && logoTexture.image) {
            const textureImage = logoTexture.image;
            if (textureImage instanceof HTMLCanvasElement) {
              textureImage.toBlob((blob) => {
                resolve(blob);
              }, "image/png");
            } else if (textureImage instanceof Image) {
              const canvas = document.createElement("canvas");
              canvas.width = textureImage.width || 1024;
              canvas.height = textureImage.height || 1024;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(textureImage, 0, 0);
              canvas.toBlob((blob) => {
                resolve(blob);
              }, "image/png");
            } else {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        });
      };

      // Export model based on type
      if (modelInfo.type === "obj") {
        // For OBJ format, we need separate files (OBJ, MTL, and texture)
        // Export OBJ
        const objExporter = new OBJExporter();
        let objString = objExporter.parse(clonedModel);

        // Add MTL reference at the beginning of OBJ file
        const mtlFileName = `${modelInfo.id || "model"}.mtl`;
        const textureFileName = `${modelInfo.id || "model"}_texture.png`;
        objString = `mtllib ${mtlFileName}\n` + objString;

        // Create MTL file for texture
        let mtlString = `# MTL file for ${modelInfo.id || "model"}\n`;
        mtlString += `newmtl material1\n`;
        mtlString += `Ka 1.000 1.000 1.000\n`;
        mtlString += `Kd 1.000 1.000 1.000\n`;
        mtlString += `Ks 0.000 0.000 0.000\n`;
        if (logoTexture) {
          mtlString += `map_Kd ${textureFileName}\n`;
        } else {
          const color = new THREE.Color(baseColor);
          mtlString += `Kd ${color.r.toFixed(3)} ${color.g.toFixed(3)} ${color.b.toFixed(3)}\n`;
        }
        mtlString += `Ns 0.000\n`;
        mtlString += `illum 1\n`;

        // Get texture blob
        const textureBlob = await getTextureBlob();

        // Download all files in sequence
        // 1. OBJ file
        const objBlob = new Blob([objString], { type: "text/plain" });
        const objUrl = URL.createObjectURL(objBlob);
        const objLink = document.createElement("a");
        objLink.href = objUrl;
        objLink.download = `${modelInfo.id || "model"}.obj`;
        document.body.appendChild(objLink);
        objLink.click();
        document.body.removeChild(objLink);
        URL.revokeObjectURL(objUrl);

        // 2. MTL file
        await new Promise(resolve => setTimeout(resolve, 100));
        const mtlBlob = new Blob([mtlString], { type: "text/plain" });
        const mtlUrl = URL.createObjectURL(mtlBlob);
        const mtlLink = document.createElement("a");
        mtlLink.href = mtlUrl;
        mtlLink.download = mtlFileName;
        document.body.appendChild(mtlLink);
        mtlLink.click();
        document.body.removeChild(mtlLink);
        URL.revokeObjectURL(mtlUrl);

        // 3. Texture file (if exists)
        if (textureBlob) {
          await new Promise(resolve => setTimeout(resolve, 100));
          const textureUrl = URL.createObjectURL(textureBlob);
          const textureLink = document.createElement("a");
          textureLink.href = textureUrl;
          textureLink.download = textureFileName;
          document.body.appendChild(textureLink);
          textureLink.click();
          document.body.removeChild(textureLink);
          URL.revokeObjectURL(textureUrl);
        }

        setTimeout(() => {
          success("Export completed! Model with texture has been downloaded.");
        }, 200);

      } else if (modelInfo.type === "glb" || modelInfo.type === "gltf") {
        // Export GLB/GLTF with embedded texture
        const gltfExporter = new GLTFExporter();

        gltfExporter.parse(
          clonedModel,
          (result) => {
            if (result instanceof ArrayBuffer) {
              // Binary GLB (texture is embedded)
              const blob = new Blob([result], { type: "application/octet-stream" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `${modelInfo.id || "model"}.glb`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
              setTimeout(() => {
                success("Export completed! Model with embedded texture has been downloaded.");
              }, 100);
            } else {
              // JSON GLTF (texture is embedded)
              const jsonString = JSON.stringify(result, null, 2);
              const blob = new Blob([jsonString], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `${modelInfo.id || "model"}.gltf`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
              setTimeout(() => {
                success("Export completed! Model with embedded texture has been downloaded.");
              }, 100);
            }
          },
          {
            binary: modelInfo.type === "glb",
            includeCustomExtensions: true,
            embedImages: true, // Embed textures in the model file
          }
        );
      } else if (modelInfo.type === "fbx") {
        // No FBX exporter in Three.js — export as GLB instead
        const gltfExporter = new GLTFExporter();
        gltfExporter.parse(
          clonedModel,
          (result) => {
            if (result instanceof ArrayBuffer) {
              const blob = new Blob([result], { type: "application/octet-stream" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `${modelInfo.id || "model"}.glb`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
              setTimeout(() => {
                success("Export completed! FBX model exported as GLB format.");
              }, 100);
            }
          },
          (err) => {
            console.error("GLB export error:", err);
            showError("Error exporting model: " + err.message);
          },
          { binary: true, embedImages: true }
        );
      } else if (modelInfo.type === "stl") {
        const stlExporter = new STLExporter();
        const stlString = stlExporter.parse(clonedModel, { binary: false });
        const blob = new Blob([stlString], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${modelInfo.id || "model"}.stl`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setTimeout(() => {
          success("Export completed! STL model has been downloaded.");
        }, 100);
      } else {
        // Fallback: export as OBJ
        const objExporter = new OBJExporter();
        const objString = objExporter.parse(clonedModel);
        const blob = new Blob([objString], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${modelInfo.id || "model"}.obj`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      // Success message for GLB/GLTF exports
      if (modelInfo.type === "glb" || modelInfo.type === "gltf") {
        setTimeout(() => {
          success("Export completed! Model file has been downloaded.");
        }, 500);
      }

    } catch (error) {
      console.error("Export error:", error);
      showError("Error exporting model: " + error.message);
    }
  }, [selectedModel, selectedVariation, logoTexture, baseColor, isAuthenticated, router, success, showError]);

  const currentVariations = MODEL_VARIATIONS[selectedModel] || [];

  // Get current model info for display
  const currentModelInfo = useMemo(() => {
    if (selectedVariation) {
      return getModelById(selectedVariation);
    }
    // Fallback to first model in category if no variation selected
    const categoryModels = getModelsByCategory(selectedModel);
    return categoryModels[0] || null;
  }, [selectedModel, selectedVariation]);

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
              {currentModelInfo && (
                <span className="ml-2 text-xs text-slate-400 hidden sm:inline">
                  • {currentModelInfo.displayName || currentModelInfo.name}
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
                className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === "edit"
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
                className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === "model"
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
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${activeTab === "edit"
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
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${activeTab === "model"
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
                              className={`p-3 rounded-xl border transition-all duration-200 text-left ${selectedComponent === component.id
                                  ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border-emerald-500/50 shadow-lg shadow-emerald-500/20"
                                  : "bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50"
                                }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-sm font-semibold ${selectedComponent === component.id ? "text-emerald-300" : "text-slate-300"
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
                          className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all duration-200 group ${selectedModel === model.id
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
                                className={`relative rounded-xl border-2 p-4 transition-all duration-200 group text-left ${selectedVariation === variation.id
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
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${selectedModel === model.id
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
                              className={`aspect-square rounded-lg border p-2 transition-all ${selectedVariation === variation.id
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
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
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
              <button
                onClick={handleExport}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 group"
              >
                <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="text-xs font-medium">Export</span>
              </button>
            </div>
            <Canvas
              ref={canvasRef}
              shadows
              dpr={[1, 2]}
              gl={{
                preserveDrawingBuffer: true,
                antialias: true,
                powerPreference: "high-performance"
              }}
              onCreated={({ scene }) => {
                sceneRef.current = scene;
              }}
              className="w-full h-full"
            >
              <Suspense fallback={<LoadingBox />}>
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
            uvRotations={uvRotations}
            onPositionsChange={setUvPositions}
            onScalesChange={setUvScales}
            onRotationsChange={setUvRotations}
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
