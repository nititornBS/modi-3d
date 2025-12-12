"use client";

import { useRef, useState, useCallback, useEffect } from "react";

export default function UVEditor({
  image,
  uvPosition = { u: 0.5, v: 0.5 },
  uvScale = { u: 0.3, v: 0.3 },
  onUVChange,
  baseColor = "#ffffff",
  uvData = null, // Model-specific UV data
}) {
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const drawUVMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, width, height);

    // Draw grid for reference
    ctx.strokeStyle = "rgba(148, 163, 184, 0.15)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 10; i++) {
      const x = (width / 10) * i;
      const y = (height / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw center lines
    ctx.strokeStyle = "rgba(148, 163, 184, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Draw actual UV mesh layout if available
    if (uvData && uvData.meshes && uvData.meshes.length > 0) {
      const bounds = uvData.bounds;
      const scaleU = width / (bounds.maxU - bounds.minU || 1);
      const scaleV = height / (bounds.maxV - bounds.minV || 1);
      const offsetU = -bounds.minU;
      const offsetV = -bounds.minV;

      // Draw UV mesh edges
      ctx.strokeStyle = "rgba(100, 116, 139, 0.4)";
      ctx.lineWidth = 1;

      uvData.meshes.forEach((mesh, meshIndex) => {
        // Use different colors for different meshes
        const hue = (meshIndex * 137.5) % 360;
        ctx.strokeStyle = `hsla(${hue}, 50%, 60%, 0.3)`;
        ctx.fillStyle = `hsla(${hue}, 50%, 60%, 0.1)`;

        mesh.triangles.forEach((triangle) => {
          const vertices = triangle.vertices.map((v) => ({
            x: (v.u + offsetU) * scaleU,
            y: (1 - (v.v + offsetV)) * scaleV, // Flip V coordinate
          }));

          // Fill triangle
          ctx.beginPath();
          ctx.moveTo(vertices[0].x, vertices[0].y);
          ctx.lineTo(vertices[1].x, vertices[1].y);
          ctx.lineTo(vertices[2].x, vertices[2].y);
          ctx.closePath();
          ctx.fill();

          // Stroke triangle edges
          ctx.beginPath();
          ctx.moveTo(vertices[0].x, vertices[0].y);
          ctx.lineTo(vertices[1].x, vertices[1].y);
          ctx.lineTo(vertices[2].x, vertices[2].y);
          ctx.closePath();
          ctx.stroke();
        });
      });

      // Draw mesh labels
      ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";

      uvData.meshes.forEach((mesh, meshIndex) => {
        if (mesh.bounds) {
          const x = (mesh.bounds.minU + offsetU) * scaleU;
          const y = (1 - (mesh.bounds.minV + offsetV)) * scaleV;
          ctx.fillText(mesh.name || `Mesh ${meshIndex}`, x + 2, y + 2);
        }
      });
    }

    // Draw image if available
    if (image) {
      // Maintain aspect ratio
      const baseWidth = width * uvScale.u;
      const baseHeight = height * uvScale.v;
      const imageAspect = image.width / image.height;
      const canvasAspect = baseWidth / baseHeight;
      
      let imageWidth, imageHeight;
      if (imageAspect > canvasAspect) {
        // Image is wider - fit to width
        imageWidth = baseWidth;
        imageHeight = baseWidth / imageAspect;
      } else {
        // Image is taller - fit to height
        imageHeight = baseHeight;
        imageWidth = baseHeight * imageAspect;
      }
      
      const x = width * uvPosition.u - imageWidth / 2;
      const y = height * uvPosition.v - imageHeight / 2;

      // Draw image
      ctx.drawImage(image, x, y, imageWidth, imageHeight);

      // Draw border around image
      ctx.strokeStyle = "#60a5fa";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, imageWidth, imageHeight);

      // Draw center point
      ctx.fillStyle = "#60a5fa";
      ctx.beginPath();
      ctx.arc(width * uvPosition.u, height * uvPosition.v, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Draw placeholder
      ctx.fillStyle = "rgba(148, 163, 184, 0.3)";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Upload an image to position it", width / 2, height / 2);
    }
  }, [image, uvPosition, uvScale, baseColor, uvData]);

  useEffect(() => {
    drawUVMap();
  }, [drawUVMap]);

  const handleMouseDown = useCallback(
    (e) => {
      if (!image) return;
      setIsDragging(true);
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setDragStart({ x, y });
    },
    [image]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging || !image) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const deltaX = x - dragStart.x;
      const deltaY = y - dragStart.y;

      const newU = Math.max(
        0,
        Math.min(1, uvPosition.u + deltaX / rect.width)
      );
      const newV = Math.max(
        0,
        Math.min(1, uvPosition.v + deltaY / rect.height)
      );

      onUVChange?.({ u: newU, v: newV });
      setDragStart({ x, y });
    },
    [isDragging, dragStart, uvPosition, image, onUVChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(
    (e) => {
      if (!image || isDragging) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const u = Math.max(0, Math.min(1, x / rect.width));
      const v = Math.max(0, Math.min(1, y / rect.height));

      onUVChange?.({ u, v });
    },
    [image, isDragging, onUVChange]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mouseleave", handleMouseUp);

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mouseleave", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs sm:text-[13px] mb-1">
        <span className="font-medium text-slate-200">UV Map Editor</span>
        <span className="font-mono text-[11px] text-slate-400">
          U: {uvPosition.u.toFixed(2)} V: {uvPosition.v.toFixed(2)}
        </span>
      </div>
      <div className="relative rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={512}
          height={512}
          className="w-full h-auto cursor-move"
          style={{ imageRendering: "pixelated" }}
          onMouseDown={handleMouseDown}
          onClick={handleClick}
        />
        {image && (
          <div className="absolute top-2 left-2 text-[10px] text-slate-400 bg-slate-950/80 px-2 py-1 rounded">
            Click or drag to position
          </div>
        )}
      </div>
      <div className="text-[10px] text-slate-500">
        {uvData
          ? "Model UV layout shown. Click or drag to position image on the surface."
          : "UV coordinates (0-1): Click anywhere or drag to move the image on the surface"}
      </div>
    </div>
  );
}

