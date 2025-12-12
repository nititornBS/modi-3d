"use client";

import { useMemo } from "react";
import { generateProceduralUV } from "./useUVData";

export default function ModelUVDataLoader({ selectedModel, children }) {
  // For procedural models (bottle, box), we can generate UV data directly
  // For loaded models (shirt, cup), we'll need to extract from the loaded object
  const uvData = useMemo(() => {
    if (selectedModel === "bottle" || selectedModel === "box") {
      return generateProceduralUV(selectedModel);
    }
    // For shirt and cup, we'll return null and extract from the actual model
    // This will be handled by passing the model reference separately
    return null;
  }, [selectedModel]);

  return children(uvData);
}

