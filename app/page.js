import Link from "next/link";
import CupViewer from "@/components/CupViewer";
import Navbar from "@/components/Navbar";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <Navbar subtitle="Fast product mockups in your browser" />

      <section className="flex-1 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.15),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(56,189,248,0.12),_transparent_55%)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20 grid gap-8 sm:gap-12 lg:gap-14 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-center">
          <div className="space-y-6 sm:space-y-8 order-2 lg:order-1">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-semibold tracking-tight leading-tight">
              Turn flat artwork into{" "}
              <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">
                3D product mockups
              </span>
              .
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-slate-300 max-w-2xl">
              Upload your design and preview it on shirts, cups, bottles, and
              boxes directly in the browser. Perfect for merch, e‑commerce
              listings, and client previews.
            </p>

            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-5">
              <Link
                href="/models"
                className="inline-flex items-center justify-center rounded-full bg-sky-500 px-6 sm:px-7 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-slate-950 shadow-lg shadow-sky-500/40 hover:bg-sky-400 transition w-full sm:w-auto"
              >
                Start 3D mockup tool
              </Link>
              <p className="text-xs sm:text-sm text-slate-400 text-center sm:text-left">
                No install required. Runs in your browser.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-3 text-[10px] sm:text-xs text-slate-400">
              <span className="rounded-full border border-slate-700/80 px-2.5 sm:px-3 py-1 bg-slate-900/60">
                3D viewer powered by three.js
              </span>
              <span className="rounded-full border border-slate-700/80 px-2.5 sm:px-3 py-1 bg-slate-900/60">
                Supports shirts, cups, bottles &amp; boxes
              </span>
              <span className="rounded-full border border-slate-700/80 px-2.5 sm:px-3 py-1 bg-slate-900/60">
                Drag‑to‑position artwork
              </span>
            </div>
          </div>

          <div className="relative order-1 lg:order-2">
            <div className="absolute inset-0 -translate-x-5 sm:-translate-x-10 -translate-y-3 sm:-translate-y-6 blur-3xl opacity-40 pointer-events-none bg-gradient-to-br from-sky-500 via-purple-500 to-emerald-400" />
            <div className="relative rounded-xl sm:rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-4 sm:p-6 shadow-2xl shadow-slate-900/80">
              <div className="mb-3 sm:mb-4 flex items-center justify-between text-[10px] sm:text-xs lg:text-sm text-slate-400">
                <span className="font-medium text-slate-200 text-xs sm:text-sm">
                  Live mockup preview
                </span>
                <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] sm:text-xs">
                  Demo
                </span>
              </div>
              <CupViewer />
              <div className="mt-3 sm:mt-4 grid grid-cols-4 gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] lg:text-xs text-slate-300">
                <span className="rounded-lg border border-slate-900 bg-slate-950 px-1.5 sm:px-2 py-1 text-center text-slate-500 truncate">
                  Shirt
                </span>
                <span className="rounded-lg border border-sky-500/50 bg-sky-500/10 px-1.5 sm:px-2 py-1 text-center text-sky-300 truncate">
                  Cup
                </span>
                <span className="rounded-lg border border-slate-900 bg-slate-950 px-1.5 sm:px-2 py-1 text-center text-slate-500 truncate">
                  Bottle
                </span>
                <span className="rounded-lg border border-slate-900 bg-slate-950 px-1.5 sm:px-2 py-1 text-center text-slate-500 truncate">
                  Box
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section - Scroll Down */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-12 space-y-3 sm:space-y-4">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight px-4">
              Platform <span className="bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">Statistics</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto px-4">
              Discover the scale of our 3D mockup platform and join thousands of creators
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-5xl mx-auto">
            {/* Categories Stat */}
            <div className="group relative rounded-xl sm:rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-6 sm:p-8 text-center hover:border-sky-500/50 transition-all duration-300">
              <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-sky-500/0 to-sky-500/0 group-hover:from-sky-500/5 group-hover:to-sky-500/0 transition-all duration-300 pointer-events-none" />
              <div className="relative">
                <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent mb-2">
                  4
                </div>
                <div className="text-lg sm:text-xl font-semibold text-slate-200 mb-2">
                  Categories
                </div>
                <p className="text-xs sm:text-sm text-slate-400">
                  Cups, Shirts, Bottles, and Boxes
                </p>
              </div>
            </div>

            {/* Models Stat */}
            <div className="group relative rounded-xl sm:rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-6 sm:p-8 text-center hover:border-emerald-500/50 transition-all duration-300">
              <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/5 group-hover:to-emerald-500/0 transition-all duration-300 pointer-events-none" />
              <div className="relative">
                <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-300 bg-clip-text text-transparent mb-2">
                  12+
                </div>
                <div className="text-lg sm:text-xl font-semibold text-slate-200 mb-2">
                  Models
                </div>
                <p className="text-xs sm:text-sm text-slate-400">
                  Multiple variations per category
                </p>
              </div>
            </div>

            {/* Users Stat */}
            <div className="group relative rounded-xl sm:rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-6 sm:p-8 text-center hover:border-purple-500/50 transition-all duration-300 sm:col-span-2 lg:col-span-1">
              <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-500/0 to-purple-500/0 group-hover:from-purple-500/5 group-hover:to-purple-500/0 transition-all duration-300 pointer-events-none" />
              <div className="relative">
                <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-300 bg-clip-text text-transparent mb-2">
                  10K+
                </div>
                <div className="text-lg sm:text-xl font-semibold text-slate-200 mb-2">
                  Active Users
                </div>
                <p className="text-xs sm:text-sm text-slate-400">
                  Creators using our platform daily
                </p>
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="mt-12 sm:mt-16 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-slate-200 mb-2 sm:mb-3">
                  🎨 Rich Model Library
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Our platform offers a diverse collection of 3D models across multiple categories. 
                  Each category includes several variations to suit different design needs and preferences.
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-slate-200 mb-2 sm:mb-3">
                  👥 Growing Community
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Join thousands of designers, marketers, and creators who trust our platform 
                  for creating stunning 3D product mockups. Start creating today!
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
