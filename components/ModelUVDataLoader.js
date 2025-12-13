"use client";

import { useMemo, useState, useEffect } from "react";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { generateProceduralUV, extractUVData } from "./useUVData";
import { getModelsByCategory, getModelById } from "@/app/studio/modelMapping";

export default function ModelUVDataLoader({ selectedModel, selectedVariation, children }) {
  const [uvData, setUvData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setUvData(null);

    const loadUVData = async () => {
      try {
        // For procedural models (bottle, box), generate UV data directly
        if (selectedModel === "bottle" || selectedModel === "box") {
          const data = generateProceduralUV(selectedModel);
          setUvData(data);
          setLoading(false);
          return;
        }

        // Get model info
        const modelInfo = selectedVariation 
          ? getModelById(selectedVariation)
          : getModelsByCategory(selectedModel)[0];

        if (!modelInfo || !modelInfo.file) {
          // Fallback to default models
          if (selectedModel === "shirt") {
            const loader = new GLTFLoader();
            const gltf = await new Promise((resolve, reject) => {
              loader.load("/3d-models/t_shirt.glb", resolve, undefined, reject);
            });
            const cloned = gltf.scene.clone();
            const data = extractUVData(cloned);
            setUvData(data);
          } else if (selectedModel === "cup") {
            const loader = new OBJLoader();
            const obj = await new Promise((resolve, reject) => {
              loader.load("/3d-models/Tea_Mug.obj", resolve, undefined, reject);
            });
            const cloned = obj.clone();
            const data = extractUVData(cloned);
            setUvData(data);
          } else {
            setUvData(null);
          }
          setLoading(false);
          return;
        }

        // Load model based on file type
        if (modelInfo.type === "obj") {
          const loader = new OBJLoader();
          const obj = await new Promise((resolve, reject) => {
            loader.load(modelInfo.file, resolve, undefined, reject);
          });
          const cloned = obj.clone();
          const data = extractUVData(cloned);
          setUvData(data);
        } else if (modelInfo.type === "glb" || modelInfo.type === "gltf") {
          const loader = new GLTFLoader();
          const gltf = await new Promise((resolve, reject) => {
            loader.load(modelInfo.file, resolve, undefined, reject);
          });
          const cloned = gltf.scene.clone();
          const data = extractUVData(cloned);
          setUvData(data);
        } else {
          setUvData(null);
        }
      } catch (error) {
        console.error("Error loading UV data:", error);
        setUvData(null);
      } finally {
        setLoading(false);
      }
    };

    loadUVData();
  }, [selectedModel, selectedVariation]);

  if (loading) {
    return children(null);
  }

  return children(uvData);
}

