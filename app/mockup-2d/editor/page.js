"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { TEMPLATES } from "../templates";

// Helper function to apply perspective transformation using 4 points
// Constrains image to the 4-point area while maintaining aspect ratio and size
function applyPerspectiveTransform(ctx, srcX, srcY, srcWidth, srcHeight, dstPoints) {
  // Calculate bounding box of the 4 points
  const minX = Math.min(dstPoints[0].x, dstPoints[1].x, dstPoints[2].x, dstPoints[3].x);
  const maxX = Math.max(dstPoints[0].x, dstPoints[1].x, dstPoints[2].x, dstPoints[3].x);
  const minY = Math.min(dstPoints[0].y, dstPoints[1].y, dstPoints[2].y, dstPoints[3].y);
  const maxY = Math.max(dstPoints[0].y, dstPoints[1].y, dstPoints[2].y, dstPoints[3].y);
  
  const boundingWidth = maxX - minX;
  const boundingHeight = maxY - minY;
  
  // Calculate average distances for width and height from the 4 points
  const avgWidth = (
    Math.abs(dstPoints[1].x - dstPoints[0].x) +
    Math.abs(dstPoints[2].x - dstPoints[3].x)
  ) / 2;
  const avgHeight = (
    Math.abs(dstPoints[3].y - dstPoints[0].y) +
    Math.abs(dstPoints[2].y - dstPoints[1].y)
  ) / 2;
  
  // Use the smaller of bounding box or average distances to maintain size
  const targetWidth = Math.min(boundingWidth, avgWidth);
  const targetHeight = Math.min(boundingHeight, avgHeight);
  
  // Calculate scale to fit image within target area while maintaining aspect ratio
  const scaleX = targetWidth / srcWidth;
  const scaleY = targetHeight / srcHeight;
  const scale = Math.min(scaleX, scaleY, 1.0); // Don't scale up, maintain aspect ratio
  
  // Calculate center of source image
  const srcCenterX = srcX + srcWidth / 2;
  const srcCenterY = srcY + srcHeight / 2;
  
  // Calculate center of destination (average of 4 points)
  const dstCenterX = (dstPoints[0].x + dstPoints[1].x + dstPoints[2].x + dstPoints[3].x) / 4;
  const dstCenterY = (dstPoints[0].y + dstPoints[1].y + dstPoints[2].y + dstPoints[3].y) / 4;
  
  // Calculate vectors for top and left edges (normalized)
  const topVecX = dstPoints[1].x - dstPoints[0].x;
  const topVecY = dstPoints[1].y - dstPoints[0].y;
  const topLength = Math.sqrt(topVecX * topVecX + topVecY * topVecY);
  const topNormX = topLength > 0 ? topVecX / topLength : 1;
  const topNormY = topLength > 0 ? topVecY / topLength : 0;
  
  const leftVecX = dstPoints[3].x - dstPoints[0].x;
  const leftVecY = dstPoints[3].y - dstPoints[0].y;
  const leftLength = Math.sqrt(leftVecX * leftVecX + leftVecY * leftVecY);
  const leftNormX = leftLength > 0 ? leftVecX / leftLength : 0;
  const leftNormY = leftLength > 0 ? leftVecY / leftLength : 1;
  
  // Calculate rotation from top edge
  const angle = Math.atan2(topNormY, topNormX);
  
  // Calculate skew (shear) from the perpendicularity of top and left edges
  const dotProduct = topNormX * leftNormX + topNormY * leftNormY;
  const skewX = dotProduct * 0.3; // Limit skew to prevent wild distortion
  
  // Apply transformations: translate to destination center, rotate, scale, apply limited skew
  ctx.translate(dstCenterX, dstCenterY);
  ctx.rotate(angle);
  ctx.transform(scale, 0, skewX * scale, scale, 0, 0);
  ctx.translate(-srcCenterX, -srcCenterY);
}

// Helper function to check if a point is inside a polygon (using ray casting algorithm)
function isPointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Helper function to get bounding box of 4 points with padding for image size
function getConstrainedBounds(points, imageWidth, imageHeight) {
  const minX = Math.min(points[0].x, points[1].x, points[2].x, points[3].x);
  const maxX = Math.max(points[0].x, points[1].x, points[2].x, points[3].x);
  const minY = Math.min(points[0].y, points[1].y, points[2].y, points[3].y);
  const maxY = Math.max(points[0].y, points[1].y, points[2].y, points[3].y);
  
  // Add padding to account for image dimensions (half width/height on each side)
  return {
    minX: minX + imageWidth / 2,
    maxX: maxX - imageWidth / 2,
    minY: minY + imageHeight / 2,
    maxY: maxY - imageHeight / 2
  };
}

export default function Mockup2DEditorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const templateId = searchParams.get("template");
  
  const [bannerImage, setBannerImage] = useState(null);
  const [userDesigns, setUserDesigns] = useState([]); // Array of design objects
  const [selectedDesignId, setSelectedDesignId] = useState(null); // Currently selected design
  const [isProcessing, setIsProcessing] = useState(false);
  const canvasRef = useRef(null);
  const bannerImageRef = useRef(null);
  const userDesignsRef = useRef({}); // Map of designId -> image object
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggingDesignId, setDraggingDesignId] = useState(null);
  const [zoom, setZoom] = useState(1.0);
  const baseScaleRef = useRef(1.0);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const panInitialRef = useRef({ mouse: { x: 0, y: 0 }, offset: { x: 0, y: 0 } });
  const [is4PointMode, setIs4PointMode] = useState(false);
  const [perspectivePoints, setPerspectivePoints] = useState([]); // Array of 4 points for current design
  const dragInitialRef = useRef({ position: { x: 0, y: 0 }, mouseX: 0, mouseY: 0 }); // Track initial drag state
  const [showMappingArea, setShowMappingArea] = useState(false); // Show mapping overlay
  const mappingAreaRef = useRef(null); // Ref for mapping area div
  const [isDraggingInMapping, setIsDraggingInMapping] = useState(false); // Track dragging in mapping area

  const currentTemplate =
    (templateId && TEMPLATES[templateId]) || TEMPLATES["billboard-street"];

  // Draw composite image
  const drawComposite = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bannerImageRef.current || !currentTemplate || !containerRef.current) return;

    const ctx = canvas.getContext("2d");
    const banner = bannerImageRef.current;
    
    // Use actual image dimensions for real scale (internal canvas)
    const actualWidth = banner.naturalWidth || banner.width;
    const actualHeight = banner.naturalHeight || banner.height;
    canvas.width = actualWidth;
    canvas.height = actualHeight;
    
    // Calculate scale based on container size and image dimensions
    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Calculate base scale to fit container while maintaining aspect ratio
    const scaleX = containerWidth / actualWidth;
    const scaleY = containerHeight / actualHeight;
    const baseScale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 100%
    baseScaleRef.current = baseScale;
    
    // Apply zoom to base scale
    const previewScale = baseScale * zoom;
    
    // Calculate display dimensions maintaining aspect ratio
    const displayWidth = actualWidth * previewScale;
    const displayHeight = actualHeight * previewScale;
    
    // Set display size based on calculated scale with zoom
    // Remove maxWidth constraint to allow zooming beyond container
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    canvas.style.maxWidth = 'none';
    canvas.style.maxHeight = 'none';
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(banner, 0, 0, canvas.width, canvas.height);
    
    // Draw all user designs
    userDesigns.forEach((designData) => {
      const design = userDesignsRef.current[designData.id];
      if (!design) return;
      
      // Only draw if we have valid intrinsic size
      if (design.naturalWidth > 0 && design.naturalHeight > 0) {
        const designAspect = design.width / design.height;
        
        const billboardAreaWidth = canvas.width * currentTemplate.areaWidth;
        const billboardAreaHeight = canvas.height * currentTemplate.areaHeight;
        
        const designWidth = billboardAreaWidth * designData.scale;
        const designHeight = designWidth / designAspect;
        
        // Only apply padding constraint for non-card categories or when scale is reasonable
        // Cards can scale up to 200% as per slider max
        let finalWidth = designWidth;
        let finalHeight = designHeight;
        
        if (currentTemplate.category !== "card" && designData.scale > 0.95) {
          // For non-cards, limit to 95% if scale exceeds it
          const padding = 0.95;
          const maxWidth = billboardAreaWidth * padding;
          const maxHeight = billboardAreaHeight * padding;
          
          if (finalWidth > maxWidth || finalHeight > maxHeight) {
            const widthRatio = maxWidth / finalWidth;
            const heightRatio = maxHeight / finalHeight;
            const scaleRatio = Math.min(widthRatio, heightRatio);
            finalWidth *= scaleRatio;
            finalHeight *= scaleRatio;
          }
        }
        
        // Use absolute coordinates if set, otherwise default to center of billboard
        let designX, designY;
        if (designData.position.x !== null && designData.position.y !== null) {
          // Absolute pixel coordinates - center the image at the position
          designX = designData.position.x - (finalWidth / 2);
          designY = designData.position.y - (finalHeight / 2);
        } else {
          // Default to center of billboard area
          const billboardStartX = canvas.width * currentTemplate.areaX;
          const billboardStartY = canvas.height * currentTemplate.areaY;
          designX = billboardStartX + (billboardAreaWidth / 2) - (finalWidth / 2);
          designY = billboardStartY + (billboardAreaHeight / 2) - (finalHeight / 2);
        }
        
        ctx.save();
        // Only apply drop shadow if category is not "banner"
        if (currentTemplate.category !== "banner") {
          ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
          ctx.shadowBlur = 15;
          ctx.shadowOffsetX = 3;
          ctx.shadowOffsetY = 3;
        }
        ctx.globalCompositeOperation = 'source-over';
        
        // Check if 4-point perspective is set
        if (designData.perspectivePoints && designData.perspectivePoints.length === 4) {
          // Use 4-point perspective transformation
          applyPerspectiveTransform(
            ctx,
            designX,
            designY,
            finalWidth,
            finalHeight,
            designData.perspectivePoints
          );
          ctx.drawImage(design, designX, designY, finalWidth, finalHeight);
        } else {
          // Use standard transformation
          const centerX = designX + finalWidth / 2;
          const centerY = designY + finalHeight / 2;
          
          // Move to center for transformations
          ctx.translate(centerX, centerY);
          
          // Apply user rotation (starts at 0, only rotates when slider is adjusted)
          const userRotation = designData.rotation !== undefined ? designData.rotation : 0;
          if (userRotation !== 0) {
            ctx.rotate((userRotation * Math.PI) / 180);
          }
          
          // Move back to draw at correct position
          ctx.translate(-centerX, -centerY);
          
          ctx.drawImage(design, designX, designY, finalWidth, finalHeight);
        }
        ctx.restore();
        
        // Draw 4-point perspective indicators if points are set
        if (designData.perspectivePoints && designData.perspectivePoints.length > 0) {
          ctx.save();
          ctx.strokeStyle = '#8b5cf6'; // Purple color
          ctx.fillStyle = '#8b5cf6';
          ctx.lineWidth = 2;
          
          designData.perspectivePoints.forEach((point, index) => {
            // Draw point
            ctx.beginPath();
            ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw number label
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText((index + 1).toString(), point.x, point.y - 20);
            ctx.fillStyle = '#8b5cf6';
            
            // Draw connecting lines if we have multiple points
            if (index > 0) {
              ctx.beginPath();
              ctx.moveTo(designData.perspectivePoints[index - 1].x, designData.perspectivePoints[index - 1].y);
              ctx.lineTo(point.x, point.y);
              ctx.stroke();
            }
          });
          
          // Draw line from last to first if we have 4 points
          if (designData.perspectivePoints.length === 4) {
            ctx.beginPath();
            ctx.moveTo(designData.perspectivePoints[3].x, designData.perspectivePoints[3].y);
            ctx.lineTo(designData.perspectivePoints[0].x, designData.perspectivePoints[0].y);
            ctx.stroke();
          }
          
          ctx.restore();
        }
      }
    });
  }, [userDesigns, currentTemplate, zoom, is4PointMode]);

  // Load banner image on mount / when template changes
  useEffect(() => {
    if (!currentTemplate) {
      router.push("/mockup-2d");
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setBannerImage(img);
      bannerImageRef.current = img;
      drawComposite();
    };
    img.src = currentTemplate.image;
  }, [currentTemplate?.image, router, drawComposite]);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const designId = `design-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          // Initialize position to center of billboard area
          let initialPosition = { x: null, y: null };
          if (bannerImageRef.current && currentTemplate) {
            const canvasWidth = bannerImageRef.current.naturalWidth || bannerImageRef.current.width;
            const canvasHeight = bannerImageRef.current.naturalHeight || bannerImageRef.current.height;
            const billboardAreaWidth = canvasWidth * currentTemplate.areaWidth;
            const billboardAreaHeight = canvasHeight * currentTemplate.areaHeight;
            const billboardStartX = canvasWidth * currentTemplate.areaX;
            const billboardStartY = canvasHeight * currentTemplate.areaY;
            
            initialPosition = {
              x: billboardStartX + (billboardAreaWidth / 2),
              y: billboardStartY + (billboardAreaHeight / 2)
            };
          }
          
          // Ensure image has dimensions (sometimes naturalWidth/Height aren't immediately available)
          if (!img.naturalWidth || !img.naturalHeight) {
            // Wait a bit for dimensions to be available
            setTimeout(() => {
              addDesign();
            }, 50);
          } else {
            addDesign();
          }
          
          function addDesign() {
            // Store image reference BEFORE state update to ensure it's available when drawComposite runs
            userDesignsRef.current[designId] = img;
            
            // Add to designs array - useEffect will trigger drawComposite when userDesigns changes
            setUserDesigns((prev) => [
              ...prev,
              {
                id: designId,
                src: dataUrl,
                position: initialPosition,
                scale: 0.3,
                rotation: 0, // Rotation in degrees
                perspectivePoints: [], // 4-point perspective points
              },
            ]);
            
            // Select the newly added design
            setSelectedDesignId(designId);
            
            // Force a redraw after state update to ensure image appears immediately
            requestAnimationFrame(() => {
              setTimeout(() => {
                if (bannerImageRef.current && canvasRef.current) {
                  drawComposite();
                }
              }, 0);
            });
          }
        };
        img.onerror = (error) => {
          console.error("Error loading image:", error);
        };
        img.src = dataUrl;
      };
      reader.onerror = (error) => {
        console.error("Error reading file:", error);
      };
      reader.readAsDataURL(file);
    });
    
    // Reset input
    e.target.value = '';
  };

  useEffect(() => {
    if (bannerImageRef.current) {
      drawComposite();
    }
  }, [drawComposite, userDesigns]);

  // Handle window resize to recalculate preview scale
  useEffect(() => {
    const handleResize = () => {
      if (bannerImageRef.current) {
        drawComposite();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawComposite]);

  // Handle document-level mouse events for mapping area dragging
  useEffect(() => {
    if (!isDraggingInMapping) return;

    const handleDocumentMouseMove = (e) => {
      handleMouseMove(e);
    };

    const handleDocumentMouseUp = () => {
      handleMouseUp();
    };

    document.addEventListener('mousemove', handleDocumentMouseMove);
    document.addEventListener('mouseup', handleDocumentMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleDocumentMouseMove);
      document.removeEventListener('mouseup', handleDocumentMouseUp);
    };
  }, [isDraggingInMapping, userDesigns, selectedDesignId]);

  // Zoom functions
  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3.0)); // Max zoom 3x
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.25)); // Min zoom 0.25x
  };

  const handleZoomReset = () => {
    setZoom(1.0);
    setPanOffset({ x: 0, y: 0 }); // Reset pan when resetting zoom
  };

  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((prev) => Math.max(0.25, Math.min(3.0, prev + delta)));
    }
  };

  const handleMouseDown = (e) => {
    // Find which design was clicked (if any)
    // When transform is on wrapper, canvas rect is still correct, but we need to account for transform
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    // Calculate coordinates relative to canvas (transform on wrapper doesn't affect canvas rect)
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    let clickedDesignId = null;
    
    // Check each design to see if click is within bounds (only if designs exist)
    if (userDesigns.length > 0) {
      for (let i = userDesigns.length - 1; i >= 0; i--) {
        const designData = userDesigns[i];
        const design = userDesignsRef.current[designData.id];
        if (!design) continue;
        
        const designAspect = design.width / design.height;
        const billboardAreaWidth = canvasRef.current.width * currentTemplate.areaWidth;
        const billboardAreaHeight = canvasRef.current.height * currentTemplate.areaHeight;
        const designWidth = billboardAreaWidth * designData.scale;
        const designHeight = designWidth / designAspect;
        
        let designX, designY;
        if (designData.position.x !== null && designData.position.y !== null) {
          designX = designData.position.x - (designWidth / 2);
          designY = designData.position.y - (designHeight / 2);
        } else {
          const billboardStartX = canvasRef.current.width * currentTemplate.areaX;
          const billboardStartY = canvasRef.current.height * currentTemplate.areaY;
          designX = billboardStartX + (billboardAreaWidth / 2) - (designWidth / 2);
          designY = billboardStartY + (billboardAreaHeight / 2) - (designHeight / 2);
        }
        
        if (x >= designX && x <= designX + designWidth && y >= designY && y <= designY + designHeight) {
          clickedDesignId = designData.id;
          break;
        }
      }
    }
    
    // Handle 4-point perspective mode - only when actively collecting points
    if (is4PointMode && selectedDesignId) {
      const currentPoints = userDesigns.find(d => d.id === selectedDesignId)?.perspectivePoints || [];
      // Only add points if we're still collecting (less than 4 points) and clicked outside the design
      if (currentPoints.length < 4 && !clickedDesignId) {
        const newPoints = [...currentPoints, { x, y }];
        setUserDesigns((prev) =>
          prev.map((design) =>
            design.id === selectedDesignId
              ? { ...design, perspectivePoints: newPoints }
              : design
          )
        );
        
        // If we've collected 4 points, exit 4-point mode and show mapping area
        if (newPoints.length === 4) {
          setIs4PointMode(false);
          setShowMappingArea(true);
        }
        return;
      }
    }
    
    if (clickedDesignId) {
      // Clicked on a design - always allow dragging (even with 4 points set)
      setSelectedDesignId(clickedDesignId);
      setIsDragging(true);
      setDraggingDesignId(clickedDesignId);
      setIsPanning(false); // Ensure panning is disabled when dragging design
      
      // Store initial drag state (position and mouse coordinates)
      const design = userDesigns.find(d => d.id === clickedDesignId);
      if (design) {
        dragInitialRef.current = {
          position: design.position.x !== null && design.position.y !== null 
            ? { x: design.position.x, y: design.position.y }
            : { x, y },
          mouseX: x,
          mouseY: y
        };
      }
    } else if (zoom > 1.0) {
      // Clicked on empty area and zoomed in - enable panning
      setIsPanning(true);
      panInitialRef.current = {
        mouse: { x: e.clientX, y: e.clientY },
        offset: { ...panOffset }
      };
      setSelectedDesignId(null);
    } else {
      // Clicked on empty area and not zoomed - just deselect
      setSelectedDesignId(null);
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      // Pan the canvas - calculate new offset based on mouse movement from initial click
      const deltaX = e.clientX - panInitialRef.current.mouse.x;
      const deltaY = e.clientY - panInitialRef.current.mouse.y;
      setPanOffset({
        x: panInitialRef.current.offset.x + deltaX,
        y: panInitialRef.current.offset.y + deltaY
      });
      return;
    }
    
    // Handle dragging in mapping area
    if (isDraggingInMapping && selectedDesignId && mappingAreaRef.current) {
      const selectedDesign = userDesigns.find(d => d.id === selectedDesignId);
      if (!selectedDesign || !selectedDesign.perspectivePoints || selectedDesign.perspectivePoints.length !== 4) return;
      
      const points = selectedDesign.perspectivePoints;
      const minX = Math.min(points[0].x, points[1].x, points[2].x, points[3].x);
      const maxX = Math.max(points[0].x, points[1].x, points[2].x, points[3].x);
      const minY = Math.min(points[0].y, points[1].y, points[2].y, points[3].y);
      const maxY = Math.max(points[0].y, points[1].y, points[2].y, points[3].y);
      
      const mappingWidth = maxX - minX;
      const mappingHeight = maxY - minY;
      
      const rect = mappingAreaRef.current.getBoundingClientRect();
      const displayWidth = rect.width;
      const displayHeight = rect.height;
      
      // Calculate position relative to mapping area
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;
      
      // Map to canvas coordinates (0 to displayWidth -> minX to maxX)
      const canvasX = (relX / displayWidth) * mappingWidth + minX;
      const canvasY = (relY / displayHeight) * mappingHeight + minY;
      
      // Clamp to mapping area bounds
      const newX = Math.max(minX, Math.min(maxX, canvasX));
      const newY = Math.max(minY, Math.min(maxY, canvasY));
      
      setUserDesigns((prev) =>
        prev.map((design) =>
          design.id === selectedDesignId
            ? { ...design, position: { x: newX, y: newY } }
            : design
        )
      );
      return;
    }
    
    if (!isDragging || !draggingDesignId || !currentTemplate) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    // Calculate coordinates relative to canvas (transform on wrapper doesn't affect canvas rect)
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // Calculate delta from initial drag position
    const deltaX = x - dragInitialRef.current.mouseX;
    const deltaY = y - dragInitialRef.current.mouseY;
    
    // Calculate new position
    let newX = dragInitialRef.current.position.x + deltaX;
    let newY = dragInitialRef.current.position.y + deltaY;
    
    setUserDesigns((prev) =>
      prev.map((design) => {
        if (design.id !== draggingDesignId) return design;
        
        // If 4 points are set, constrain movement within that area
        if (design.perspectivePoints && design.perspectivePoints.length === 4) {
          // Get image dimensions
          const img = userDesignsRef.current[design.id];
          if (img) {
            const designAspect = img.width / img.height;
            const billboardAreaWidth = canvas.width * currentTemplate.areaWidth;
            const billboardAreaHeight = canvas.height * currentTemplate.areaHeight;
            const designWidth = billboardAreaWidth * design.scale;
            const designHeight = designWidth / designAspect;
            
            // Get constrained bounds within the 4-point area
            const bounds = getConstrainedBounds(design.perspectivePoints, designWidth, designHeight);
            
            // Clamp position to stay within the 4-point area
            newX = Math.max(bounds.minX, Math.min(bounds.maxX, newX));
            newY = Math.max(bounds.minY, Math.min(bounds.maxY, newY));
          }
        } else {
          // Clamp to canvas boundaries if no 4 points
          const canvasWidth = canvas.width;
          const canvasHeight = canvas.height;
          newX = Math.max(0, Math.min(canvasWidth, newX));
          newY = Math.max(0, Math.min(canvasHeight, newY));
        }
        
        // Update position (4 points stay fixed)
        return { ...design, position: { x: newX, y: newY } };
      })
    );
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggingDesignId(null);
    setIsPanning(false);
    setIsDraggingInMapping(false);
  };

  const handleExport = () => {
    if (!bannerImageRef.current || !currentTemplate || userDesigns.length === 0) return;
    
    const banner = bannerImageRef.current;
    const exportCanvas = document.createElement("canvas");
    const ctx = exportCanvas.getContext("2d");
    
    // Use actual image dimensions for export
    const actualWidth = banner.naturalWidth || banner.width;
    const actualHeight = banner.naturalHeight || banner.height;
    exportCanvas.width = actualWidth;
    exportCanvas.height = actualHeight;
    
    ctx.drawImage(banner, 0, 0, exportCanvas.width, exportCanvas.height);
    
    // Draw all user designs
    const previewCanvas = canvasRef.current;
    const scaleX = exportCanvas.width / previewCanvas.width;
    const scaleY = exportCanvas.height / previewCanvas.height;
    
    userDesigns.forEach((designData) => {
      const design = userDesignsRef.current[designData.id];
      if (!design) return;
      
      const designAspect = design.width / design.height;
      const billboardAreaWidth = exportCanvas.width * currentTemplate.areaWidth;
      const billboardAreaHeight = exportCanvas.height * currentTemplate.areaHeight;
      
      const designWidth = billboardAreaWidth * designData.scale;
      const designHeight = designWidth / designAspect;
      
      // Only apply padding constraint for non-card categories or when scale is reasonable
      // Cards can scale up to 200% as per slider max
      let finalWidth = designWidth;
      let finalHeight = designHeight;
      
      if (currentTemplate.category !== "card" && designData.scale > 0.95) {
        // For non-cards, limit to 95% if scale exceeds it
        const padding = 0.95;
        const maxWidth = billboardAreaWidth * padding;
        const maxHeight = billboardAreaHeight * padding;
        
        if (finalWidth > maxWidth || finalHeight > maxHeight) {
          const widthRatio = maxWidth / finalWidth;
          const heightRatio = maxHeight / finalHeight;
          const scaleRatio = Math.min(widthRatio, heightRatio);
          finalWidth *= scaleRatio;
          finalHeight *= scaleRatio;
        }
      }
      
      let designX, designY;
      if (designData.position.x !== null && designData.position.y !== null) {
        // Use absolute coordinates scaled to export canvas size
        designX = (designData.position.x * scaleX) - (finalWidth / 2);
        designY = (designData.position.y * scaleY) - (finalHeight / 2);
      } else {
        // Default to center of billboard area
        const billboardStartX = exportCanvas.width * currentTemplate.areaX;
        const billboardStartY = exportCanvas.height * currentTemplate.areaY;
        designX = billboardStartX + (billboardAreaWidth / 2) - (finalWidth / 2);
        designY = billboardStartY + (billboardAreaHeight / 2) - (finalHeight / 2);
      }
      
      ctx.save();
      // Only apply drop shadow if category is not "banner"
      if (currentTemplate.category !== "banner") {
        ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 4;
      }
      
      // Check if 4-point perspective is set
      if (designData.perspectivePoints && designData.perspectivePoints.length === 4) {
        // Scale perspective points to export canvas size
        const scaledPoints = designData.perspectivePoints.map(point => ({
          x: point.x * scaleX,
          y: point.y * scaleY
        }));
        // Use 4-point perspective transformation
        applyPerspectiveTransform(
          ctx,
          designX,
          designY,
          finalWidth,
          finalHeight,
          scaledPoints
        );
        ctx.drawImage(design, designX, designY, finalWidth, finalHeight);
      } else {
        // Use standard transformation
        const centerX = designX + finalWidth / 2;
        const centerY = designY + finalHeight / 2;
        
        // Move to center for transformations
        ctx.translate(centerX, centerY);
        
        // Apply user rotation (starts at 0, only rotates when slider is adjusted)
        const userRotation = designData.rotation !== undefined ? designData.rotation : 0;
        if (userRotation !== 0) {
          ctx.rotate((userRotation * Math.PI) / 180);
        }
        
        // Move back to draw at correct position
        ctx.translate(-centerX, -centerY);
        
        ctx.drawImage(design, designX, designY, finalWidth, finalHeight);
      }
      ctx.restore();
    });
    
    exportCanvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "mockup-result.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <Navbar subtitle="2D Mockup Editor" backLink="/mockup-2d" backText="← Back to Templates" />

      <section className="flex-1 py-8 sm:py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-12 space-y-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-rose-400 bg-clip-text text-transparent">
                2D Mockup Editor
              </span>
            </h1>
            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
              {currentTemplate?.name || "Create professional 2D product mockups"}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-6 sm:p-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-slate-100">Preview</h2>
                  {bannerImage && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleZoomOut}
                        className="p-2 rounded-lg border border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                        title="Zoom Out"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                        </svg>
                      </button>
                      <span className="text-sm text-slate-400 min-w-[60px] text-center">
                        {Math.round(zoom * 100)}%
                      </span>
                      <button
                        onClick={handleZoomIn}
                        className="p-2 rounded-lg border border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                        title="Zoom In"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                        </svg>
                      </button>
                      <button
                        onClick={handleZoomReset}
                        className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-xs"
                        title="Reset Zoom"
                      >
                        Reset
                      </button>
                    </div>
                  )}
                </div>
                
                {bannerImage ? (
                  <div className="space-y-4">
                    <div 
                      ref={containerRef}
                      className="relative rounded-xl overflow-auto border border-slate-800 bg-slate-900 w-full"
                      style={{ maxHeight: '80vh', minHeight: '400px' }}
                    >
                      <div
                        style={{
                          transform: zoom > 1.0 ? `translate(${panOffset.x}px, ${panOffset.y}px)` : 'none',
                          display: 'inline-block',
                          willChange: 'transform'
                        }}
                      >
                        <canvas
                          ref={canvasRef}
                          onMouseDown={handleMouseDown}
                          onMouseMove={handleMouseMove}
                          onMouseUp={handleMouseUp}
                          onMouseLeave={handleMouseUp}
                          onWheel={handleWheel}
                          style={{ 
                            display: 'block', 
                            imageRendering: 'auto',
                            cursor: is4PointMode ? 'crosshair' : (isPanning ? 'grabbing' : (isDragging ? 'grabbing' : (zoom > 1.0 ? 'grab' : (userDesigns.length > 0 ? 'grab' : 'default'))))
                          }}
                        />
                      </div>
                      {userDesigns.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
                          <p className="text-slate-400">Upload your design to place it on the mockup</p>
                        </div>
                      )}
                      
                    </div>
                    {(userDesigns.length > 0 || zoom > 1.0) && (
                      <p className="text-xs text-slate-500 text-center">
                        {userDesigns.length > 0 && '💡 Click and drag designs to reposition them • '}
                        {zoom > 1.0 && 'Click and drag to pan • '}
                        Ctrl/Cmd + Scroll to zoom
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-auto border border-slate-800 bg-slate-900 flex justify-center items-center p-4">
                    <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-400">Loading template...</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-6">
                <h2 className="text-lg font-semibold text-slate-100 mb-4">Upload Your Logo/Design</h2>
                
                <div>
                  <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center hover:border-purple-500/50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      id="image-upload"
                      className="hidden"
                    />
                    <label
                      htmlFor="image-upload"
                      className="cursor-pointer flex flex-col items-center space-y-2"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl">
                        📤
                      </div>
                      <div>
                        <p className="text-slate-300 font-medium text-sm mb-1">Add Images</p>
                        <p className="text-xs text-slate-500">PNG, JPG, or SVG</p>
                      </div>
                    </label>
                  </div>
                  
                  {/* List of uploaded designs */}
                  {userDesigns.length > 0 && (
                    <div className="space-y-3 max-h-64 overflow-y-auto mt-4">
                      {userDesigns.map((designData) => (
                        <div
                          key={designData.id}
                          className={`relative rounded-xl overflow-hidden border p-3 bg-slate-900 transition-all ${
                            selectedDesignId === designData.id
                              ? 'border-purple-500 ring-2 ring-purple-500/50'
                              : 'border-slate-800'
                          }`}
                          onClick={() => setSelectedDesignId(designData.id)}
                        >
                          <img
                            src={designData.src}
                            alt={`Design ${designData.id}`}
                            className="w-full h-auto max-h-20 object-contain mx-auto"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Remove design
                              setUserDesigns((prev) => {
                                const filtered = prev.filter((d) => d.id !== designData.id);
                                // Update selected design if needed
                                if (selectedDesignId === designData.id) {
                                  setSelectedDesignId(filtered.length > 0 ? filtered[0].id : null);
                                }
                                return filtered;
                              });
                              delete userDesignsRef.current[designData.id];
                              setTimeout(() => drawComposite(), 100);
                            }}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900/90 hover:bg-red-600/80 text-slate-300 hover:text-white transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {selectedDesignId && userDesigns.find((d) => d.id === selectedDesignId) && (
                <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-6">
                  <h2 className="text-lg font-semibold text-slate-100 mb-4">Design Controls</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">
                        Size: {Math.round((userDesigns.find((d) => d.id === selectedDesignId)?.scale || 0.3) * 100)}%
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max={currentTemplate.category === "card" ? "2.0" : "0.9"}
                        step="0.05"
                        value={userDesigns.find((d) => d.id === selectedDesignId)?.scale || 0.3}
                        onChange={(e) => {
                          const newScale = parseFloat(e.target.value);
                          setUserDesigns((prev) =>
                            prev.map((design) =>
                              design.id === selectedDesignId ? { ...design, scale: newScale } : design
                            )
                          );
                        }}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>Small</span>
                        <span>{currentTemplate.category === "card" ? "Very Large" : "Large"}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">
                        Rotation: {Math.round(userDesigns.find((d) => d.id === selectedDesignId)?.rotation || 0)}°
                      </label>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        step="1"
                        value={userDesigns.find((d) => d.id === selectedDesignId)?.rotation || 0}
                        onChange={(e) => {
                          const newRotation = parseFloat(e.target.value);
                          setUserDesigns((prev) =>
                            prev.map((design) =>
                              design.id === selectedDesignId ? { ...design, rotation: newRotation } : design
                            )
                          );
                        }}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>-180°</span>
                        <span>0°</span>
                        <span>180°</span>
                      </div>
                    </div>
                    {(currentTemplate.category === "card" || currentTemplate.category === "banner") && (
                      <div>
                        <label className="block text-sm text-slate-400 mb-2">4-Point Perspective</label>
                        <div className="space-y-2">
                          <button
                            onClick={() => {
                              if (is4PointMode) {
                                // Cancel 4-point mode and clear points
                                setIs4PointMode(false);
                                setUserDesigns((prev) =>
                                  prev.map((design) =>
                                    design.id === selectedDesignId
                                      ? { ...design, perspectivePoints: [] }
                                      : design
                                  )
                                );
                              } else {
                                // Enable 4-point mode and clear existing points
                                setIs4PointMode(true);
                                setUserDesigns((prev) =>
                                  prev.map((design) =>
                                    design.id === selectedDesignId
                                      ? { ...design, perspectivePoints: [] }
                                      : design
                                  )
                                );
                              }
                            }}
                            className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                              is4PointMode
                                ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                                : 'border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-300 hover:text-white'
                            }`}
                          >
                            {is4PointMode ? 'Cancel 4-Point Mode' : 'Enable 4-Point Mode'}
                          </button>
                          {is4PointMode && (
                            <p className="text-xs text-slate-500 text-center">
                              Click on canvas to set 4 corner points ({userDesigns.find((d) => d.id === selectedDesignId)?.perspectivePoints?.length || 0}/4)
                            </p>
                          )}
                          {userDesigns.find((d) => d.id === selectedDesignId)?.perspectivePoints?.length === 4 && (
                            <button
                              onClick={() => {
                                setUserDesigns((prev) =>
                                  prev.map((design) =>
                                    design.id === selectedDesignId
                                      ? { ...design, perspectivePoints: [] }
                                      : design
                                  )
                                );
                                setShowMappingArea(false);
                              }}
                              className="w-full px-4 py-2 rounded-lg border border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-300 hover:text-white text-sm"
                            >
                              Clear Points
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Mapping Panel - shown when 4 points are set */}
                    {selectedDesignId && userDesigns.find((d) => d.id === selectedDesignId)?.perspectivePoints?.length === 4 && (
                      <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-6">
                        <h2 className="text-lg font-semibold text-slate-100 mb-4">Mapping Area</h2>
                        <p className="text-xs text-slate-400 mb-4">Drag the image within this area to position it on the preview</p>
                        {(() => {
                          const selectedDesign = userDesigns.find(d => d.id === selectedDesignId);
                          if (!selectedDesign || !selectedDesign.perspectivePoints || selectedDesign.perspectivePoints.length !== 4) return null;
                          
                          const points = selectedDesign.perspectivePoints;
                          const minX = Math.min(points[0].x, points[1].x, points[2].x, points[3].x);
                          const maxX = Math.max(points[0].x, points[1].x, points[2].x, points[3].x);
                          const minY = Math.min(points[0].y, points[1].y, points[2].y, points[3].y);
                          const maxY = Math.max(points[0].y, points[1].y, points[2].y, points[3].y);
                          
                          const mappingWidth = maxX - minX;
                          const mappingHeight = maxY - minY;
                          const mappingAspect = mappingWidth / mappingHeight;
                          
                          // Display size for mapping panel (fixed height, maintain aspect)
                          const displayHeight = 200;
                          const displayWidth = displayHeight * mappingAspect;
                          
                          // Calculate relative position within mapping area
                          const currentPos = selectedDesign.position || { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
                          const relX = ((currentPos.x - minX) / mappingWidth) * displayWidth;
                          const relY = ((currentPos.y - minY) / mappingHeight) * displayHeight;
                          
                          const img = userDesignsRef.current[selectedDesign.id];
                          if (!img) return null;
                          
                          const imgAspect = img.width / img.height;
                          const imgDisplaySize = 40; // Size of image in mapping area
                          const imgDisplayWidth = imgAspect > 1 ? imgDisplaySize : imgDisplaySize * imgAspect;
                          const imgDisplayHeight = imgAspect > 1 ? imgDisplaySize / imgAspect : imgDisplaySize;
                          
                          return (
                            <div className="relative">
                              <div
                                ref={mappingAreaRef}
                                className="relative border-2 border-purple-500 bg-slate-800/50 rounded-lg overflow-hidden"
                                style={{
                                  width: `${displayWidth}px`,
                                  height: `${displayHeight}px`,
                                  margin: '0 auto'
                                }}
                                onMouseDown={(e) => {
                                  if (!mappingAreaRef.current) return;
                                  const rect = mappingAreaRef.current.getBoundingClientRect();
                                  const x = ((e.clientX - rect.left) / displayWidth) * mappingWidth + minX;
                                  const y = ((e.clientY - rect.top) / displayHeight) * mappingHeight + minY;
                                  
                                  setIsDraggingInMapping(true);
                                  dragInitialRef.current = {
                                    position: { x, y },
                                    mouseX: e.clientX,
                                    mouseY: e.clientY
                                  };
                                }}
                              >
                                {/* Background grid pattern */}
                                <div className="absolute inset-0 opacity-20" style={{
                                  backgroundImage: 'linear-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.3) 1px, transparent 1px)',
                                  backgroundSize: '20px 20px'
                                }} />
                                
                                {/* Image representation in mapping area */}
                                <div
                                  className="absolute cursor-move border-2 border-purple-400 bg-purple-500/20 rounded"
                                  style={{
                                    left: `${Math.max(0, Math.min(displayWidth - imgDisplayWidth, relX - imgDisplayWidth / 2))}px`,
                                    top: `${Math.max(0, Math.min(displayHeight - imgDisplayHeight, relY - imgDisplayHeight / 2))}px`,
                                    width: `${imgDisplayWidth}px`,
                                    height: `${imgDisplayHeight}px`,
                                    backgroundImage: `url(${selectedDesign.src})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center'
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Position</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => {
                            if (bannerImageRef.current && currentTemplate) {
                              const canvasWidth = bannerImageRef.current.naturalWidth || bannerImageRef.current.width;
                              const canvasHeight = bannerImageRef.current.naturalHeight || bannerImageRef.current.height;
                              const billboardAreaWidth = canvasWidth * currentTemplate.areaWidth;
                              const billboardAreaHeight = canvasHeight * currentTemplate.areaHeight;
                              const billboardStartX = canvasWidth * currentTemplate.areaX;
                              const billboardStartY = canvasHeight * currentTemplate.areaY;
                              setUserDesigns((prev) =>
                                prev.map((design) =>
                                  design.id === selectedDesignId
                                    ? {
                                        ...design,
                                        position: {
                                          x: billboardStartX + (billboardAreaWidth / 2),
                                          y: billboardStartY + (billboardAreaHeight / 2),
                                        },
                                      }
                                    : design
                                )
                              );
                            }
                          }}
                          className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-300 hover:text-white text-sm transition-colors"
                        >
                          Center
                        </button>
                        <button
                          onClick={() => {
                            if (bannerImageRef.current && currentTemplate) {
                              const canvasWidth = bannerImageRef.current.naturalWidth || bannerImageRef.current.width;
                              const canvasHeight = bannerImageRef.current.naturalHeight || bannerImageRef.current.height;
                              const billboardAreaWidth = canvasWidth * currentTemplate.areaWidth;
                              const billboardAreaHeight = canvasHeight * currentTemplate.areaHeight;
                              const billboardStartX = canvasWidth * currentTemplate.areaX;
                              const billboardStartY = canvasHeight * currentTemplate.areaY;
                              setUserDesigns((prev) =>
                                prev.map((design) =>
                                  design.id === selectedDesignId
                                    ? {
                                        ...design,
                                        position: {
                                          x: billboardStartX + (billboardAreaWidth / 2),
                                          y: billboardStartY + (billboardAreaHeight * 0.3),
                                        },
                                      }
                                    : design
                                )
                              );
                            }
                          }}
                          className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-300 hover:text-white text-sm transition-colors"
                        >
                          Top
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-6">
                <h2 className="text-lg font-semibold text-slate-100 mb-4">Export</h2>
                <div className="space-y-3">
                  <button
                    onClick={handleExport}
                    disabled={userDesigns.length === 0 || !bannerImage}
                    className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold shadow-lg shadow-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export Image (PNG)
                  </button>
                  <p className="text-xs text-slate-500 text-center">
                    Downloads high-resolution image
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

