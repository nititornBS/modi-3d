"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { OrbitControls, PerspectiveCamera, Environment } from "@react-three/drei";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { useLoader } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { getModelById, getModelsByCategory } from "@/app/studio/modelMapping";

// Model components (simplified versions for preview)
function PreviewOBJModel({ filePath, logoTexture, baseColor }) {
  const obj = useLoader(OBJLoader, filePath);
  
  const clonedObj = useMemo(() => {
    const cloned = obj.clone();
    const box = new THREE.Box3().setFromObject(cloned);
    const center = box.getCenter(new THREE.Vector3());
    cloned.position.x = -center.x;
    cloned.position.y = -center.y;
    cloned.position.z = -center.z;
    return cloned;
  }, [obj]);
  
  useEffect(() => {
    clonedObj.traverse((child) => {
      if (child.isMesh) {
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
  
  return <primitive object={clonedObj} />;
}

function PreviewGLBModel({ filePath, logoTexture, baseColor }) {
  const { scene } = useGLTF(filePath, true);
  
  const clonedScene = useMemo(() => {
    const cloned = scene.clone();
    const box = new THREE.Box3().setFromObject(cloned);
    const center = box.getCenter(new THREE.Vector3());
    cloned.position.x = -center.x;
    cloned.position.y = -center.y;
    cloned.position.z = -center.z;
    return cloned;
  }, [scene]);
  
  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child.isMesh) {
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
  
  return <primitive object={clonedScene} />;
}

function PreviewScene({ selectedModel, selectedVariation, logoTexture, baseColor }) {
  const modelInfo = useMemo(() => {
    if (selectedVariation) {
      return getModelById(selectedVariation);
    }
    const categoryModels = getModelsByCategory(selectedModel);
    return categoryModels[0] || null;
  }, [selectedModel, selectedVariation]);

  const renderModel = () => {
    if (!modelInfo) {
      return null;
    }

    if (modelInfo.type === "obj") {
      return (
        <Suspense fallback={null}>
          <PreviewOBJModel filePath={modelInfo.file} logoTexture={logoTexture} baseColor={baseColor} />
        </Suspense>
      );
    } else if (modelInfo.type === "glb" || modelInfo.type === "gltf") {
      return (
        <Suspense fallback={null}>
          <PreviewGLBModel filePath={modelInfo.file} logoTexture={logoTexture} baseColor={baseColor} />
        </Suspense>
      );
    }
    return null;
  };

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={48} />
      <OrbitControls enablePan enableZoom enableRotate minDistance={2} maxDistance={10} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 6, 4]} intensity={1} />
      <pointLight position={[-4, 3, -4]} intensity={0.4} />
      {renderModel()}
      <Environment preset="studio" />
    </>
  );
}

export default function UVEditorModal({
  isOpen,
  onClose,
  images = [],
  onImagesChange,
  uvPositions = [],
  uvScales = [],
  onPositionsChange,
  onScalesChange,
  baseColor = "#ffffff",
  uvData = null,
  selectedModel,
  selectedVariation,
  onTextureUpdate,
}) {
  const canvasRef = useRef(null);
  const backgroundCanvasRef = useRef(null); // Cached static background
  const rafRef = useRef(null); // requestAnimationFrame reference
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [dragHandle, setDragHandle] = useState(null); // 'move', 'nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'
  const fileInputRef = useRef(null);
  const tempPositionsRef = useRef(null); // Temporary positions during drag
  const tempScalesRef = useRef(null); // Temporary scales during drag

  const currentImage = images[selectedImageIndex] || null;
  const currentPosition = uvPositions[selectedImageIndex] || { u: 0.5, v: 0.5 };
  const currentScale = uvScales[selectedImageIndex] || { u: 0.3, v: 0.3 };

  // Draw static background (grid, UV mesh) - cached
  const drawBackground = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create or get background canvas, resize if needed
    if (!backgroundCanvasRef.current) {
      backgroundCanvasRef.current = document.createElement('canvas');
    }
    
    const bgCanvas = backgroundCanvasRef.current;
    // Ensure background canvas matches main canvas size
    if (bgCanvas.width !== canvas.width || bgCanvas.height !== canvas.height) {
      bgCanvas.width = canvas.width;
      bgCanvas.height = canvas.height;
    }
    
    const bgCtx = bgCanvas.getContext("2d");
    const width = bgCanvas.width;
    const height = bgCanvas.height;

    // Clear background canvas
    bgCtx.fillStyle = baseColor;
    bgCtx.fillRect(0, 0, width, height);

    // Draw grid for reference
    bgCtx.strokeStyle = "rgba(148, 163, 184, 0.15)";
    bgCtx.lineWidth = 0.5;
    for (let i = 0; i <= 10; i++) {
      const x = (width / 10) * i;
      const y = (height / 10) * i;
      bgCtx.beginPath();
      bgCtx.moveTo(x, 0);
      bgCtx.lineTo(x, height);
      bgCtx.stroke();
      bgCtx.beginPath();
      bgCtx.moveTo(0, y);
      bgCtx.lineTo(width, y);
      bgCtx.stroke();
    }

    // Draw center lines
    bgCtx.strokeStyle = "rgba(148, 163, 184, 0.3)";
    bgCtx.lineWidth = 1;
    bgCtx.beginPath();
    bgCtx.moveTo(width / 2, 0);
    bgCtx.lineTo(width / 2, height);
    bgCtx.stroke();
    bgCtx.beginPath();
    bgCtx.moveTo(0, height / 2);
    bgCtx.lineTo(width, height / 2);
    bgCtx.stroke();

    // Draw actual UV mesh layout if available
    if (uvData && uvData.meshes && uvData.meshes.length > 0) {
      const bounds = uvData.bounds;
      const uRange = bounds.maxU - bounds.minU || 1;
      const vRange = bounds.maxV - bounds.minV || 1;
      const scaleU = width / uRange;
      const scaleV = height / vRange;

      // Helper function to convert UV to canvas coordinates (with V flip)
      const uvToCanvas = (u, v) => {
        const x = (u - bounds.minU) * scaleU;
        const y = height - (v - bounds.minV) * scaleV;
        return { x, y };
      };

      // Calculate the bounding rectangle of the UV surface area
      const surfaceTopLeft = uvToCanvas(bounds.minU, bounds.maxV);
      const surfaceBottomRight = uvToCanvas(bounds.maxU, bounds.minV);
      const surfaceMinX = surfaceTopLeft.x;
      const surfaceMinY = surfaceTopLeft.y;
      const surfaceMaxX = surfaceBottomRight.x;
      const surfaceMaxY = surfaceBottomRight.y;
      const surfaceWidth = surfaceMaxX - surfaceMinX;
      const surfaceHeight = surfaceMaxY - surfaceMinY;

      // Draw subtle background area for the overall UV surface
      bgCtx.fillStyle = "rgba(56, 189, 248, 0.03)";
      bgCtx.fillRect(surfaceMinX, surfaceMinY, surfaceWidth, surfaceHeight);

      // Draw subtle border around the overall UV surface area
      bgCtx.strokeStyle = "rgba(56, 189, 248, 0.25)";
      bgCtx.lineWidth = 1.5;
      bgCtx.setLineDash([6, 6]);
      bgCtx.strokeRect(surfaceMinX, surfaceMinY, surfaceWidth, surfaceHeight);
      bgCtx.setLineDash([]);

      // Draw UV mesh areas with borders
      uvData.meshes.forEach((mesh, meshIndex) => {
        let meshBounds = mesh.bounds;
        if (!meshBounds || !meshBounds.minU || meshBounds.minU === Infinity) {
          if (mesh.triangles && mesh.triangles.length > 0) {
            meshBounds = { minU: Infinity, minV: Infinity, maxU: -Infinity, maxV: -Infinity };
            mesh.triangles.forEach(triangle => {
              triangle.vertices.forEach(vertex => {
                meshBounds.minU = Math.min(meshBounds.minU, vertex.u);
                meshBounds.minV = Math.min(meshBounds.minV, vertex.v);
                meshBounds.maxU = Math.max(meshBounds.maxU, vertex.u);
                meshBounds.maxV = Math.max(meshBounds.maxV, vertex.v);
              });
            });
          } else {
            return;
          }
        }

        if (meshBounds.minU === Infinity || meshBounds.maxU === -Infinity) {
          return;
        }

        const meshTopLeft = uvToCanvas(meshBounds.minU, meshBounds.maxV);
        const meshBottomRight = uvToCanvas(meshBounds.maxU, meshBounds.minV);
        const meshMinX = meshTopLeft.x;
        const meshMinY = meshTopLeft.y;
        const meshMaxX = meshBottomRight.x;
        const meshMaxY = meshBottomRight.y;
        const meshWidth = meshMaxX - meshMinX;
        const meshHeight = meshMaxY - meshMinY;

        if (meshWidth <= 0 || meshHeight <= 0 || !isFinite(meshWidth) || !isFinite(meshHeight)) {
          return;
        }

        // Draw white/light background for each mesh area
        bgCtx.fillStyle = "rgba(255, 255, 255, 0.15)";
        bgCtx.fillRect(meshMinX, meshMinY, meshWidth, meshHeight);

        // Draw prominent border around each mesh area
        bgCtx.strokeStyle = "rgba(71, 85, 105, 0.8)";
        bgCtx.lineWidth = 2;
        bgCtx.strokeRect(meshMinX, meshMinY, meshWidth, meshHeight);

        // Draw inner border
        bgCtx.strokeStyle = "rgba(100, 116, 139, 0.4)";
        bgCtx.lineWidth = 1;
        bgCtx.strokeRect(meshMinX + 1, meshMinY + 1, meshWidth - 2, meshHeight - 2);
      });

      // Draw UV mesh edges
      bgCtx.strokeStyle = "rgba(100, 116, 139, 0.3)";
      bgCtx.lineWidth = 0.5;

      uvData.meshes.forEach((mesh, meshIndex) => {
        const hue = (meshIndex * 137.5) % 360;
        bgCtx.strokeStyle = `hsla(${hue}, 30%, 50%, 0.2)`;
        bgCtx.fillStyle = `hsla(${hue}, 30%, 50%, 0.05)`;

        mesh.triangles.forEach((triangle) => {
          const vertices = triangle.vertices.map((v) => uvToCanvas(v.u, v.v));

          bgCtx.beginPath();
          bgCtx.moveTo(vertices[0].x, vertices[0].y);
          bgCtx.lineTo(vertices[1].x, vertices[1].y);
          bgCtx.lineTo(vertices[2].x, vertices[2].y);
          bgCtx.closePath();
          bgCtx.fill();

          bgCtx.beginPath();
          bgCtx.moveTo(vertices[0].x, vertices[0].y);
          bgCtx.lineTo(vertices[1].x, vertices[1].y);
          bgCtx.lineTo(vertices[2].x, vertices[2].y);
          bgCtx.closePath();
          bgCtx.stroke();
        });
      });

      // Draw mesh labels
      bgCtx.font = "11px sans-serif";
      bgCtx.textAlign = "left";
      bgCtx.textBaseline = "top";

      uvData.meshes.forEach((mesh, meshIndex) => {
        let meshBounds = mesh.bounds;
        if (!meshBounds || !meshBounds.minU || meshBounds.minU === Infinity) {
          if (mesh.triangles && mesh.triangles.length > 0) {
            meshBounds = { minU: Infinity, minV: Infinity, maxU: -Infinity, maxV: -Infinity };
            mesh.triangles.forEach(triangle => {
              triangle.vertices.forEach(vertex => {
                meshBounds.minU = Math.min(meshBounds.minU, vertex.u);
                meshBounds.minV = Math.min(meshBounds.minV, vertex.v);
                meshBounds.maxU = Math.max(meshBounds.maxU, vertex.u);
                meshBounds.maxV = Math.max(meshBounds.maxV, vertex.v);
              });
            });
          } else {
            return;
          }
        }

        if (meshBounds.minU === Infinity || meshBounds.maxU === -Infinity) {
          return;
        }

        const labelPos = uvToCanvas(meshBounds.minU, meshBounds.maxV);
        const x = labelPos.x;
        const y = labelPos.y;
        const labelText = mesh.name || `Area ${meshIndex + 1}`;
        
        const metrics = bgCtx.measureText(labelText);
        const textWidth = metrics.width;
        const textHeight = 14;
        
        bgCtx.fillStyle = "rgba(15, 23, 42, 0.85)";
        bgCtx.fillRect(x + 4, y + 4, textWidth + 8, textHeight + 4);
        
        bgCtx.fillStyle = "rgba(226, 232, 240, 0.9)";
        bgCtx.font = "bold 11px sans-serif";
        bgCtx.fillText(labelText, x + 8, y + 8);
      });
    }
  }, [baseColor, uvData]);

  // Draw images and handles - optimized for frequent updates
  const drawImages = useCallback((positions, scales) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas and draw cached background
    if (backgroundCanvasRef.current) {
      ctx.drawImage(backgroundCanvasRef.current, 0, 0);
    } else {
      // Fallback: draw background if not cached yet
      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, width, height);
    }

    // Draw all images
    images.forEach((img, index) => {
      if (!img) return;
      
      const pos = positions[index] || { u: 0.5, v: 0.5 };
      const scale = scales[index] || { u: 0.3, v: 0.3 };
      const isSelected = index === selectedImageIndex;

      const baseWidth = width * scale.u;
      const baseHeight = height * scale.v;
      const imageAspect = img.width / img.height;
      const canvasAspect = baseWidth / baseHeight;
      
      let imageWidth, imageHeight;
      if (imageAspect > canvasAspect) {
        imageWidth = baseWidth;
        imageHeight = baseWidth / imageAspect;
      } else {
        imageHeight = baseHeight;
        imageWidth = baseHeight * imageAspect;
      }
      
      const x = width * pos.u - imageWidth / 2;
      const y = height * (1 - pos.v) - imageHeight / 2;
      const imageCenterX = width * pos.u;
      const imageCenterY = height * (1 - pos.v);

      // Draw image
      ctx.globalAlpha = isSelected ? 1 : 0.6;
      ctx.drawImage(img, x, y, imageWidth, imageHeight);
      ctx.globalAlpha = 1;

      // Draw border
      ctx.strokeStyle = isSelected ? "#10b981" : "#60a5fa";
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeRect(x, y, imageWidth, imageHeight);

      // Draw center point
      ctx.fillStyle = isSelected ? "#10b981" : "#60a5fa";
      ctx.beginPath();
      ctx.arc(imageCenterX, imageCenterY, isSelected ? 5 : 4, 0, Math.PI * 2);
      ctx.fill();

      // Draw indicator ring
      ctx.strokeStyle = isSelected ? "#10b981" : "#60a5fa";
      ctx.lineWidth = isSelected ? 2 : 1.5;
      ctx.beginPath();
      ctx.arc(imageCenterX, imageCenterY, isSelected ? 10 : 8, 0, Math.PI * 2);
      ctx.stroke();

      // Draw image number label
      ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
      ctx.fillRect(x + 4, y + 4, 24, 20);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText(`${index + 1}`, x + 12, y + 18);

      // Draw interactive handles for selected image
      if (isSelected) {
        const handleSize = 12;
        const handleColor = "#10b981";
        const handleStroke = "#ffffff";
        
        // Corner handles
        const corners = [
          { x: x, y: y, cursor: 'nw-resize', name: 'nw' },
          { x: x + imageWidth, y: y, cursor: 'ne-resize', name: 'ne' },
          { x: x, y: y + imageHeight, cursor: 'sw-resize', name: 'sw' },
          { x: x + imageWidth, y: y + imageHeight, cursor: 'se-resize', name: 'se' },
        ];
        
        // Edge handles
        const edges = [
          { x: x + imageWidth / 2, y: y, cursor: 'n-resize', name: 'n' },
          { x: x + imageWidth / 2, y: y + imageHeight, cursor: 's-resize', name: 's' },
          { x: x, y: y + imageHeight / 2, cursor: 'w-resize', name: 'w' },
          { x: x + imageWidth, y: y + imageHeight / 2, cursor: 'e-resize', name: 'e' },
        ];
        
        // Draw corner handles
        corners.forEach(corner => {
          ctx.fillStyle = handleColor;
          ctx.fillRect(corner.x - handleSize / 2, corner.y - handleSize / 2, handleSize, handleSize);
          ctx.strokeStyle = handleStroke;
          ctx.lineWidth = 2;
          ctx.strokeRect(corner.x - handleSize / 2, corner.y - handleSize / 2, handleSize, handleSize);
        });
        
        // Draw edge handles
        edges.forEach(edge => {
          ctx.fillStyle = handleColor;
          ctx.fillRect(edge.x - handleSize / 2, edge.y - handleSize / 2, handleSize, handleSize);
          ctx.strokeStyle = handleStroke;
          ctx.lineWidth = 2;
          ctx.strokeRect(edge.x - handleSize / 2, edge.y - handleSize / 2, handleSize, handleSize);
        });
        
        // Draw center move handle
        ctx.fillStyle = handleColor;
        ctx.beginPath();
        ctx.arc(imageCenterX, imageCenterY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = handleStroke;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw move icon in center
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(imageCenterX - 4, imageCenterY);
        ctx.lineTo(imageCenterX + 4, imageCenterY);
        ctx.moveTo(imageCenterX, imageCenterY - 4);
        ctx.lineTo(imageCenterX, imageCenterY + 4);
        ctx.stroke();
      }
    });
  }, [images, selectedImageIndex, baseColor]);

  // Main draw function - combines background and images
  const drawUVMap = useCallback(() => {
    // Redraw background if needed (when baseColor or uvData changes)
    drawBackground();
    // Draw images with current positions/scales
    drawImages(uvPositions, uvScales);
  }, [drawBackground, drawImages, uvPositions, uvScales]);

  useEffect(() => {
    if (isOpen) {
      // Reset background cache when baseColor or uvData changes
      backgroundCanvasRef.current = null;
      drawUVMap();
    }
    
    return () => {
      // Cleanup: cancel any pending animation frame
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isOpen, drawUVMap, baseColor, uvData]);

  const getImageBounds = useCallback((index) => {
    if (!images[index]) return null;
    const pos = uvPositions[index] || { u: 0.5, v: 0.5 };
    const scale = uvScales[index] || { u: 0.3, v: 0.3 };
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const width = canvas.width;
    const height = canvas.height;
    const img = images[index];
    
    const baseWidth = width * scale.u;
    const baseHeight = height * scale.v;
    const imageAspect = img.width / img.height;
    const canvasAspect = baseWidth / baseHeight;
    
    let imageWidth, imageHeight;
    if (imageAspect > canvasAspect) {
      imageWidth = baseWidth;
      imageHeight = baseWidth / imageAspect;
    } else {
      imageHeight = baseHeight;
      imageWidth = baseHeight * imageAspect;
    }
    
    const x = width * pos.u - imageWidth / 2;
    const y = height * (1 - pos.v) - imageHeight / 2;
    const centerX = width * pos.u;
    const centerY = height * (1 - pos.v);
    
    return { x, y, width: imageWidth, height: imageHeight, centerX, centerY };
  }, [images, uvPositions, uvScales]);

  const getHandleAtPoint = useCallback((px, py) => {
    if (!currentImage) return null;
    const bounds = getImageBounds(selectedImageIndex);
    if (!bounds) return null;
    
    const handleSize = 12;
    const threshold = handleSize / 2 + 5; // Slightly larger hit area
    
    // Check center move handle
    const distToCenter = Math.sqrt(
      Math.pow(px - bounds.centerX, 2) + Math.pow(py - bounds.centerY, 2)
    );
    if (distToCenter < 15) {
      return 'move';
    }
    
    // Check corner handles
    const corners = [
      { x: bounds.x, y: bounds.y, name: 'nw' },
      { x: bounds.x + bounds.width, y: bounds.y, name: 'ne' },
      { x: bounds.x, y: bounds.y + bounds.height, name: 'sw' },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height, name: 'se' },
    ];
    
    for (const corner of corners) {
      const dist = Math.sqrt(Math.pow(px - corner.x, 2) + Math.pow(py - corner.y, 2));
      if (dist < threshold) {
        return corner.name;
      }
    }
    
    // Check edge handles
    const edges = [
      { x: bounds.x + bounds.width / 2, y: bounds.y, name: 'n', check: (px, py) => Math.abs(px - bounds.x - bounds.width / 2) < threshold && Math.abs(py - bounds.y) < threshold },
      { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height, name: 's', check: (px, py) => Math.abs(px - bounds.x - bounds.width / 2) < threshold && Math.abs(py - (bounds.y + bounds.height)) < threshold },
      { x: bounds.x, y: bounds.y + bounds.height / 2, name: 'w', check: (px, py) => Math.abs(px - bounds.x) < threshold && Math.abs(py - bounds.y - bounds.height / 2) < threshold },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2, name: 'e', check: (px, py) => Math.abs(px - (bounds.x + bounds.width)) < threshold && Math.abs(py - bounds.y - bounds.height / 2) < threshold },
    ];
    
    for (const edge of edges) {
      if (edge.check(px, py)) {
        return edge.name;
      }
    }
    
    return null;
  }, [currentImage, selectedImageIndex, getImageBounds]);

  const handleMouseDown = useCallback(
    (e) => {
      if (!currentImage) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const canvasX = (e.clientX - rect.left) * (canvasRef.current.width / rect.width);
      const canvasY = (e.clientY - rect.top) * (canvasRef.current.height / rect.height);
      
      // First check for resize handles (corners, edges)
      const handle = getHandleAtPoint(canvasX, canvasY);
      
      // If no resize handle, check if clicking anywhere on the selected image
      if (!handle) {
        const bounds = getImageBounds(selectedImageIndex);
        if (bounds && 
            canvasX >= bounds.x && canvasX <= bounds.x + bounds.width &&
            canvasY >= bounds.y && canvasY <= bounds.y + bounds.height) {
          // Clicking anywhere on the image - start moving
          tempPositionsRef.current = [...uvPositions];
          tempScalesRef.current = [...uvScales];
          
          setIsDragging(true);
          setDragHandle('move');
          setDragStart({ x: e.clientX, y: e.clientY });
          return;
        }
      } else if (handle) {
        // Clicking on a resize handle
        tempPositionsRef.current = [...uvPositions];
        tempScalesRef.current = [...uvScales];
        
        setIsDragging(true);
        setDragHandle(handle);
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    },
    [currentImage, getHandleAtPoint, selectedImageIndex, getImageBounds, uvPositions, uvScales]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging || !currentImage || !dragHandle) return;
      
      // Cancel any pending animation frame
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      
      // Schedule update with requestAnimationFrame for smooth rendering
      rafRef.current = requestAnimationFrame(() => {
        const rect = canvasRef.current.getBoundingClientRect();
        const canvas = canvasRef.current;
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const deltaX = (e.clientX - dragStart.x) * scaleX;
        const deltaY = (e.clientY - dragStart.y) * scaleY;

        // Initialize temp refs if not set
        if (!tempPositionsRef.current) {
          tempPositionsRef.current = [...uvPositions];
        }
        if (!tempScalesRef.current) {
          tempScalesRef.current = [...uvScales];
        }

        if (dragHandle === 'move') {
          // Move the image
          const basePos = tempPositionsRef.current[selectedImageIndex] || { u: 0.5, v: 0.5 };
          const newU = Math.max(0, Math.min(1, basePos.u + deltaX / canvas.width));
          const newV = Math.max(0, Math.min(1, basePos.v - deltaY / canvas.height));
          tempPositionsRef.current[selectedImageIndex] = { u: newU, v: newV };
          
          // Draw immediately with temp positions (no prop update = no lag)
          drawImages(tempPositionsRef.current, tempScalesRef.current);
        } else {
          // Resize the image
          const baseScale = tempScalesRef.current[selectedImageIndex] || { u: 0.3, v: 0.3 };
          const img = images[selectedImageIndex];
          const imageAspect = img.width / img.height;
          
          let newScale = { ...baseScale };
          
          // Calculate scale change (account for canvas scaling)
          const scaleDeltaU = deltaX / canvas.width;
          const scaleDeltaV = -deltaY / canvas.height; // Negative because canvas Y is flipped
          
          // Calculate resize based on handle direction
          if (dragHandle.includes('e')) {
            // Resize from right edge
            newScale.u = Math.max(0.05, Math.min(1, baseScale.u + scaleDeltaU));
          }
          if (dragHandle.includes('w')) {
            // Resize from left edge
            newScale.u = Math.max(0.05, Math.min(1, baseScale.u - scaleDeltaU));
          }
          if (dragHandle.includes('s')) {
            // Resize from bottom edge
            newScale.v = Math.max(0.05, Math.min(1, baseScale.v + scaleDeltaV));
          }
          if (dragHandle.includes('n')) {
            // Resize from top edge
            newScale.v = Math.max(0.05, Math.min(1, baseScale.v - scaleDeltaV));
          }
          
          // Maintain aspect ratio for corner handles
          if (['nw', 'ne', 'sw', 'se'].includes(dragHandle)) {
            // Use the larger delta to determine which dimension to scale
            const absDeltaX = Math.abs(scaleDeltaU);
            const absDeltaV = Math.abs(scaleDeltaV);
            
            if (absDeltaX > absDeltaV) {
              // Scale based on width change
              newScale.v = newScale.u / imageAspect;
            } else {
              // Scale based on height change
              newScale.u = newScale.v * imageAspect;
            }
          }
          
          tempScalesRef.current[selectedImageIndex] = {
            u: Math.max(0.05, Math.min(1, newScale.u)),
            v: Math.max(0.05, Math.min(1, newScale.v)),
          };
          
          // Draw immediately with temp scales (no prop update = no lag)
          drawImages(tempPositionsRef.current, tempScalesRef.current);
        }
      });
      
      setDragStart({ x: e.clientX, y: e.clientY });
    },
    [isDragging, dragStart, dragHandle, currentImage, selectedImageIndex, uvPositions, uvScales, images, drawImages]
  );

  const handleMouseUp = useCallback(() => {
    // Cancel any pending animation frame
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    
    // Commit temporary changes to props
    if (tempPositionsRef.current) {
      onPositionsChange?.(tempPositionsRef.current);
      tempPositionsRef.current = null;
    }
    if (tempScalesRef.current) {
      onScalesChange?.(tempScalesRef.current);
      tempScalesRef.current = null;
    }
    
    setIsDragging(false);
    setDragHandle(null);
  }, [onPositionsChange, onScalesChange]);

  const handleClick = useCallback(
    (e) => {
      if (isDragging) return; // Don't process click if we just finished dragging
      const rect = canvasRef.current.getBoundingClientRect();
      const canvas = canvasRef.current;
      const canvasX = (e.clientX - rect.left) * (canvas.width / rect.width);
      const canvasY = (e.clientY - rect.top) * (canvas.height / rect.height);
      
      // Check if clicking on an image to select it
      for (let i = images.length - 1; i >= 0; i--) {
        const bounds = getImageBounds(i);
        if (bounds && 
            canvasX >= bounds.x && canvasX <= bounds.x + bounds.width &&
            canvasY >= bounds.y && canvasY <= bounds.y + bounds.height) {
          setSelectedImageIndex(i);
          return;
        }
      }
      
      // Removed: clicking on empty space no longer moves the image
    },
    [isDragging, selectedImageIndex, images, getImageBounds]
  );

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

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newImages = [];
    const newPositions = [...uvPositions];
    const newScales = [...uvScales];

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          newImages.push(img);
          if (newImages.length === files.length) {
            const updatedImages = [...images, ...newImages];
            // Add default positions and scales for new images
            while (newPositions.length < updatedImages.length) {
              newPositions.push({ u: 0.5, v: 0.5 });
            }
            while (newScales.length < updatedImages.length) {
              newScales.push({ u: 0.3, v: 0.3 });
            }
            onImagesChange?.(updatedImages);
            onPositionsChange?.(newPositions);
            onScalesChange?.(newScales);
            setSelectedImageIndex(updatedImages.length - 1);
          }
        };
        img.src = event.target?.result ?? "";
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPositions = uvPositions.filter((_, i) => i !== index);
    const newScales = uvScales.filter((_, i) => i !== index);
    onImagesChange?.(newImages);
    onPositionsChange?.(newPositions);
    onScalesChange?.(newScales);
    if (selectedImageIndex >= newImages.length) {
      setSelectedImageIndex(Math.max(0, newImages.length - 1));
    }
  };

  const handleScaleChange = (axis, value) => {
    const newScales = [...uvScales];
    if (!newScales[selectedImageIndex]) {
      newScales[selectedImageIndex] = { u: 0.3, v: 0.3 };
    }
    newScales[selectedImageIndex] = {
      ...newScales[selectedImageIndex],
      [axis]: parseFloat(value),
    };
    onScalesChange?.(newScales);
  };

  // Generate preview texture
  const previewTexture = useMemo(() => {
    if (!images || images.length === 0) {
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    images.forEach((img, index) => {
      const pos = uvPositions[index] || { u: 0.5, v: 0.5 };
      const scale = uvScales[index] || { u: 0.3, v: 0.3 };

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
    return texture;
  }, [images, uvPositions, uvScales, baseColor]);

  // Update parent texture when changes occur
  useEffect(() => {
    if (previewTexture && onTextureUpdate) {
      onTextureUpdate(previewTexture);
    }
  }, [previewTexture, onTextureUpdate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl w-[95vw] h-[90vh] max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-100">UV Map Editor</h2>
            {images.length > 0 && (
              <span className="text-sm text-slate-400">
                ({images.length} image{images.length > 1 ? 's' : ''})
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Controls */}
          <div className="w-72 border-r border-slate-800 p-4 overflow-y-auto">
            {/* Upload Section */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-200 mb-3">Upload Images</h3>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg hover:from-sky-400 hover:to-cyan-400 transition-all"
              >
                <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload Images
              </button>
            </div>

            {/* Image List */}
            {images.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-200 mb-3">Images</h3>
                <div className="space-y-2">
                  {images.map((img, index) => (
                    <div
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedImageIndex === index
                          ? "border-sky-500 bg-sky-500/10"
                          : "border-slate-800 bg-slate-950/50 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-200">Image {index + 1}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage(index);
                          }}
                          className="text-slate-400 hover:text-red-400"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <img
                        src={img.src}
                        alt={`Image ${index + 1}`}
                        className="w-full h-20 object-contain rounded"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Size Controls */}
            {currentImage && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-200 mb-3">Size</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Width: {((currentScale.u || 0.3) * 100).toFixed(0)}%</label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.01"
                      value={currentScale.u || 0.3}
                      onChange={(e) => handleScaleChange('u', e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Height: {((currentScale.v || 0.3) * 100).toFixed(0)}%</label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.01"
                      value={currentScale.v || 0.3}
                      onChange={(e) => handleScaleChange('v', e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Position Info */}
            {currentImage && (
              <div>
                <h3 className="text-sm font-semibold text-slate-200 mb-3">Position</h3>
                <div className="text-xs font-mono text-slate-400 space-y-1">
                  <div>U: {currentPosition.u.toFixed(3)}</div>
                  <div>V: {currentPosition.v.toFixed(3)}</div>
                </div>
              </div>
            )}
          </div>

          {/* Main Content Area - Split View */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Half - UV Map Canvas */}
            <div className="flex-1 p-4 overflow-auto border-r border-slate-800 flex flex-col">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-slate-200">UV Map</h3>
                <p className="text-xs text-slate-400">
                  {currentImage ? (
                    <>Drag center to move • Drag corners/edges to resize</>
                  ) : (
                    <>Click to position images</>
                  )}
                </p>
              </div>
              <div className="relative rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden flex-1 min-h-0 flex items-center justify-center">
                <canvas
                  ref={canvasRef}
                  width={1024}
                  height={1024}
                  className="max-w-full max-h-full w-auto h-auto"
                  style={{ 
                    imageRendering: "pixelated",
                    cursor: dragHandle ? 
                      (dragHandle === 'move' ? 'move' :
       dragHandle.includes('nw') || dragHandle.includes('se') ? 'nwse-resize' :
       dragHandle.includes('ne') || dragHandle.includes('sw') ? 'nesw-resize' :
       dragHandle.includes('n') || dragHandle.includes('s') ? 'ns-resize' :
       'ew-resize') : 
                      (currentImage ? 'default' : 'pointer')
                  }}
                  onMouseDown={handleMouseDown}
                  onClick={handleClick}
                  onMouseMove={(e) => {
                    if (!isDragging && currentImage) {
                      const rect = canvasRef.current.getBoundingClientRect();
                      const canvas = canvasRef.current;
                      const canvasX = (e.clientX - rect.left) * (canvas.width / rect.width);
                      const canvasY = (e.clientY - rect.top) * (canvas.height / rect.height);
                      const handle = getHandleAtPoint(canvasX, canvasY);
                      const canvasEl = canvasRef.current;
                      if (canvasEl) {
                        if (handle) {
                          // Show resize cursor for handles
                          canvasEl.style.cursor = 
                            handle.includes('nw') || handle.includes('se') ? 'nwse-resize' :
                            handle.includes('ne') || handle.includes('sw') ? 'nesw-resize' :
                            handle.includes('n') || handle.includes('s') ? 'ns-resize' :
                            'ew-resize';
                        } else {
                          // Check if hovering anywhere on the selected image
                          const bounds = getImageBounds(selectedImageIndex);
                          if (bounds && 
                              canvasX >= bounds.x && canvasX <= bounds.x + bounds.width &&
                              canvasY >= bounds.y && canvasY <= bounds.y + bounds.height) {
                            canvasEl.style.cursor = 'move';
                          } else {
                            canvasEl.style.cursor = 'default';
                          }
                        }
                      }
                    }
                  }}
                />
                {!currentImage && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-slate-400 mb-2">Upload images to start editing</p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-sky-400 hover:text-sky-300 underline"
                      >
                        Click to upload
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Half - 3D Preview */}
            <div className="flex-1 p-4 overflow-hidden flex flex-col">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-slate-200">3D Preview</h3>
                <p className="text-xs text-slate-400">Real-time preview of your design</p>
              </div>
              <div className="relative rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden flex-1 min-h-0">
                <Canvas shadows gl={{ antialias: true, preserveDrawingBuffer: true }} className="w-full h-full">
                  <PreviewScene
                    selectedModel={selectedModel}
                    selectedVariation={selectedVariation}
                    logoTexture={previewTexture}
                    baseColor={baseColor}
                  />
                </Canvas>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
