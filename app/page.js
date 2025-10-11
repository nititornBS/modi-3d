"use client"
import React, { useState, useRef, Suspense } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera, Html } from '@react-three/drei';
import { Upload, Download, RotateCcw, Loader, Move } from 'lucide-react';
import * as THREE from 'three';

// 3D Product Models with texture overlay
function TShirtModel({ logoTexture, logoPosition, logoScale, logoRotation }) {
  const meshRef = useRef();
  
  React.useEffect(() => {
    if (!meshRef.current || !logoTexture) return;

    // Create canvas to combine base color + logo
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Draw base t-shirt color
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw logo on specific position
    const img = logoTexture.image;
    if (img && img.complete) {
      ctx.save();
      
      // Calculate position (center area for t-shirt front)
      const centerX = canvas.width * 0.5;
      const centerY = canvas.height * 0.4; // Upper chest area
      const logoWidth = canvas.width * 0.3 * logoScale;
      const logoHeight = (logoWidth * img.height) / img.width;
      
      const x = centerX + (logoPosition.x * canvas.width * 0.3) - logoWidth / 2;
      const y = centerY + (logoPosition.y * canvas.height * 0.3) - logoHeight / 2;

      ctx.translate(x + logoWidth / 2, y + logoHeight / 2);
      ctx.rotate((logoRotation * Math.PI) / 180);
      ctx.drawImage(img, -logoWidth / 2, -logoHeight / 2, logoWidth, logoHeight);
      
      ctx.restore();
    }

    // Apply to material
    const texture = new THREE.CanvasTexture(canvas);
    meshRef.current.material.map = texture;
    meshRef.current.material.needsUpdate = true;
  }, [logoTexture, logoPosition, logoScale, logoRotation]);

  return (
    <mesh ref={meshRef} castShadow receiveShadow position={[0, 0, 0]}>
      <boxGeometry args={[2.5, 3, 0.3]} />
      <meshStandardMaterial color="#ffffff" roughness={0.7} metalness={0.1} />
    </mesh>
  );
}

function MugModel({ logoTexture, logoPosition, logoScale, logoRotation }) {
  const groupRef = useRef();
  const bodyRef = useRef();
  
  React.useEffect(() => {
    if (!bodyRef.current || !logoTexture) return;

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = logoTexture.image;
    if (img && img.complete) {
      ctx.save();
      
      const centerX = canvas.width * 0.5;
      const centerY = canvas.height * 0.5;
      const logoWidth = canvas.width * 0.4 * logoScale;
      const logoHeight = (logoWidth * img.height) / img.width;
      
      const x = centerX + (logoPosition.x * canvas.width * 0.2) - logoWidth / 2;
      const y = centerY + (logoPosition.y * canvas.height * 0.2) - logoHeight / 2;

      ctx.translate(x + logoWidth / 2, y + logoHeight / 2);
      ctx.rotate((logoRotation * Math.PI) / 180);
      ctx.drawImage(img, -logoWidth / 2, -logoHeight / 2, logoWidth, logoHeight);
      
      ctx.restore();
    }

    const texture = new THREE.CanvasTexture(canvas);
    bodyRef.current.material.map = texture;
    bodyRef.current.material.needsUpdate = true;
  }, [logoTexture, logoPosition, logoScale, logoRotation]);

  return (
    <group ref={groupRef}>
      <mesh ref={bodyRef} castShadow receiveShadow>
        <cylinderGeometry args={[0.8, 0.9, 2.5, 32]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.4} />
      </mesh>
      <mesh position={[1.1, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <torusGeometry args={[0.4, 0.15, 16, 32]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.4} />
      </mesh>
    </group>
  );
}

function PhoneCaseModel({ logoTexture, logoPosition, logoScale, logoRotation }) {
  const meshRef = useRef();
  
  React.useEffect(() => {
    if (!meshRef.current || !logoTexture) return;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = logoTexture.image;
    if (img && img.complete) {
      ctx.save();
      
      const centerX = canvas.width * 0.5;
      const centerY = canvas.height * 0.5;
      const logoWidth = canvas.width * 0.6 * logoScale;
      const logoHeight = (logoWidth * img.height) / img.width;
      
      const x = centerX + (logoPosition.x * canvas.width * 0.2) - logoWidth / 2;
      const y = centerY + (logoPosition.y * canvas.height * 0.2) - logoHeight / 2;

      ctx.translate(x + logoWidth / 2, y + logoHeight / 2);
      ctx.rotate((logoRotation * Math.PI) / 180);
      ctx.drawImage(img, -logoWidth / 2, -logoHeight / 2, logoWidth, logoHeight);
      
      ctx.restore();
    }

    const texture = new THREE.CanvasTexture(canvas);
    meshRef.current.material.map = texture;
    meshRef.current.material.needsUpdate = true;
  }, [logoTexture, logoPosition, logoScale, logoRotation]);

  return (
    <group>
      <mesh ref={meshRef} castShadow receiveShadow>
        <boxGeometry args={[1.5, 3, 0.3]} />
        <meshStandardMaterial roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[0.4, 1.2, 0.16]}>
        <cylinderGeometry args={[0.15, 0.15, 0.1, 16]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
    </group>
  );
}

function ToteBagModel({ logoTexture, logoPosition, logoScale, logoRotation }) {
  const meshRef = useRef();
  
  React.useEffect(() => {
    if (!meshRef.current || !logoTexture) return;

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = logoTexture.image;
    if (img && img.complete) {
      ctx.save();
      
      const centerX = canvas.width * 0.5;
      const centerY = canvas.height * 0.5;
      const logoWidth = canvas.width * 0.4 * logoScale;
      const logoHeight = (logoWidth * img.height) / img.width;
      
      const x = centerX + (logoPosition.x * canvas.width * 0.2) - logoWidth / 2;
      const y = centerY + (logoPosition.y * canvas.height * 0.2) - logoHeight / 2;

      ctx.translate(x + logoWidth / 2, y + logoHeight / 2);
      ctx.rotate((logoRotation * Math.PI) / 180);
      ctx.drawImage(img, -logoWidth / 2, -logoHeight / 2, logoWidth, logoHeight);
      
      ctx.restore();
    }

    const texture = new THREE.CanvasTexture(canvas);
    meshRef.current.material.map = texture;
    meshRef.current.material.needsUpdate = true;
  }, [logoTexture, logoPosition, logoScale, logoRotation]);

  return (
    <group>
      <mesh ref={meshRef} castShadow receiveShadow>
        <boxGeometry args={[2.5, 3, 0.8]} />
        <meshStandardMaterial roughness={0.8} metalness={0.05} />
      </mesh>
      <mesh position={[-0.6, 1.8, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.3, 0.08, 8, 16]} />
        <meshStandardMaterial color="#8b7355" roughness={0.9} />
      </mesh>
      <mesh position={[0.6, 1.8, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.3, 0.08, 8, 16]} />
        <meshStandardMaterial color="#8b7355" roughness={0.9} />
      </mesh>
    </group>
  );
}

function LoadingSpinner() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2 bg-white p-4 rounded-lg shadow-lg">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm text-gray-600">Loading 3D scene...</p>
      </div>
    </Html>
  );
}

function Scene({ product, logoTexture, logoPosition, logoScale, logoRotation, autoRotate }) {
  const ProductModels = {
    tshirt: TShirtModel,
    mug: MugModel,
    phonecase: PhoneCaseModel,
    tote: ToteBagModel,
  };

  const ProductComponent = ProductModels[product] || TShirtModel;

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 6]} fov={50} />
      <OrbitControls 
        enablePan={false}
        enableZoom={true}
        autoRotate={autoRotate}
        autoRotateSpeed={2}
        minDistance={4}
        maxDistance={12}
      />

      <ambientLight intensity={0.6} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[-5, 5, -5]} intensity={0.5} />
      <spotLight position={[0, 10, 0]} intensity={0.3} />

      <Suspense fallback={<LoadingSpinner />}>
        <ProductComponent 
          logoTexture={logoTexture}
          logoPosition={logoPosition}
          logoScale={logoScale}
          logoRotation={logoRotation}
        />
      </Suspense>

      <Environment preset="studio" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <shadowMaterial opacity={0.3} />
      </mesh>
    </>
  );
}

export default function ProductMockupGenerator() {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [logoTexture, setLogoTexture] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState('tshirt');
  const [autoRotate, setAutoRotate] = useState(true);
  const [logoPosition, setLogoPosition] = useState({ x: 0, y: 0 });
  const [logoScale, setLogoScale] = useState(1);
  const [logoRotation, setLogoRotation] = useState(0);
  const fileInputRef = useRef(null);
  const canvasContainerRef = useRef(null);

  const products = {
    tshirt: { name: 'T-Shirt', emoji: '👕', description: 'Classic cotton tee' },
    mug: { name: 'Coffee Mug', emoji: '☕', description: 'Ceramic mug' },
    phonecase: { name: 'Phone Case', emoji: '📱', description: 'Protective case' },
    tote: { name: 'Tote Bag', emoji: '👜', description: 'Canvas bag' },
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const texture = new THREE.Texture(img);
          texture.needsUpdate = true;
          setLogoTexture(texture);
          setUploadedImage(event.target.result);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const downloadScreenshot = () => {
    const canvas = canvasContainerRef.current?.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 10);
      link.download = `mockup-${selectedProduct}-${timestamp}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    }
  };

  const resetSettings = () => {
    setLogoPosition({ x: 0, y: 0 });
    setLogoScale(1);
    setLogoRotation(0);
    setAutoRotate(true);
  };

  const removeImage = () => {
    setUploadedImage(null);
    setLogoTexture(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            3D Product Mockup Studio
          </h1>
          <p className="text-gray-600 mt-1 text-sm">Powered by React Three Fiber + Three.js</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            
            {/* Upload Section */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                Upload Design
              </h2>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2 font-medium shadow-lg shadow-blue-200"
              >
                <Upload className="w-5 h-5" />
                Choose Image
              </button>

              {uploadedImage && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-green-600 font-medium">✓ Image uploaded</p>
                    <button
                      onClick={removeImage}
                      className="text-xs text-red-600 hover:text-red-700 underline"
                    >
                      Remove
                    </button>
                  </div>
                  <img 
                    src={uploadedImage} 
                    alt="Logo preview" 
                    className="w-full h-32 object-contain bg-gray-50 rounded-lg border-2 border-green-200 p-2"
                  />
                </div>
              )}
            </div>

            {/* Product Selection */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-xl font-semibold mb-4">Select Product</h2>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(products).map(([key, product]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedProduct(key)}
                    className={`p-4 rounded-lg border-2 transition-all transform hover:scale-105 ${
                      selectedProduct === key
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-3xl mb-2">{product.emoji}</div>
                      <p className="text-sm font-semibold">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Logo Adjustments */}
            {uploadedImage && (
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Move className="w-5 h-5 text-purple-600" />
                  Logo Settings
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">Position X</label>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">{logoPosition.x.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.05"
                      value={logoPosition.x}
                      onChange={(e) => setLogoPosition(p => ({ ...p, x: parseFloat(e.target.value) }))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">Position Y</label>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">{logoPosition.y.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.05"
                      value={logoPosition.y}
                      onChange={(e) => setLogoPosition(p => ({ ...p, y: parseFloat(e.target.value) }))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">Scale</label>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">{logoScale.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={logoScale}
                      onChange={(e) => setLogoScale(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">Rotation</label>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">{logoRotation}°</span>
                    </div>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      value={logoRotation}
                      onChange={(e) => setLogoRotation(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-xl font-semibold mb-4">3D Controls</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <label className="text-sm font-medium text-gray-700">Auto Rotate</label>
                  <button
                    onClick={() => setAutoRotate(!autoRotate)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      autoRotate ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      autoRotate ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <button
                  onClick={resetSettings}
                  className="w-full bg-gray-100 text-gray-700 py-2.5 px-4 rounded-lg hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset Settings
                </button>
              </div>
            </div>

            <button
              onClick={downloadScreenshot}
              disabled={!uploadedImage}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2 font-medium shadow-lg shadow-purple-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-5 h-5" />
              Download Mockup
            </button>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-3">💡 Tips</h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>• Drag to rotate, scroll to zoom</li>
                <li>• Use sliders to position your logo</li>
                <li>• PNG images work best</li>
                <li>• Download anytime to save</li>
              </ul>
            </div>
          </div>

          {/* 3D Preview */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">3D Preview</h2>
              
              <div 
                ref={canvasContainerRef}
                className="w-full h-[600px] bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden shadow-inner border relative"
              >
                <Canvas shadows dpr={[1, 2]} gl={{ preserveDrawingBuffer: true }}>
                  <Scene 
                    product={selectedProduct}
                    logoTexture={logoTexture}
                    logoPosition={logoPosition}
                    logoScale={logoScale}
                    logoRotation={logoRotation}
                    autoRotate={autoRotate}
                  />
                </Canvas>
                
                {!uploadedImage && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center bg-white/90 backdrop-blur-sm p-8 rounded-xl shadow-lg">
                      <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <p className="font-semibold text-lg text-gray-700">Upload Your Design</p>
                      <p className="text-sm text-gray-600 mt-2">Your logo will appear on the product</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}