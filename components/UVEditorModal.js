"use client";

import { useRef, useState, useCallback, useEffect, useMemo, Suspense } from "react";
import * as THREE from "three";
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Environment, useGLTF } from "@react-three/drei";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { getModelById, getModelsByCategory } from "@/app/studio/modelMapping";

// Normalize UV coords to [0,1] using global bounds
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

// ── Normalize helper (same as page.js) ───────────────────────────────────────
function normalizeModel(object, targetSize = 2.0) {
  object.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return;
  const center = box.getCenter(new THREE.Vector3());
  object.position.sub(center);
  object.updateWorldMatrix(true, true);
  const size = new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
  object.scale.setScalar(targetSize / (Math.max(size.x, size.y, size.z) || 1));
  object.updateWorldMatrix(true, true);
  const fc = new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3());
  object.position.sub(fc);
}

function applyMat(object, baseColor, texture) {
  object.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
    child.material = new THREE.MeshStandardMaterial({
      color: texture ? "#ffffff" : baseColor,
      roughness: 0.3,
      metalness: 0.05,
      map: texture || null,
    });
  });
}

// ── Preview model loaders ─────────────────────────────────────────────────────
function PreviewOBJ({ filePath, logoTexture, baseColor }) {
  const obj = useLoader(OBJLoader, filePath);
  const model = useMemo(() => { const c = obj.clone(); normalizeUVs(c); normalizeModel(c); return c; }, [obj]);
  useEffect(() => { applyMat(model, baseColor, logoTexture); }, [model, baseColor, logoTexture]);
  return <primitive object={model} />;
}

function PreviewGLB({ filePath, logoTexture, baseColor }) {
  const { scene } = useGLTF(filePath, true);
  const model = useMemo(() => { const c = scene.clone(); normalizeModel(c); return c; }, [scene]);
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
  return <primitive object={model} />;
}

function PreviewFBX({ filePath, logoTexture, baseColor }) {
  const fbx = useLoader(FBXLoader, filePath);
  const model = useMemo(() => { const c = fbx.clone(); normalizeModel(c); return c; }, [fbx]);
  useEffect(() => { applyMat(model, baseColor, logoTexture); }, [model, baseColor, logoTexture]);
  return <primitive object={model} />;
}

function PreviewSTL({ filePath, logoTexture, baseColor }) {
  const geometry = useLoader(STLLoader, filePath);
  const model = useMemo(() => {
    const geo = geometry.clone();
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.05 }));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const group = new THREE.Group();
    group.add(mesh);
    normalizeModel(group);
    return group;
  }, [geometry]);
  useEffect(() => {
    model.traverse((c) => {
      if (!c.isMesh) return;
      c.material.color.set(logoTexture ? "#ffffff" : baseColor);
      c.material.map = logoTexture || null;
      c.material.needsUpdate = true;
    });
  }, [model, logoTexture, baseColor]);
  return <primitive object={model} />;
}

function PreviewScene({ selectedModel, selectedVariation, logoTexture, baseColor }) {
  const modelInfo = useMemo(() => {
    if (selectedVariation) return getModelById(selectedVariation);
    return getModelsByCategory(selectedModel)[0] || null;
  }, [selectedModel, selectedVariation]);

  const props = { filePath: modelInfo?.file, logoTexture, baseColor };

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 4]} fov={48} />
      <OrbitControls enablePan enableZoom enableRotate minDistance={1} maxDistance={12} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 6, 4]} intensity={1} castShadow />
      <pointLight position={[-4, 3, -4]} intensity={0.4} />
      <Environment preset="studio" />
      <Suspense fallback={null}>
        {modelInfo?.type === "obj" && <PreviewOBJ {...props} />}
        {(modelInfo?.type === "glb" || modelInfo?.type === "gltf") && <PreviewGLB {...props} />}
        {modelInfo?.type === "fbx" && <PreviewFBX {...props} />}
        {modelInfo?.type === "stl" && <PreviewSTL {...props} />}
      </Suspense>
    </>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function UVEditorModal({
  isOpen,
  onClose,
  images = [],
  onImagesChange,
  uvPositions = [],
  uvScales = [],
  uvRotations = [],
  onPositionsChange,
  onScalesChange,
  onRotationsChange,
  baseColor = "#ffffff",
  uvData = null,
  selectedModel,
  selectedVariation,
  onTextureUpdate,
}) {
  const canvasRef = useRef(null);
  const backgroundCanvasRef = useRef(null);
  const rafRef = useRef(null);
  const fileInputRef = useRef(null);
  const tempPositionsRef = useRef(null);
  const tempScalesRef = useRef(null);
  const tempRotationsRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [dragHandle, setDragHandle] = useState(null);

  const currentImage = images[selectedImageIndex] || null;
  const currentPosition = uvPositions[selectedImageIndex] || { u: 0.5, v: 0.5 };
  const currentScale = uvScales[selectedImageIndex] || { u: 0.3, v: 0.3 };
  const currentRotation = uvRotations[selectedImageIndex] || 0;

  // ── Drawing ─────────────────────────────────────────────────────────────────
  const drawBackground = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!backgroundCanvasRef.current) backgroundCanvasRef.current = document.createElement("canvas");
    const bg = backgroundCanvasRef.current;
    if (bg.width !== canvas.width || bg.height !== canvas.height) {
      bg.width = canvas.width;
      bg.height = canvas.height;
    }
    const ctx = bg.getContext("2d");
    const W = bg.width, H = bg.height;

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = "rgba(148,163,184,0.12)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath(); ctx.moveTo((W / 10) * i, 0); ctx.lineTo((W / 10) * i, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, (H / 10) * i); ctx.lineTo(W, (H / 10) * i); ctx.stroke();
    }
    ctx.strokeStyle = "rgba(148,163,184,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();

    if (uvData?.meshes?.length > 0) {
      const { minU, maxU, minV, maxV } = uvData.bounds;
      const uR = maxU - minU || 1, vR = maxV - minV || 1;
      const toCanvas = (u, v) => ({ x: ((u - minU) / uR) * W, y: H - ((v - minV) / vR) * H });

      uvData.meshes.forEach((mesh, mi) => {
        const hue = (mi * 137.5) % 360;
        ctx.strokeStyle = `hsla(${hue},60%,65%,0.4)`;
        ctx.fillStyle = `hsla(${hue},60%,65%,0.06)`;
        ctx.lineWidth = 0.8;
        mesh.triangles.forEach((tri) => {
          const pts = tri.vertices.map((v) => toCanvas(v.u, v.v));
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          ctx.lineTo(pts[1].x, pts[1].y);
          ctx.lineTo(pts[2].x, pts[2].y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        });

        // Mesh label
        let mb = mesh.bounds;
        if (!mb || mb.minU === Infinity) {
          mb = { minU: Infinity, minV: Infinity, maxU: -Infinity, maxV: -Infinity };
          mesh.triangles.forEach((t) => t.vertices.forEach((v) => {
            mb.minU = Math.min(mb.minU, v.u); mb.minV = Math.min(mb.minV, v.v);
            mb.maxU = Math.max(mb.maxU, v.u); mb.maxV = Math.max(mb.maxV, v.v);
          }));
        }
        if (mb.minU !== Infinity) {
          const lp = toCanvas(mb.minU, mb.maxV);
          const label = mesh.name || `Zone ${mi + 1}`;
          ctx.font = "bold 10px sans-serif";
          const tw = ctx.measureText(label).width;
          ctx.fillStyle = "rgba(15,23,42,0.8)";
          ctx.beginPath();
          ctx.roundRect(lp.x + 4, lp.y + 4, tw + 10, 18, 4);
          ctx.fill();
          ctx.fillStyle = "rgba(186,230,253,0.9)";
          ctx.fillText(label, lp.x + 9, lp.y + 16);
        }
      });
    }
  }, [baseColor, uvData]);

  const drawImages = useCallback((positions, scales, rotations) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;

    if (backgroundCanvasRef.current) ctx.drawImage(backgroundCanvasRef.current, 0, 0);
    else { ctx.fillStyle = baseColor; ctx.fillRect(0, 0, W, H); }

    images.forEach((img, idx) => {
      if (!img) return;
      const pos = positions[idx] || { u: 0.5, v: 0.5 };
      const sc = scales[idx] || { u: 0.3, v: 0.3 };
      const rot = (rotations?.[idx] || 0) * Math.PI / 180;
      const isSelected = idx === selectedImageIndex;
      const bW = W * sc.u, bH = H * sc.v;
      const asp = img.width / img.height;
      const [iW, iH] = asp > bW / bH ? [bW, bW / asp] : [bH * asp, bH];
      const cx = W * pos.u, cy = H * (1 - pos.v);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);

      ctx.globalAlpha = isSelected ? 1 : 0.55;
      ctx.drawImage(img, -iW / 2, -iH / 2, iW, iH);
      ctx.globalAlpha = 1;

      // Border
      ctx.strokeStyle = isSelected ? "#34d399" : "#60a5fa";
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.strokeRect(-iW / 2, -iH / 2, iW, iH);

      // Center dot
      ctx.fillStyle = isSelected ? "#34d399" : "#60a5fa";
      ctx.beginPath(); ctx.arc(0, 0, isSelected ? 5 : 3.5, 0, Math.PI * 2); ctx.fill();

      // Number badge
      ctx.fillStyle = isSelected ? "#064e3b" : "rgba(15,23,42,0.85)";
      ctx.beginPath(); ctx.roundRect(-iW / 2 + 5, -iH / 2 + 5, 22, 18, 4); ctx.fill();
      ctx.fillStyle = isSelected ? "#6ee7b7" : "#cbd5e1";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${idx + 1}`, -iW / 2 + 16, -iH / 2 + 18);
      ctx.textAlign = "left";

      if (isSelected) {
        const hs = 10;
        const handles = [
          { x: -iW / 2, y: -iH / 2 }, { x: iW / 2, y: -iH / 2 },
          { x: -iW / 2, y: iH / 2 }, { x: iW / 2, y: iH / 2 },
          { x: 0, y: -iH / 2 }, { x: 0, y: iH / 2 },
          { x: -iW / 2, y: 0 }, { x: iW / 2, y: 0 },
        ];
        handles.forEach(({ x: hx, y: hy }) => {
          ctx.fillStyle = "#34d399";
          ctx.beginPath(); ctx.roundRect(hx - hs / 2, hy - hs / 2, hs, hs, 2); ctx.fill();
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.roundRect(hx - hs / 2, hy - hs / 2, hs, hs, 2); ctx.stroke();
        });

        // Rotation stem
        ctx.strokeStyle = "#a78bfa";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 2]);
        ctx.beginPath();
        ctx.moveTo(0, -iH / 2);
        ctx.lineTo(0, -iH / 2 - 20);
        ctx.stroke();
        ctx.setLineDash([]);

        // Rotation handle circle
        ctx.fillStyle = "#7c3aed";
        ctx.beginPath();
        ctx.arc(0, -iH / 2 - 28, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Rotate icon inside handle
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, -iH / 2 - 28, 4, -Math.PI * 0.75, Math.PI * 0.75);
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.moveTo(-1.5, -iH / 2 - 28 - 4.5);
        ctx.lineTo(2, -iH / 2 - 28 - 6);
        ctx.lineTo(2, -iH / 2 - 28 - 3);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    });
  }, [images, selectedImageIndex, baseColor]);

  const drawUVMap = useCallback(() => {
    drawBackground();
    drawImages(uvPositions, uvScales, uvRotations);
  }, [drawBackground, drawImages, uvPositions, uvScales, uvRotations]);

  useEffect(() => {
    if (isOpen) { backgroundCanvasRef.current = null; drawUVMap(); }
    return () => { if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  }, [isOpen, drawUVMap, baseColor, uvData]);

  // ── Interaction helpers ──────────────────────────────────────────────────────
  const getImageBounds = useCallback((index) => {
    if (!images[index]) return null;
    const pos = uvPositions[index] || { u: 0.5, v: 0.5 };
    const sc = uvScales[index] || { u: 0.3, v: 0.3 };
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const W = canvas.width, H = canvas.height;
    const img = images[index];
    const bW = W * sc.u, bH = H * sc.v, asp = img.width / img.height;
    const [iW, iH] = asp > bW / bH ? [bW, bW / asp] : [bH * asp, bH];
    const x = W * pos.u - iW / 2, y = H * (1 - pos.v) - iH / 2;
    return { x, y, width: iW, height: iH, centerX: W * pos.u, centerY: H * (1 - pos.v) };
  }, [images, uvPositions, uvScales]);

  const getHandleAtPoint = useCallback((px, py) => {
    if (!currentImage) return null;
    const b = getImageBounds(selectedImageIndex);
    if (!b) return null;
    const rot = (uvRotations[selectedImageIndex] || 0) * Math.PI / 180;

    // Transform point to image-local space (unrotated, centered at origin)
    const dx = px - b.centerX, dy = py - b.centerY;
    const cos = Math.cos(-rot), sin = Math.sin(-rot);
    const lx = dx * cos - dy * sin;
    const ly = dx * sin + dy * cos;

    const hw = b.width / 2, hh = b.height / 2;
    const t = 10;

    // Rotation handle: (0, -hh - 28) in local space
    if (Math.hypot(lx, ly + hh + 28) < 14) return "rotate";

    // Resize handles
    const pts = [
      { x: -hw, y: -hh, n: "nw" }, { x: hw, y: -hh, n: "ne" },
      { x: -hw, y: hh, n: "sw" }, { x: hw, y: hh, n: "se" },
      { x: 0, y: -hh, n: "n" }, { x: 0, y: hh, n: "s" },
      { x: -hw, y: 0, n: "w" }, { x: hw, y: 0, n: "e" },
    ];
    for (const p of pts) if (Math.hypot(lx - p.x, ly - p.y) < t) return p.n;

    // Inside image body
    if (Math.abs(lx) <= hw && Math.abs(ly) <= hh) return "move";

    return null;
  }, [currentImage, selectedImageIndex, getImageBounds, uvRotations]);

  const getCanvasCoords = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const canvas = canvasRef.current;
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const handleMouseDown = useCallback((e) => {
    if (!currentImage) return;
    const { x, y } = getCanvasCoords(e);
    const handle = getHandleAtPoint(x, y);
    if (handle) {
      tempPositionsRef.current = [...uvPositions];
      tempScalesRef.current = [...uvScales];
      tempRotationsRef.current = [...uvRotations];
      setIsDragging(true); setDragHandle(handle); setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [currentImage, getHandleAtPoint, uvPositions, uvScales, uvRotations]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !currentImage || !dragHandle) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const sx = canvas.width / rect.width, sy = canvas.height / rect.height;
      const dx = (e.clientX - dragStart.x) * sx, dy = (e.clientY - dragStart.y) * sy;
      if (!tempPositionsRef.current) tempPositionsRef.current = [...uvPositions];
      if (!tempScalesRef.current) tempScalesRef.current = [...uvScales];
      if (!tempRotationsRef.current) tempRotationsRef.current = [...uvRotations];

      if (dragHandle === "rotate") {
        const mx = (e.clientX - rect.left) * sx;
        const my = (e.clientY - rect.top) * sy;
        const pos = tempPositionsRef.current[selectedImageIndex] || { u: 0.5, v: 0.5 };
        const cx = canvas.width * pos.u;
        const cy = canvas.height * (1 - pos.v);
        const angle = Math.atan2(my - cy, mx - cx) * 180 / Math.PI + 90;
        tempRotationsRef.current = [...tempRotationsRef.current];
        tempRotationsRef.current[selectedImageIndex] = angle;
      } else if (dragHandle === "move") {
        const bp = tempPositionsRef.current[selectedImageIndex] || { u: 0.5, v: 0.5 };
        tempPositionsRef.current[selectedImageIndex] = {
          u: Math.max(0, Math.min(1, bp.u + dx / canvas.width)),
          v: Math.max(0, Math.min(1, bp.v - dy / canvas.height)),
        };
      } else {
        const bs = tempScalesRef.current[selectedImageIndex] || { u: 0.3, v: 0.3 };
        const img = images[selectedImageIndex];
        const asp = img.width / img.height;
        let ns = { ...bs };
        const du = dx / canvas.width, dv = -dy / canvas.height;
        if (dragHandle.includes("e")) ns.u = Math.max(0.05, Math.min(1, bs.u + du));
        if (dragHandle.includes("w")) ns.u = Math.max(0.05, Math.min(1, bs.u - du));
        if (dragHandle.includes("s")) ns.v = Math.max(0.05, Math.min(1, bs.v + dv));
        if (dragHandle.includes("n")) ns.v = Math.max(0.05, Math.min(1, bs.v - dv));
        if (["nw", "ne", "sw", "se"].includes(dragHandle)) {
          if (Math.abs(du) > Math.abs(dv)) ns.v = ns.u / asp; else ns.u = ns.v * asp;
        }
        tempScalesRef.current[selectedImageIndex] = {
          u: Math.max(0.05, Math.min(1, ns.u)),
          v: Math.max(0.05, Math.min(1, ns.v)),
        };
      }
      drawImages(tempPositionsRef.current, tempScalesRef.current, tempRotationsRef.current);
    });
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, dragStart, dragHandle, currentImage, selectedImageIndex, uvPositions, uvScales, uvRotations, images, drawImages]);

  const handleMouseUp = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (tempPositionsRef.current) { onPositionsChange?.(tempPositionsRef.current); tempPositionsRef.current = null; }
    if (tempScalesRef.current) { onScalesChange?.(tempScalesRef.current); tempScalesRef.current = null; }
    if (tempRotationsRef.current) { onRotationsChange?.(tempRotationsRef.current); tempRotationsRef.current = null; }
    setIsDragging(false); setDragHandle(null);
  }, [onPositionsChange, onScalesChange, onRotationsChange]);

  const handleClick = useCallback((e) => {
    if (isDragging) return;
    const { x, y } = getCanvasCoords(e);
    for (let i = images.length - 1; i >= 0; i--) {
      const b = getImageBounds(i);
      if (!b) continue;
      const rot = (uvRotations[i] || 0) * Math.PI / 180;
      const dx = x - b.centerX, dy = y - b.centerY;
      const cos = Math.cos(-rot), sin = Math.sin(-rot);
      const lx = dx * cos - dy * sin;
      const ly = dx * sin + dy * cos;
      if (Math.abs(lx) <= b.width / 2 && Math.abs(ly) <= b.height / 2) {
        setSelectedImageIndex(i); return;
      }
    }
  }, [isDragging, images, getImageBounds, uvRotations]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isOpen) return;
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mouseleave", handleMouseUp);
    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mouseleave", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp, isOpen]);

  // ── Image management ─────────────────────────────────────────────────────────

  // Returns sorted UV zone centers (largest zone first) normalized to 0-1 canvas space
  const getUVZones = useCallback(() => {
    if (!uvData?.meshes?.length) return [];
    const { minU, maxU, minV, maxV } = uvData.bounds;
    const uR = maxU - minU || 1, vR = maxV - minV || 1;

    return uvData.meshes.map((mesh) => {
      let mb = mesh.bounds;
      if (!mb || mb.minU === Infinity || mb.minU == null) {
        if (!mesh.triangles?.length) return null;
        mb = { minU: Infinity, minV: Infinity, maxU: -Infinity, maxV: -Infinity };
        mesh.triangles.forEach((t) => t.vertices.forEach((v) => {
          mb.minU = Math.min(mb.minU, v.u); mb.minV = Math.min(mb.minV, v.v);
          mb.maxU = Math.max(mb.maxU, v.u); mb.maxV = Math.max(mb.maxV, v.v);
        }));
      }
      if (!isFinite(mb.minU)) return null;
      const area = (mb.maxU - mb.minU) * (mb.maxV - mb.minV);
      return {
        u: ((mb.minU + mb.maxU) / 2 - minU) / uR,
        v: ((mb.minV + mb.maxV) / 2 - minV) / vR,
        su: Math.min(((mb.maxU - mb.minU) / uR) * 0.75, 0.5),
        sv: Math.min(((mb.maxV - mb.minV) / vR) * 0.75, 0.5),
        area,
      };
    }).filter(Boolean).sort((a, b) => b.area - a.area);
  }, [uvData]);

  // Default position/scale for the N-th new image
  const getDefaultPlacement = useCallback((index) => {
    const zones = getUVZones();
    if (zones.length > 0) {
      const z = zones[index % zones.length];
      return { pos: { u: z.u, v: z.v }, scale: { u: z.su, v: z.sv } };
    }
    // No UV data — spread images in a grid
    const cols = 3;
    const col = index % cols, row = Math.floor(index / cols);
    return {
      pos: { u: 0.2 + col * 0.3, v: 0.8 - row * 0.35 },
      scale: { u: 0.25, v: 0.25 },
    };
  }, [getUVZones]);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newImages = [];
    const newPositions = [...uvPositions];
    const newScales = [...uvScales];
    const newRotations = [...uvRotations];
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          newImages.push(img);
          if (newImages.length === files.length) {
            const all = [...images, ...newImages];
            while (newPositions.length < all.length) {
              const { pos, scale } = getDefaultPlacement(newPositions.length);
              newPositions.push(pos);
              newScales.push(scale);
              newRotations.push(0);
            }
            onImagesChange?.(all);
            onPositionsChange?.(newPositions);
            onScalesChange?.(newScales);
            onRotationsChange?.(newRotations);
            setSelectedImageIndex(all.length - 1);
          }
        };
        img.src = ev.target?.result ?? "";
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleRemoveImage = (index) => {
    const ni = images.filter((_, i) => i !== index);
    const np = uvPositions.filter((_, i) => i !== index);
    const ns = uvScales.filter((_, i) => i !== index);
    const nr = uvRotations.filter((_, i) => i !== index);
    onImagesChange?.(ni); onPositionsChange?.(np); onScalesChange?.(ns); onRotationsChange?.(nr);
    if (selectedImageIndex >= ni.length) setSelectedImageIndex(Math.max(0, ni.length - 1));
  };

  const handleScaleChange = (axis, value) => {
    const ns = [...uvScales];
    if (!ns[selectedImageIndex]) ns[selectedImageIndex] = { u: 0.3, v: 0.3 };
    ns[selectedImageIndex] = { ...ns[selectedImageIndex], [axis]: parseFloat(value) };
    onScalesChange?.(ns);
  };

  const handleRotationChange = (value) => {
    const nr = [...uvRotations];
    nr[selectedImageIndex] = parseFloat(value);
    onRotationsChange?.(nr);
  };

  const handleFillCanvas = () => {
    const np = [...uvPositions];
    const ns = [...uvScales];
    np[selectedImageIndex] = { u: 0.5, v: 0.5 };
    ns[selectedImageIndex] = { u: 1.0, v: 1.0 };
    onPositionsChange?.(np);
    onScalesChange?.(ns);
  };

  // ── Preview texture ───────────────────────────────────────────────────────────
  const previewTexture = useMemo(() => {
    if (!images.length) return null;
    const SIZE = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = SIZE; canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, SIZE, SIZE);
    images.forEach((img, i) => {
      const pos = uvPositions[i] || { u: 0.5, v: 0.5 };
      const sc = uvScales[i] || { u: 0.3, v: 0.3 };
      const rot = (uvRotations[i] || 0) * Math.PI / 180;
      const bW = SIZE * sc.u, bH = SIZE * sc.v, asp = img.width / img.height;
      const [tw, th] = asp > bW / bH ? [bW, bW / asp] : [bH * asp, bH];
      const cx = SIZE * pos.u, cy = SIZE * (1 - pos.v);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.drawImage(img, -tw / 2, -th / 2, tw, th);
      ctx.restore();
    });
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.flipY = true; tex.needsUpdate = true;
    return tex;
  }, [images, uvPositions, uvScales, uvRotations, baseColor]);

  useEffect(() => { if (previewTexture && onTextureUpdate) onTextureUpdate(previewTexture); }, [previewTexture, onTextureUpdate]);

  // Cursor helper
  const getCursor = (h) => {
    if (!h) return currentImage ? "default" : "pointer";
    if (h === "move") return "move";
    if (h === "rotate") return "grab";
    if (h === "nw" || h === "se") return "nwse-resize";
    if (h === "ne" || h === "sw") return "nesw-resize";
    if (h === "n" || h === "s") return "ns-resize";
    return "ew-resize";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div
        className="relative flex flex-col bg-slate-950 border border-slate-800/60 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden"
        style={{ width: "min(96vw, 1400px)", height: "min(92vh, 860px)" }}
      >
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/70 bg-slate-900/60 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-sky-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 leading-tight">UV Map Editor</h2>
              <p className="text-[11px] text-slate-500 leading-tight">Drag to move · Handles to resize · Purple handle to rotate</p>
            </div>
            {images.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-semibold">
                {images.length} layer{images.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-slate-950 text-xs font-bold shadow-lg shadow-sky-500/30 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add Image
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Sidebar */}
          <div className="w-64 shrink-0 flex flex-col border-r border-slate-800/70 bg-slate-900/40 overflow-y-auto">
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />

            {/* Layers */}
            <div className="p-4 border-b border-slate-800/50">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Layers</p>
              {images.length === 0 ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center gap-2 py-6 rounded-xl border-2 border-dashed border-slate-700 hover:border-sky-600 text-slate-500 hover:text-sky-400 transition-all group"
                >
                  <svg className="w-7 h-7 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span className="text-xs font-medium">Upload an image</span>
                </button>
              ) : (
                <div className="space-y-2">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`group flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        selectedImageIndex === idx
                          ? "border-violet-500/60 bg-violet-500/10 shadow-sm shadow-violet-500/10"
                          : "border-slate-800 hover:border-slate-700 hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-800 shrink-0 border border-slate-700">
                        <img src={img.src} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold truncate ${selectedImageIndex === idx ? "text-violet-300" : "text-slate-300"}`}>
                          Layer {idx + 1}
                        </p>
                        <p className="text-[10px] text-slate-500">{img.width}×{img.height}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx); }}
                        className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all shrink-0"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Transform controls */}
            {currentImage && (
              <div className="p-4 space-y-5">
                <button
                  onClick={handleFillCanvas}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-300 hover:bg-violet-500/25 text-xs font-semibold transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  Fill Canvas
                </button>
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Size</p>
                  <div className="space-y-3">
                    {[["Width", "u"], ["Height", "v"]].map(([label, axis]) => (
                      <div key={axis}>
                        <div className="flex justify-between mb-1.5">
                          <span className="text-xs text-slate-400">{label}</span>
                          <span className="text-xs font-mono text-sky-400">
                            {Math.round((currentScale[axis] || 0.3) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range" min="0.05" max="2" step="0.01"
                          value={currentScale[axis] || 0.3}
                          onChange={(e) => handleScaleChange(axis, e.target.value)}
                          className="w-full h-1.5 appearance-none bg-slate-800 rounded-full cursor-pointer accent-sky-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Rotation</p>
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-xs text-slate-400">Angle</span>
                      <span className="text-xs font-mono text-violet-400">{Math.round(currentRotation)}°</span>
                    </div>
                    <input
                      type="range" min="-180" max="180" step="1"
                      value={currentRotation}
                      onChange={(e) => handleRotationChange(e.target.value)}
                      className="w-full h-1.5 appearance-none bg-slate-800 rounded-full cursor-pointer accent-violet-500"
                    />
                    <button
                      onClick={() => handleRotationChange(0)}
                      className="mt-2 w-full py-1 rounded-lg border border-slate-700 text-[10px] text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-all"
                    >
                      Reset Rotation
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Position</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[["U", currentPosition.u], ["V", currentPosition.v]].map(([label, val]) => (
                      <div key={label} className="bg-slate-800/60 rounded-lg px-3 py-2 border border-slate-700/50">
                        <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
                        <p className="text-xs font-mono text-slate-200">{val.toFixed(3)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* UV Canvas + 3D Preview */}
          <div className="flex-1 flex overflow-hidden">

            {/* UV Canvas */}
            <div className="flex-1 flex flex-col p-4 border-r border-slate-800/70 min-w-0">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <div>
                  <p className="text-xs font-semibold text-slate-300">UV Canvas</p>
                  <p className="text-[11px] text-slate-500">
                    {uvData?.meshes?.length ? `${uvData.meshes.length} UV zone${uvData.meshes.length > 1 ? "s" : ""} detected` : "No UV data"}
                  </p>
                </div>
                {currentImage && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] text-emerald-400 font-medium">Layer {selectedImageIndex + 1} active</span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-h-0 relative rounded-xl border border-slate-800/80 bg-[radial-gradient(circle_at_center,_rgba(30,41,59,0.8),_rgba(2,6,23,0.9))] overflow-hidden flex items-center justify-center">
                <canvas
                  ref={canvasRef}
                  width={1024}
                  height={1024}
                  className="max-w-full max-h-full w-auto h-auto"
                  style={{ imageRendering: "pixelated", cursor: getCursor(dragHandle) }}
                  onMouseDown={handleMouseDown}
                  onClick={handleClick}
                  onMouseMove={(e) => {
                    if (isDragging || !currentImage) return;
                    const { x, y } = getCanvasCoords(e);
                    const h = getHandleAtPoint(x, y);
                    canvasRef.current.style.cursor = getCursor(h);
                  }}
                />
                {!currentImage && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-600 pointer-events-none">
                    <svg className="w-12 h-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm">Upload a layer to start editing</p>
                  </div>
                )}
              </div>
            </div>

            {/* 3D Preview */}
            <div className="w-80 shrink-0 flex flex-col p-4">
              <div className="mb-3 shrink-0">
                <p className="text-xs font-semibold text-slate-300">3D Preview</p>
                <p className="text-[11px] text-slate-500">Live render with texture applied</p>
              </div>
              <div className="flex-1 min-h-0 rounded-xl border border-slate-800/80 overflow-hidden bg-slate-950 relative">
                <Canvas shadows gl={{ antialias: true }} className="w-full h-full">
                  <PreviewScene
                    selectedModel={selectedModel}
                    selectedVariation={selectedVariation}
                    logoTexture={previewTexture}
                    baseColor={baseColor}
                  />
                </Canvas>
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-center">
                  <div className="px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-sm border border-slate-800/50">
                    <p className="text-[10px] text-slate-500">Drag to orbit · Scroll to zoom</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
