"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";

const tools = [
  {
    id: "3d-mockup",
    title: "3D Mockup",
    description: "Place your designs on shirts, cups, bottles, and boxes with a real-time 3D viewer.",
    href: "/models",
    icon: "/cube.png",
    accent: "sky",
    features: ["3D viewer", "Multiple models", "Real-time preview"],
  },
  {
    id: "2d-mockup",
    title: "2D Mockup",
    description: "Generate clean, professional 2D product presentations from your designs.",
    href: "/mockup-2d",
    icon: "/mockup.png",
    accent: "violet",
    features: ["Quick generation", "Multiple templates", "Export ready"],
  },
  {
    id: "remove-background",
    title: "Remove Background",
    description: "Strip backgrounds from images with precision using brush tools and manual refinement.",
    href: "/remove-background",
    icon: "/remove.png",
    accent: "emerald",
    features: ["Brush tools", "Manual refinement", "PNG export"],
  },
];

const accentMap = {
  sky:     { card: "hover:border-sky-500/40 hover:shadow-sky-500/10",     badge: "bg-sky-500/10 text-sky-400 border-sky-500/20",     icon: "from-sky-500 to-cyan-400 shadow-sky-500/25",    arrow: "text-sky-400 group-hover:text-sky-300" },
  violet:  { card: "hover:border-violet-500/40 hover:shadow-violet-500/10", badge: "bg-violet-500/10 text-violet-400 border-violet-500/20", icon: "from-violet-500 to-purple-400 shadow-violet-500/25", arrow: "text-violet-400 group-hover:text-violet-300" },
  emerald: { card: "hover:border-emerald-500/40 hover:shadow-emerald-500/10", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: "from-emerald-500 to-teal-400 shadow-emerald-500/25", arrow: "text-emerald-400 group-hover:text-emerald-300" },
};

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const handleToolClick = (e, tool) => {
    if (!isAuthenticated()) {
      e.preventDefault();
      router.push(`/login?returnUrl=${encodeURIComponent(tool.href)}`);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">

      {/* Hero */}
      <section className="relative flex-1 flex flex-col">
        {/* Subtle dot grid background */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(148,163,184,0.08) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* Top glow */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-sky-500/10 blur-[100px] rounded-full" />

        <div className="relative max-w-7xl mx-auto w-full px-4 sm:px-6 py-16 sm:py-24 flex flex-col items-center">

          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-sky-500/20 bg-sky-500/5 text-sky-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            All tools run in your browser — no install needed
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-center leading-[1.1] mb-6 max-w-4xl">
            Design mockups{" "}
            <span className="bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">
              in seconds
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-400 text-center max-w-xl mb-12 leading-relaxed">
            3D mockups, 2D presentations, and background removal — everything you need to showcase your designs.
          </p>

          {/* Tool Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-5xl">
            {tools.map((tool) => {
              const a = accentMap[tool.accent];
              return (
                <Link
                  key={tool.id}
                  href={tool.href}
                  onClick={(e) => handleToolClick(e, tool)}
                  className={`group relative flex flex-col rounded-2xl border border-white/[0.07] bg-slate-900/60 p-6 hover:shadow-xl transition-all duration-300 ${a.card}`}
                >
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${a.icon} flex items-center justify-center mb-5 shadow-lg group-hover:scale-105 transition-transform duration-300 p-2`}>
                    <Image src={tool.icon} alt={tool.title} width={36} height={36} className="object-contain" />
                  </div>

                  {/* Text */}
                  <h3 className="text-lg font-semibold text-slate-100 mb-2 group-hover:text-white transition-colors">
                    {tool.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-5 flex-1">
                    {tool.description}
                  </p>

                  {/* Feature badges */}
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {tool.features.map((f) => (
                      <span key={f} className={`text-[11px] px-2.5 py-0.5 rounded-full border font-medium ${a.badge}`}>
                        {f}
                      </span>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className={`flex items-center text-sm font-medium ${a.arrow} transition-colors`}>
                    Open tool
                    <svg className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer strip */}
      <footer className="border-t border-white/[0.06] py-6 text-center text-xs text-slate-600">
        No installation required · Runs entirely in your browser · Fast & secure
      </footer>
    </main>
  );
}
