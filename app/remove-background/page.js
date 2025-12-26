"use client";

import { useState, useRef, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { removeBackground } from "@imgly/background-removal";
import { useToast } from "@/contexts/ToastContext";

export default function RemoveBackgroundPage() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [brushMode, setBrushMode] = useState("add"); // "add" or "remove"
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(30);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const { success, error: showError } = useToast();

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result);
        setProcessedImage(null);
        // Clear canvas when new image is uploaded
        setTimeout(() => {
          clearCanvas();
        }, 100);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const setupCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    const container = containerRef.current;
    
    if (!canvas || !img || !container) return;

    const rect = container.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    
    canvas.width = imgRect.width;
    canvas.height = imgRect.height;
    
    const ctx = canvas.getContext("2d");
    ctx.globalCompositeOperation = "source-over";
  };

  useEffect(() => {
    if (selectedImage) {
      setTimeout(setupCanvas, 100);
    }
  }, [selectedImage]);

  const getCoordinates = (e) => {
    const container = containerRef.current;
    const img = imageRef.current;
    if (!container || !img) return null;

    const containerRect = container.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    
    const x = (e.clientX || e.touches?.[0]?.clientX) - imgRect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - imgRect.top;
    
    return { x, y };
  };

  const draw = (x, y) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.globalCompositeOperation = "source-over";
    
    if (brushMode === "add") {
      ctx.fillStyle = "rgba(34, 197, 94, 0.5)"; // Green - areas to keep
    } else {
      ctx.fillStyle = "rgba(239, 68, 68, 0.5)"; // Red - areas to remove
    }
    
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const handleMouseDown = (e) => {
    if (!selectedImage || isProcessing) return;
    e.preventDefault();
    setIsDrawing(true);
    const coords = getCoordinates(e);
    if (coords) {
      draw(coords.x, coords.y);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !selectedImage || isProcessing) return;
    e.preventDefault();
    const coords = getCoordinates(e);
    if (coords) {
      draw(coords.x, coords.y);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleTouchStart = (e) => {
    handleMouseDown(e);
  };

  const handleTouchMove = (e) => {
    handleMouseMove(e);
  };

  const handleTouchEnd = () => {
    handleMouseUp();
  };

  const handleProcess = async () => {
    if (!selectedImage) return;

    setIsProcessing(true);
    try {
      // Convert data URL to blob
      const response = await fetch(selectedImage);
      const blob = await response.blob();
      
      // Get mask from canvas if there's any drawing
      let maskBlob = null;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const hasDrawing = imageData.data.some((pixel, index) => {
          // Check alpha channel (every 4th value)
          return index % 4 === 3 && pixel > 0;
        });

        if (hasDrawing) {
          // Create a proper mask from the canvas
          // The canvas has green areas (add) and erased areas (remove)
          // We need to create a binary mask where white = keep, black = remove
          const maskCanvas = document.createElement("canvas");
          maskCanvas.width = canvas.width;
          maskCanvas.height = canvas.height;
          const maskCtx = maskCanvas.getContext("2d");
          
          // Get the original canvas data
          const originalData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const maskData = maskCtx.createImageData(canvas.width, canvas.height);
          
          // Create mask: 
          // - Green areas (add) = white (keep)
          // - Red areas (remove) = black (remove/transparent)
          // - Unmarked areas = gray (let AI decide)
          for (let i = 0; i < originalData.data.length; i += 4) {
            const r = originalData.data[i];
            const g = originalData.data[i + 1];
            const b = originalData.data[i + 2];
            const a = originalData.data[i + 3];
            
            let value = 128; // Default: gray (let AI decide)
            
            if (a > 0) {
              // Check if it's a green area (add/keep)
              const isAddArea = g > 100 && r < g && b < g;
              // Check if it's a red area (remove)
              const isRemoveArea = r > 150 && g < r && b < r;
              
              if (isAddArea) {
                value = 255; // White = keep
              } else if (isRemoveArea) {
                value = 0; // Black = remove
              }
            }
            
            maskData.data[i] = value;     // R
            maskData.data[i + 1] = value; // G
            maskData.data[i + 2] = value; // B
            maskData.data[i + 3] = 255;   // A
          }
          
          maskCtx.putImageData(maskData, 0, 0);
          maskBlob = await new Promise((resolve) => {
            maskCanvas.toBlob(resolve, "image/png");
          });
        }
      }
      
      // Remove background using the library
      const config = {
        model: "medium", // Options: "small", "medium", "large" - medium is a good balance
        outputFormat: "image/png", // PNG supports transparency
      };
      
      let processedBlob = await removeBackground(blob, config);
      
      // Apply user's mask as post-processing if available
      if (maskBlob && canvas) {
        try {
          // Load the processed image and mask
          const processedImg = await createImageBitmap(processedBlob);
          const maskImg = await createImageBitmap(maskBlob);
          
          // Create a canvas to apply the mask
          const resultCanvas = document.createElement("canvas");
          resultCanvas.width = processedImg.width;
          resultCanvas.height = processedImg.height;
          const resultCtx = resultCanvas.getContext("2d");
          
          // Draw the processed image
          resultCtx.drawImage(processedImg, 0, 0);
          
          // Scale mask to match processed image size
          const maskCanvas = document.createElement("canvas");
          maskCanvas.width = processedImg.width;
          maskCanvas.height = processedImg.height;
          const maskCtx = maskCanvas.getContext("2d");
          maskCtx.drawImage(maskImg, 0, 0, maskCanvas.width, maskCanvas.height);
          const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
          
          // Get the processed image data
          const processedData = resultCtx.getImageData(0, 0, resultCanvas.width, resultCanvas.height);
          
          // Apply mask: 
          // - White areas (255) = definitely keep
          // - Black areas (0) = definitely remove (make transparent)
          // - Gray areas (128) = let AI result stand (already processed)
          for (let i = 0; i < processedData.data.length; i += 4) {
            const maskIndex = i; // Same size now, so indices match
            const maskValue = maskData.data[maskIndex]; // R, G, B should be same for grayscale
            
            if (maskValue < 64) {
              // Black area (user marked to remove) - make transparent
              processedData.data[i + 3] = 0; // Set alpha to 0 (transparent)
            } else if (maskValue > 192) {
              // White area (user marked to keep) - ensure it's visible
              if (processedData.data[i + 3] < 128) {
                // If AI made it too transparent, make it more opaque
                processedData.data[i + 3] = Math.min(255, processedData.data[i + 3] + 100);
              }
            }
            // Gray areas (128) - keep AI's decision as-is
          }
          
          resultCtx.putImageData(processedData, 0, 0);
          processedBlob = await new Promise((resolve) => {
            resultCanvas.toBlob(resolve, "image/png");
          });
        } catch (maskError) {
          console.warn("Could not apply mask:", maskError);
          // Continue with unmodified result
        }
      }
      
      // Convert blob to data URL for display
      const reader = new FileReader();
      reader.onloadend = () => {
        setProcessedImage(reader.result);
        setIsProcessing(false);
      };
      reader.readAsDataURL(processedBlob);
      success("Background removed successfully!");
    } catch (error) {
      console.error("Error removing background:", error);
      setIsProcessing(false);
      showError("Failed to remove background. Please try again with a different image.");
    }
  };

  const handleDownload = () => {
    if (!processedImage) return;

    const link = document.createElement("a");
    link.href = processedImage;
    link.download = "image-no-background.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <Navbar subtitle="Remove Background" backLink="/" backText="← Back to Tools" />

      <section className="flex-1 py-8 sm:py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12 space-y-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight">
              <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                Remove Background
              </span>
            </h1>
            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
              Instantly remove backgrounds from your images with AI-powered precision
            </p>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {/* Original Image */}
            <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-slate-100 mb-4">Original Image</h2>
              
              {!selectedImage ? (
                <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 sm:p-12 text-center hover:border-emerald-500/50 transition-colors">
                  <input
                    type="file"
                    id="image-upload"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer flex flex-col items-center space-y-4"
                  >
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-3xl">
                      📤
                    </div>
                    <div>
                      <p className="text-slate-300 font-medium mb-1">Click to upload your image</p>
                      <p className="text-sm text-slate-500">PNG, JPG, or WEBP (Max 10MB)</p>
                    </div>
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Advanced Toggle Button */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 transition-colors flex items-center gap-2"
                    >
                      <span>⚙️</span>
                      <span>Advanced</span>
                      <span className={`transition-transform ${showAdvanced ? "rotate-180" : ""}`}>▼</span>
                    </button>
                  </div>

                  {/* Brush Controls - Collapsible */}
                  {showAdvanced && (
                    <div className="flex flex-col gap-3 p-3 rounded-lg border border-slate-800 bg-slate-900/50">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setBrushMode("add")}
                          className={`flex-1 px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
                            brushMode === "add"
                              ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/40"
                              : "border border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800"
                          }`}
                        >
                          ✏️ Add
                        </button>
                        <button
                          onClick={() => setBrushMode("remove")}
                          className={`flex-1 px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
                            brushMode === "remove"
                              ? "bg-red-500 text-white shadow-lg shadow-red-500/40"
                              : "border border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800"
                          }`}
                        >
                          🗑️ Remove
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-400 whitespace-nowrap">Brush:</label>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={brushSize}
                          onChange={(e) => setBrushSize(Number(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-xs text-slate-300 w-10 text-right">{brushSize}px</span>
                      </div>
                      <button
                        onClick={clearCanvas}
                        className="px-3 py-1.5 text-xs rounded-lg border border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 transition-colors"
                      >
                        Clear All
                      </button>
                    </div>
                  )}

                  {/* Image with Drawing Canvas */}
                  <div
                    ref={containerRef}
                    className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900 cursor-crosshair"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    <img
                      ref={imageRef}
                      src={selectedImage}
                      alt="Original"
                      className="w-full h-auto max-h-96 object-contain pointer-events-none"
                      onLoad={setupCanvas}
                    />
                    <canvas
                      ref={canvasRef}
                      className="absolute top-0 left-0 pointer-events-none"
                      style={{ touchAction: "none" }}
                    />
                    {brushMode === "add" && (
                      <div className="absolute top-2 left-2 px-2 py-1 rounded bg-emerald-500/90 text-white text-xs font-medium">
                        Brush: Add (Keep)
                      </div>
                    )}
                    {brushMode === "remove" && (
                      <div className="absolute top-2 left-2 px-2 py-1 rounded bg-red-500/90 text-white text-xs font-medium">
                        Brush: Remove
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <input
                      type="file"
                      id="image-upload-replace"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="image-upload-replace"
                      className="flex-1 px-4 py-2 rounded-lg border border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-300 hover:text-white text-center cursor-pointer transition-colors"
                    >
                      Replace Image
                    </label>
                    <button
                      onClick={handleProcess}
                      disabled={isProcessing}
                      className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold shadow-lg shadow-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {isProcessing ? "Processing..." : "Remove Background"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Processed Image */}
            <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-slate-100 mb-4">Result</h2>
              
              {!processedImage ? (
                <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 sm:p-12 text-center min-h-[300px] flex items-center justify-center">
                  {isProcessing ? (
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-slate-400">Processing image...</p>
                    </div>
                  ) : (
                    <div className="text-slate-500">
                      <p className="text-lg mb-2">Processed image will appear here</p>
                      <p className="text-sm">Upload an image and click "Remove Background"</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-gradient-to-br from-slate-800/50 to-slate-900/50 bg-[linear-gradient(45deg,_#1e293b_25%,_transparent_25%),_linear-gradient(-45deg,_#1e293b_25%,_transparent_25%),_linear-gradient(45deg,_transparent_75%,_#1e293b_75%),_linear-gradient(-45deg,_transparent_75%,_#1e293b_75%)] bg-[length:20px_20px] bg-[0_0,_10px_10px,_10px_10px,_20px_20px]">
                    <img
                      src={processedImage}
                      alt="Background removed"
                      className="w-full h-auto max-h-96 object-contain mx-auto"
                    />
                  </div>
                  <button
                    onClick={handleDownload}
                    className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold shadow-lg shadow-emerald-500/40 transition-all"
                  >
                    Download PNG
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Instructions Section */}
          <div className="mt-8 sm:mt-12">
            <div className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900/50 to-slate-950/50 p-6 sm:p-8">
              <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <span>💡</span>
                <span>How to Use</span>
              </h3>
              <div className="space-y-3 text-sm text-slate-400">
                <div className="flex items-start gap-3">
                  <span className="text-emerald-400 font-semibold">1.</span>
                  <p>Upload your image by clicking the upload area or drag and drop your file.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-emerald-400 font-semibold">2.</span>
                  <p>
                    <span className="text-slate-300">Optional:</span> Click the <span className="text-slate-300 font-medium">"Advanced"</span> button to access brush tools. 
                    Use <span className="text-emerald-400">green brush</span> to mark areas to keep, and <span className="text-red-400">red brush</span> to mark areas to remove.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-emerald-400 font-semibold">3.</span>
                  <p>Click <span className="text-slate-300 font-medium">"Remove Background"</span> to process your image with AI-powered background removal.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-emerald-400 font-semibold">4.</span>
                  <p>Download your processed image with transparent background as PNG format.</p>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-slate-800">
                <p className="text-xs text-slate-500">
                  <span className="text-slate-400">Tip:</span> For best results, use images with clear subject-background separation. 
                  The advanced brush tools help refine edges and handle complex backgrounds.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

