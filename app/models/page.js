"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { getAllModelFiles, getCategoryInfo } from "../studio/modelMapping";

const CATEGORIES = [
  { id: "all", name: "All", icon: "📦" },
  { id: "box", name: "Boxes", icon: "📦" },
  { id: "bottle", name: "Bottles", icon: "🍼" },
  { id: "cup", name: "Containers & Cups & Bowls", icon: "☕" },
  { id: "shirt", name: "Apparel", icon: "👕" },
];

// Optional: Additional metadata for models (colors, isNew, etc.)
// This can be extended in the future or moved to modelMapping.js
const MODEL_METADATA = {
  "cup-1": { colors: ["#FFFFFF", "#F5F5DC"] },
  "cup-2": { colors: ["#000000", "#FFFFFF"] },
  "cup-3": { colors: ["#8B4513", "#FFFFFF"] },
  // Add more metadata as needed
};

function ModelsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "all");
  const [searchQuery, setSearchQuery] = useState("");

  // Get all models from centralized mapping and merge with metadata
  const allModels = useMemo(() => {
    const modelsFromMapping = getAllModelFiles();
    return modelsFromMapping.map(model => ({
      ...model,
      // Merge with additional metadata if available
      ...(MODEL_METADATA[model.id] || {}),
      // Use displayName as the name for display
      name: model.displayName || model.name,
    }));
  }, []);

  const filteredModels = useMemo(() => {
    // First filter by category
    let models =
      selectedCategory === "all"
        ? allModels
        : allModels.filter((model) => model.category === selectedCategory);

    // Then filter by search query (case-insensitive)
    const query = searchQuery.trim().toLowerCase();
    if (!query) return models;

    return models.filter((model) => {
      const name = (model.name || "").toLowerCase();
      const displayName = (model.displayName || "").toLowerCase();
      const description = (model.description || "").toLowerCase();
      const id = (model.id || "").toLowerCase();
      const category = (model.category || "").toLowerCase();

      return (
        name.includes(query) ||
        displayName.includes(query) ||
        description.includes(query) ||
        id.includes(query) ||
        category.includes(query)
      );
    });
  }, [selectedCategory, allModels, searchQuery]);

  const handleModelClick = (modelId) => {
    const model = allModels.find((m) => m.id === modelId);
    if (model) {
      router.push(`/studio?model=${model.category}&variation=${modelId}`);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <Navbar 
        subtitle="Select a model to customize"
        backLink="/"
        backText="← Back to Home"
      />

      {/* Main Content */}
      <section className="flex-1 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.15),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(56,189,248,0.12),_transparent_55%)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Breadcrumb and Title */}
          <div className="mb-6">
            <nav className="text-xs sm:text-sm text-slate-400 mb-3">
              <Link href="/" className="hover:text-slate-300">Home</Link>
              <span className="mx-2">/</span>
              <span className="text-slate-300">Mockups</span>
            </nav>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-slate-50 mb-2">
              Customize & download mockups
            </h1>
            <p className="text-sm sm:text-base text-slate-400 max-w-3xl">
              Explore high-quality customizable 3D mockups, including packaging mockups like boxes and bottles, 
              apparel mockups like T-shirts and hoodies, and more.
            </p>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-2xl">
              <input
                type="text"
                placeholder="Search by name, type, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 sm:py-3 pl-10 pr-4 text-sm bg-slate-900/70 border border-slate-800 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            </div>
          </div>

          {/* Categories - Below Search Bar */}
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {CATEGORIES.map((category) => {
                const isSelected = selectedCategory === category.id;
                const count = category.id === "all" 
                  ? allModels.length 
                  : allModels.filter((m) => m.category === category.id).length;
                
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isSelected
                        ? "bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/40"
                        : "bg-slate-900/70 text-slate-300 border border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                    }`}
                  >
                    <span>{category.icon}</span>
                    <span>{category.name}</span>
                    <span className={`text-xs ${isSelected ? "text-slate-700" : "text-slate-500"}`}>
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Model Count */}
          <div className="mb-4 sm:mb-6">
            <p className="text-xs sm:text-sm text-slate-400">
              <span className="font-semibold text-slate-300">{filteredModels.length}</span> Mockups
            </p>
          </div>

          {/* Model Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {filteredModels.map((model) => {
              const fallbackIcon =
                model.icon ||
                (model.category === "box"
                  ? "📦"
                  : model.category === "bottle"
                  ? "🍼"
                  : model.category === "cup"
                  ? "☕"
                  : model.category === "shirt"
                  ? "👕"
                  : "📦");

              return (
                <button
                  key={model.id}
                  onClick={() => handleModelClick(model.id)}
                  className="group relative bg-slate-900/70 rounded-lg border border-slate-800 overflow-hidden hover:shadow-lg hover:border-sky-500/50 hover:bg-slate-900 transition-all duration-200 text-left"
                >
                  {/* 3D Badge */}
                  <div className="absolute top-2 left-2 z-10 bg-slate-950/90 text-sky-400 text-[10px] font-semibold px-2 py-0.5 rounded border border-sky-500/30">
                    3D
                  </div>
                  
                  {/* Edit Icon */}
                  <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-slate-950 rounded-full p-1.5 shadow-lg border border-slate-700">
                      <svg className="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                  </div>

                  {/* Model Preview Image */}
                  <div className="aspect-square bg-slate-900 border-b border-slate-800 overflow-hidden flex items-center justify-center">
                    {model.preview ? (
                      <img
                        src={model.preview}
                        alt={model.name}
                        className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.05]"
                      />
                    ) : (
                      <div className="text-4xl opacity-60">
                        {fallbackIcon}
                      </div>
                    )}
                  </div>

                  {/* Model Info */}
                  <div className="p-3 space-y-2">
                    {model.isNew && (
                      <span className="inline-block bg-emerald-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                        New
                      </span>
                    )}
                    <h3 className="text-xs font-medium text-slate-200 line-clamp-2 leading-snug">
                      {model.name}
                    </h3>
                    
                    {/* Color Swatches */}
                    {model.colors && model.colors.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        {model.colors.map((color, idx) => (
                          <div
                            key={idx}
                            className="w-4 h-4 rounded-full border border-slate-700"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

export default function ModelsPage() {
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
      <ModelsPageContent />
    </Suspense>
  );
}
