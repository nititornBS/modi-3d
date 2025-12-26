"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TEMPLATE_CATEGORIES } from "./templates";

export default function Mockup2DSelectionPage() {
  const router = useRouter();

  const categories = TEMPLATE_CATEGORIES;

  const handleTemplateSelect = (templateId, categoryId) => {
    router.push(`/mockup-2d/editor?template=${templateId}`);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <Navbar subtitle="2D Mockup Templates" backLink="/" backText="← Back to Tools" />

      <section className="flex-1 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="text-center mb-12 sm:mb-16 space-y-4">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-rose-400 bg-clip-text text-transparent">
                Select a Template
              </span>
            </h1>
            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
              Choose a mockup template from the categories below
            </p>
          </div>

          {/* Categories */}
          <div className="space-y-12">
            {categories.map((category) => (
              <div key={category.id} className="space-y-6">
                {/* Category Header */}
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{category.icon}</div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-semibold text-slate-100">
                      {category.name}
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">{category.description}</p>
                  </div>
                </div>

                {/* Templates Grid */}
                {category.templates.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {category.templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleTemplateSelect(template.id, category.id)}
                        className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-950/80 hover:border-purple-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20"
                      >
                        <div className="aspect-[4/3] relative overflow-hidden bg-slate-900">
                          <img
                            src={template.image}
                            alt={template.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                        </div>
                        <div className="p-4 sm:p-6">
                          <h3 className="text-lg font-semibold text-slate-100 mb-2 group-hover:text-purple-300 transition-colors">
                            {template.name}
                          </h3>
                          <div className="flex items-center text-purple-400 group-hover:text-purple-300 transition-colors">
                            <span className="text-sm font-medium">Use Template</span>
                            <svg
                              className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 7l5 5m0 0l-5 5m5-5H6"
                              />
                            </svg>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center">
                    <p className="text-slate-400">No templates available in this category yet.</p>
                    <p className="text-sm text-slate-500 mt-2">Check back soon for new templates!</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer Info */}
          <div className="mt-16 text-center">
            <p className="text-sm text-slate-400">
              Select a template to start creating your mockup
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
