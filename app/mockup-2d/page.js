"use client";

import { useState, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { TEMPLATE_CATEGORIES, TEMPLATE_LIST } from "./templates";

const CATEGORIES = [
  { id: "all",    name: "All",     icon: "🎨" },
  { id: "banner", name: "Banner",  icon: "🎯" },
  { id: "card",   name: "Card",    icon: "💳" },
  { id: "cup",    name: "Cup",     icon: "☕" },
  { id: "bag",    name: "Bag",     icon: "🎒" },
];

function Mockup2DContent() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTemplates = useMemo(() => {
    let list =
      selectedCategory === "all"
        ? TEMPLATE_LIST
        : TEMPLATE_LIST.filter((t) => t.category === selectedCategory);

    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;

    return list.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    );
  }, [selectedCategory, searchQuery]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <Navbar subtitle="2D Mockup" backLink="/" backText="← Back to Home" />

      <section className="flex-1 bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.12),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(168,85,247,0.08),_transparent_55%)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

          {/* Breadcrumb + Title */}
          <div className="mb-6">
            <nav className="text-xs sm:text-sm text-slate-400 mb-3">
              <Link href="/" className="hover:text-slate-300">Home</Link>
              <span className="mx-2">/</span>
              <span className="text-slate-300">2D Mockups</span>
            </nav>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-slate-50 mb-2">
              2D Mockup Templates
            </h1>
            <p className="text-sm sm:text-base text-slate-400 max-w-3xl">
              Browse ready-to-use 2D mockup templates including billboards, business cards, cups, and bags.
              Upload your design and export a polished mockup in seconds.
            </p>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-2xl">
              <input
                type="text"
                placeholder="Search templates by name or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 sm:py-3 pl-10 text-sm bg-slate-900/70 border border-slate-800 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            </div>
          </div>

          {/* Category filters */}
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {CATEGORIES.map((cat) => {
                const count =
                  cat.id === "all"
                    ? TEMPLATE_LIST.length
                    : TEMPLATE_LIST.filter((t) => t.category === cat.id).length;
                const isSelected = selectedCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isSelected
                        ? "bg-purple-500 text-white shadow-lg shadow-purple-500/40"
                        : "bg-slate-900/70 text-slate-300 border border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                    <span className={`text-xs ${isSelected ? "text-purple-100" : "text-slate-500"}`}>
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Count */}
          <div className="mb-4 sm:mb-6">
            <p className="text-xs sm:text-sm text-slate-400">
              <span className="font-semibold text-slate-300">{filteredTemplates.length}</span> Templates
            </p>
          </div>

          {/* Grid */}
          {filteredTemplates.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {filteredTemplates.map((template) => {
                const cat = CATEGORIES.find((c) => c.id === template.category);

                return (
                  <button
                    key={template.id}
                    onClick={() => router.push(`/mockup-2d/editor?template=${template.id}`)}
                    className="group relative bg-slate-900/70 rounded-lg border border-slate-800 overflow-hidden hover:shadow-lg hover:border-purple-500/50 hover:bg-slate-900 transition-all duration-200 text-left"
                  >
                    {/* 2D badge */}
                    <div className="absolute top-2 left-2 z-10 bg-slate-950/90 text-purple-400 text-[10px] font-semibold px-2 py-0.5 rounded border border-purple-500/30">
                      2D
                    </div>

                    {/* Edit icon on hover */}
                    <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-slate-950 rounded-full p-1.5 shadow-lg border border-slate-700">
                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </div>
                    </div>

                    {/* Preview image */}
                    <div className="aspect-square bg-slate-900 border-b border-slate-800 overflow-hidden flex items-center justify-center">
                      <img
                        src={template.image}
                        alt={template.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
                      />
                    </div>

                    {/* Info */}
                    <div className="p-3 space-y-1">
                      <h3 className="text-xs font-medium text-slate-200 line-clamp-2 leading-snug">
                        {template.name}
                      </h3>
                      <p className="text-[10px] text-slate-500">
                        {cat?.icon} {cat?.name}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-20 text-center space-y-3">
              <p className="text-slate-400 font-medium">No templates found</p>
              <p className="text-sm text-slate-500">Try a different search or category</p>
              <button
                onClick={() => { setSelectedCategory("all"); setSearchQuery(""); }}
                className="mt-2 px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 text-sm transition-all"
              >
                Clear filters
              </button>
            </div>
          )}

        </div>
      </section>
    </main>
  );
}

export default function Mockup2DPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400" />
        </div>
      </main>
    }>
      <Mockup2DContent />
    </Suspense>
  );
}
