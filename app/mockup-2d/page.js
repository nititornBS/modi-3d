"use client";

import { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TEMPLATE_LIST } from "./templates";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";

const CATEGORIES = [
  { id: "all",    name: "All",           icon: "🎨" },
  { id: "banner", name: "Banner",        icon: "🎯" },
  { id: "card",   name: "Card",          icon: "💳" },
  { id: "cup",    name: "Cup",           icon: "☕" },
  { id: "bag",    name: "Bag",           icon: "🎒" },
  { id: "shirt",  name: "Shirt",         icon: "👕" },
  { id: "yours",  name: "Your Projects", icon: "📁" },
];

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL
  ? (process.env.NEXT_PUBLIC_API_BASE_URL.startsWith("http")
      ? process.env.NEXT_PUBLIC_API_BASE_URL
      : `https://${process.env.NEXT_PUBLIC_API_BASE_URL}`)
  : "http://localhost:4000";

// Upload a file directly to Cloudinary from the browser.
// Returns { secure_url, public_id }
async function uploadToCloudinary(file) {
  const cloudName    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  console.log("[Cloudinary] cloud_name:", cloudName);
  console.log("[Cloudinary] upload_preset:", uploadPreset);
  console.log("[Cloudinary] file:", file.name, file.type, file.size, "bytes");

  if (!cloudName || !uploadPreset) throw new Error("Cloudinary is not configured yet.");

  const body = new FormData();
  body.append("file",          file);
  body.append("upload_preset", uploadPreset);
  body.append("folder",        "modi3d/backgrounds");

  console.log("[Cloudinary] Uploading to Cloudinary...");
  const res  = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body,
  });

  const data = await res.json();
  console.log("[Cloudinary] Response:", data);

  if (!res.ok) {
    throw new Error(`Cloudinary error: ${data?.error?.message || res.statusText}`);
  }

  console.log("[Cloudinary] Upload success! URL:", data.secure_url);
  return data; // { secure_url, public_id, ... }
}

function Mockup2DContent() {
  const router = useRouter();
  const { token } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery]           = useState("");

  const [userBackgrounds, setUserBackgrounds] = useState([]);
  const [uploading, setUploading]             = useState(false);
  const [uploadError, setUploadError]         = useState("");
  const [deletingId, setDeletingId]           = useState(null);
  const fileInputRef = useRef(null);

  const [savedProjects, setSavedProjects]       = useState([]);
  const [deletingProjectId, setDeletingProjectId] = useState(null);

  useEffect(() => {
    if (!token) { setUserBackgrounds([]); setSavedProjects([]); return; }
    apiClient.getUserBackgrounds(token)
      .then(data => setUserBackgrounds(data.backgrounds || []))
      .catch(() => setUserBackgrounds([]));
    apiClient.getProjects(token)
      .then(data => setSavedProjects(data.projects || []))
      .catch(() => setSavedProjects([]));
  }, [token]);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    setUploadError("");
    try {
      // Step 1 — upload image to Cloudinary directly from the browser
      const cloud = await uploadToCloudinary(file);

      // Step 2 — send the Cloudinary URL + publicId to the backend to store in DB
      console.log("[Save] Sending to backend:", cloud.secure_url, cloud.public_id);
      const data = await apiClient.saveBackground(token, {
        url:      cloud.secure_url,
        publicId: cloud.public_id,
        name:     file.name,
        category: "custom",
      });
      console.log("[Save] Saved to DB:", data.background);

      setUserBackgrounds(prev => [data.background, ...prev]);
    } catch (err) {
      console.error("[Upload] Error:", err);
      setUploadError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    setDeletingId(id);
    try {
      await apiClient.deleteBackground(token, id);
      setUserBackgrounds(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      setUploadError(err.message || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteProject(id) {
    setDeletingProjectId(id);
    try {
      await apiClient.deleteProject(token, id);
      setSavedProjects(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setUploadError(err.message || "Delete failed");
    } finally {
      setDeletingProjectId(null);
    }
  }

  function bgImageUrl(bg) {
    // Cloudinary URLs are already full https://… ; local ones start with /uploads/
    return bg.url.startsWith("http") ? bg.url : `${API_BASE}${bg.url}`;
  }

  function openCustomBackground(bg) {
    router.push(
      `/mockup-2d/editor?bg=${encodeURIComponent(bgImageUrl(bg))}&name=${encodeURIComponent(bg.name)}&category=custom`
    );
  }

  const isYours = selectedCategory === "yours";
  const isAll   = selectedCategory === "all";
  // Show the Your Projects cards in both "All" and "Your Projects" tabs
  const showYoursCards = isYours || isAll;

  const filteredTemplates = useMemo(() => {
    if (isYours) return [];
    let list =
      isAll
        ? TEMPLATE_LIST
        : TEMPLATE_LIST.filter((t) => t.category === selectedCategory);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (t) => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
    );
  }, [selectedCategory, searchQuery, isYours, isAll]);

  // Upload card — reused in both All and Your Projects grids
  const UploadCard = token ? (
    <button
      onClick={() => fileInputRef.current?.click()}
      disabled={uploading}
      className="group relative bg-slate-900/70 rounded-lg border-2 border-dashed border-slate-700 hover:border-purple-500/60 hover:bg-slate-900 overflow-hidden transition-all duration-200 text-left disabled:opacity-60"
    >
      <div className="aspect-square flex flex-col items-center justify-center gap-2 text-slate-500 group-hover:text-purple-400 transition-colors">
        {uploading ? (
          <span className="w-8 h-8 border-2 border-slate-600 border-t-purple-400 rounded-full animate-spin" />
        ) : (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
        )}
      </div>
      <div className="p-3 space-y-1 border-t border-slate-800">
        <h3 className="text-xs font-medium text-slate-400 group-hover:text-slate-300 transition-colors">
          {uploading ? "Uploading…" : "Upload Background"}
        </h3>
        <p className="text-[10px] text-slate-600">📁 Your Projects</p>
      </div>
    </button>
  ) : (
    <Link
      href="/login"
      className="group relative bg-slate-900/70 rounded-lg border-2 border-dashed border-slate-700 hover:border-purple-500/60 hover:bg-slate-900 overflow-hidden transition-all duration-200 text-left"
    >
      <div className="aspect-square flex flex-col items-center justify-center gap-2 text-slate-500 group-hover:text-purple-400 transition-colors">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <div className="p-3 space-y-1 border-t border-slate-800">
        <h3 className="text-xs font-medium text-slate-400 group-hover:text-slate-300 transition-colors">
          Log in to upload
        </h3>
        <p className="text-[10px] text-slate-600">📁 Your Projects</p>
      </div>
    </Link>
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">

      {/* hidden file input — lives outside the grid so it's always mounted */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

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

          {/* Search — hidden on Your Projects tab */}
          {!isYours && (
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
          )}

          {/* Category filters */}
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {CATEGORIES.map((cat) => {
                const count =
                  cat.id === "all"   ? TEMPLATE_LIST.length + userBackgrounds.length + savedProjects.length :
                  cat.id === "yours" ? userBackgrounds.length + savedProjects.length :
                  TEMPLATE_LIST.filter((t) => t.category === cat.id).length;
                const isSelected = selectedCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    onClick={() => { setSelectedCategory(cat.id); setSearchQuery(""); }}
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

          {uploadError && (
            <p className="mb-4 text-xs text-red-400">{uploadError}</p>
          )}

          {/* Count */}
          <div className="mb-4 sm:mb-6">
            <p className="text-xs sm:text-sm text-slate-400">
              {isYours ? (
                <><span className="font-semibold text-slate-300">{userBackgrounds.length + savedProjects.length}</span> Items</>
              ) : (
                <><span className="font-semibold text-slate-300">{filteredTemplates.length + (isAll ? userBackgrounds.length + savedProjects.length : 0)}</span> Templates</>
              )}
            </p>
          </div>

          {/* ── Unified grid ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">

            {/* Upload card + user backgrounds — shown in "All" and "Your Projects" */}
            {showYoursCards && (
              <>
                {UploadCard}

                {userBackgrounds.map((bg) => (
                  <div
                    key={bg.id}
                    className="group relative bg-slate-900/70 rounded-lg border border-slate-800 overflow-hidden hover:shadow-lg hover:border-purple-500/50 hover:bg-slate-900 transition-all duration-200"
                  >
                    {/* Custom badge */}
                    <div className="absolute top-2 left-2 z-10 bg-slate-950/90 text-emerald-400 text-[10px] font-semibold px-2 py-0.5 rounded border border-emerald-500/30">
                      Custom
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(bg.id); }}
                      disabled={deletingId === bg.id}
                      className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600/90 hover:bg-red-500 rounded-full p-1 disabled:opacity-50"
                      title="Delete"
                    >
                      {deletingId === bg.id ? (
                        <span className="w-3 h-3 block border border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>

                    {/* Preview */}
                    <button onClick={() => openCustomBackground(bg)} className="block w-full text-left">
                      <div className="aspect-square bg-slate-900 border-b border-slate-800 overflow-hidden flex items-center justify-center">
                        <img
                          src={bgImageUrl(bg)}
                          alt={bg.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
                        />
                      </div>
                      <div className="p-3 space-y-1">
                        <h3 className="text-xs font-medium text-slate-200 line-clamp-2 leading-snug">
                          {bg.name}
                        </h3>
                        <p className="text-[10px] text-slate-500">📁 Your Projects</p>
                      </div>
                    </button>
                  </div>
                ))}

                {/* Saved editor projects */}
                {savedProjects.map((proj) => (
                  <div
                    key={proj.id}
                    className="group relative bg-slate-900/70 rounded-lg border border-slate-800 overflow-hidden hover:shadow-lg hover:border-purple-500/50 hover:bg-slate-900 transition-all duration-200"
                  >
                    {/* Saved badge */}
                    <div className="absolute top-2 left-2 z-10 bg-slate-950/90 text-purple-400 text-[10px] font-semibold px-2 py-0.5 rounded border border-purple-500/30">
                      Saved
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteProject(proj.id); }}
                      disabled={deletingProjectId === proj.id}
                      className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600/90 hover:bg-red-500 rounded-full p-1 disabled:opacity-50"
                      title="Delete project"
                    >
                      {deletingProjectId === proj.id ? (
                        <span className="w-3 h-3 block border border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>

                    {/* Preview */}
                    <button
                      onClick={() => {
                        let url = `/mockup-2d/editor?project=${proj.id}`;
                        if (proj.templateId) url += `&template=${encodeURIComponent(proj.templateId)}`;
                        else if (proj.bgUrl)  url += `&bg=${encodeURIComponent(proj.bgUrl)}`;
                        router.push(url);
                      }}
                      className="block w-full text-left"
                    >
                      <div className="aspect-square bg-slate-900 border-b border-slate-800 overflow-hidden flex items-center justify-center">
                        {proj.thumbnail ? (
                          <img
                            src={proj.thumbnail}
                            alt={proj.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-slate-600">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-[10px]">No preview</p>
                          </div>
                        )}
                      </div>
                      <div className="p-3 space-y-1">
                        <h3 className="text-xs font-medium text-slate-200 line-clamp-2 leading-snug">
                          {proj.name}
                        </h3>
                        <p className="text-[10px] text-slate-500">
                          🖼️ {new Date(proj.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </button>
                  </div>
                ))}
              </>
            )}

            {/* Built-in template cards — hidden on "Your Projects" tab */}
            {!isYours && filteredTemplates.map((template) => {
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

          {/* Empty state — only for template categories with no results */}
          {!isYours && filteredTemplates.length === 0 && !isAll && (
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
