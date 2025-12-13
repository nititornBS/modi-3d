"use client";

import { useRef, useState, useCallback, useEffect } from "react";

export default function UVEditor({
  images = [],
  uvPositions = [],
  uvScales = [],
  onEditClick,
  baseColor = "#ffffff",
  uvData = null, // Model-specific UV data
}) {
  const canvasRef = useRef(null);

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
      const uRange = bounds.maxU - bounds.minU || 1;
      const vRange = bounds.maxV - bounds.minV || 1;
      const scaleU = width / uRange;
      const scaleV = height / vRange;

      // Helper function to convert UV to canvas coordinates (with V flip)
      const uvToCanvas = (u, v) => {
        const x = (u - bounds.minU) * scaleU;
        const y = height - (v - bounds.minV) * scaleV; // Flip V: canvas Y=0 is top, UV V=0 is bottom
        return { x, y };
      };

      // Calculate the bounding rectangle of the UV surface area
      const surfaceTopLeft = uvToCanvas(bounds.minU, bounds.maxV); // Top-left in UV = top-left in canvas
      const surfaceBottomRight = uvToCanvas(bounds.maxU, bounds.minV); // Bottom-right in UV = bottom-right in canvas
      const surfaceMinX = surfaceTopLeft.x;
      const surfaceMinY = surfaceTopLeft.y;
      const surfaceMaxX = surfaceBottomRight.x;
      const surfaceMaxY = surfaceBottomRight.y;
      const surfaceWidth = surfaceMaxX - surfaceMinX;
      const surfaceHeight = surfaceMaxY - surfaceMinY;

      // Draw subtle background area for the overall UV surface (less prominent now)
      ctx.fillStyle = "rgba(56, 189, 248, 0.03)";
      ctx.fillRect(surfaceMinX, surfaceMinY, surfaceWidth, surfaceHeight);

      // Draw subtle border around the overall UV surface area (dashed, less prominent)
      ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(surfaceMinX, surfaceMinY, surfaceWidth, surfaceHeight);
      ctx.setLineDash([]);

      // Draw UV mesh areas with borders (like t-shirt pattern)
      uvData.meshes.forEach((mesh, meshIndex) => {
        // Calculate bounds from triangles if bounds not set
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
            return; // Skip if no triangles
          }
        }

        // Validate bounds
        if (meshBounds.minU === Infinity || meshBounds.maxU === -Infinity) {
          return; // Skip invalid bounds
        }

        // Calculate mesh bounds in canvas coordinates (with V flip)
        const meshTopLeft = uvToCanvas(meshBounds.minU, meshBounds.maxV);
        const meshBottomRight = uvToCanvas(meshBounds.maxU, meshBounds.minV);
        const meshMinX = meshTopLeft.x;
        const meshMinY = meshTopLeft.y;
        const meshMaxX = meshBottomRight.x;
        const meshMaxY = meshBottomRight.y;
        const meshWidth = meshMaxX - meshMinX;
        const meshHeight = meshMaxY - meshMinY;

        // Skip if dimensions are invalid
        if (meshWidth <= 0 || meshHeight <= 0 || !isFinite(meshWidth) || !isFinite(meshHeight)) {
          return;
        }

        // Draw white/light background for each mesh area (like t-shirt pattern)
        ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
        ctx.fillRect(meshMinX, meshMinY, meshWidth, meshHeight);

        // Draw prominent border around each mesh area (like t-shirt pattern borders)
        ctx.strokeStyle = "rgba(71, 85, 105, 0.8)"; // Dark grey border
        ctx.lineWidth = 2;
        ctx.strokeRect(meshMinX, meshMinY, meshWidth, meshHeight);

        // Draw inner border for extra definition
        ctx.strokeStyle = "rgba(100, 116, 139, 0.4)";
        ctx.lineWidth = 1;
        ctx.strokeRect(meshMinX + 1, meshMinY + 1, meshWidth - 2, meshHeight - 2);
      });

      // Draw UV mesh edges (triangle outlines)
      ctx.strokeStyle = "rgba(100, 116, 139, 0.3)";
      ctx.lineWidth = 0.5;

      uvData.meshes.forEach((mesh, meshIndex) => {
        // Use subtle colors for different meshes
        const hue = (meshIndex * 137.5) % 360;
        ctx.strokeStyle = `hsla(${hue}, 30%, 50%, 0.2)`;
        ctx.fillStyle = `hsla(${hue}, 30%, 50%, 0.05)`;

        mesh.triangles.forEach((triangle) => {
          const vertices = triangle.vertices.map((v) => uvToCanvas(v.u, v.v));

          // Fill triangle with subtle color
          ctx.beginPath();
          ctx.moveTo(vertices[0].x, vertices[0].y);
          ctx.lineTo(vertices[1].x, vertices[1].y);
          ctx.lineTo(vertices[2].x, vertices[2].y);
          ctx.closePath();
          ctx.fill();

          // Stroke triangle edges (subtle)
          ctx.beginPath();
          ctx.moveTo(vertices[0].x, vertices[0].y);
          ctx.lineTo(vertices[1].x, vertices[1].y);
          ctx.lineTo(vertices[2].x, vertices[2].y);
          ctx.closePath();
          ctx.stroke();
        });
      });

      // Draw mesh labels with background (like t-shirt pattern labels)
      ctx.font = "11px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";

      uvData.meshes.forEach((mesh, meshIndex) => {
        // Calculate bounds from triangles if bounds not set
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
            return; // Skip if no triangles
          }
        }

        // Validate bounds
        if (meshBounds.minU === Infinity || meshBounds.maxU === -Infinity) {
          return; // Skip invalid bounds
        }

        const labelPos = uvToCanvas(meshBounds.minU, meshBounds.maxV);
        const x = labelPos.x;
        const y = labelPos.y;
        const labelText = mesh.name || `Area ${meshIndex + 1}`;
        
        // Measure text for background
        const metrics = ctx.measureText(labelText);
        const textWidth = metrics.width;
        const textHeight = 14;
        
        // Draw label background
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.fillRect(x + 4, y + 4, textWidth + 8, textHeight + 4);
        
        // Draw label text
        ctx.fillStyle = "rgba(226, 232, 240, 0.9)";
        ctx.font = "bold 11px sans-serif";
        ctx.fillText(labelText, x + 8, y + 8);
      });

    }

    // Draw all images (preview mode)
    images.forEach((img, index) => {
      if (!img) return;
      
      const pos = uvPositions[index] || { u: 0.5, v: 0.5 };
      const scale = uvScales[index] || { u: 0.3, v: 0.3 };

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

      // Draw image with reduced opacity for preview
      ctx.globalAlpha = 0.7;
      ctx.drawImage(img, x, y, imageWidth, imageHeight);
      ctx.globalAlpha = 1;

      // Draw subtle border
      ctx.strokeStyle = "#60a5fa";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, imageWidth, imageHeight);
    });

    if (images.length === 0) {
      // Draw placeholder
      ctx.fillStyle = "rgba(148, 163, 184, 0.3)";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Click to edit UV mapping", width / 2, height / 2);
    }
  }, [images, uvPositions, uvScales, baseColor, uvData]);

  useEffect(() => {
    drawUVMap();
  }, [drawUVMap]);

  const handleClick = useCallback(() => {
    onEditClick?.();
  }, [onEditClick]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs sm:text-[13px] mb-1">
        <span className="font-medium text-slate-200">UV Map Preview</span>
        {images.length > 0 && (
          <span className="text-[10px] text-slate-400">
            {images.length} image{images.length > 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div className="relative rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={512}
          height={512}
          className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
          style={{ imageRendering: "pixelated" }}
          onClick={handleClick}
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-slate-950/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-slate-700/50">
            <p className="text-xs text-slate-300 font-medium">Click to edit</p>
          </div>
        </div>
        {images.length > 0 && (
          <div className="absolute top-2 left-2 text-[10px] text-slate-400 bg-slate-950/80 px-2 py-1 rounded">
            {images.length} image{images.length > 1 ? 's' : ''} loaded
          </div>
        )}
      </div>
      <div className="text-[10px] text-slate-500">
        {uvData
          ? "Preview of UV layout. Click to open editor and position images."
          : "Click to open UV editor and upload images"}
      </div>
    </div>
  );
}

