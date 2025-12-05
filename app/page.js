import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <header className="border-b border-slate-800/80 bg-slate-950/80/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-sky-500 via-cyan-400 to-emerald-400 shadow-lg shadow-sky-500/40 flex items-center justify-center text-sm font-bold">
              M3D
            </div>
            <div>
              <p className="text-xl font-semibold tracking-tight">
                Mockup 3D Studio
              </p>
              <p className="text-sm text-slate-400">
                Fast product mockups in your browser
              </p>
            </div>
          </div>

          <button className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-5 py-2 text-sm font-medium text-slate-100 shadow-sm hover:border-sky-500 hover:text-sky-100 transition">
            Log in
          </button>
        </div>
      </header>

      <section className="flex-1 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.15),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(56,189,248,0.12),_transparent_55%)]">
        <div className="max-w-7xl mx-auto px-6 py-20 grid gap-14 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-center">
          <div className="space-y-8">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight leading-tight">
              Turn flat artwork into{" "}
              <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">
                3D product mockups
              </span>
              .
            </h1>
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl">
              Upload your design and preview it on shirts, cups, bottles, and
              boxes directly in the browser. Perfect for merch, e‑commerce
              listings, and client previews.
            </p>

            <div className="flex flex-wrap items-center gap-5">
              <Link
                href="/studio"
                className="inline-flex items-center justify-center rounded-full bg-sky-500 px-7 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-sky-500/40 hover:bg-sky-400 transition"
              >
                Open 3D mockup tool
              </Link>
              <p className="text-sm text-slate-400">
                No install required. Runs in your browser.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-slate-400">
              <span className="rounded-full border border-slate-700/80 px-3 py-1 bg-slate-900/60">
                3D viewer powered by three.js
              </span>
              <span className="rounded-full border border-slate-700/80 px-3 py-1 bg-slate-900/60">
                Supports shirts, cups, bottles &amp; boxes
              </span>
              <span className="rounded-full border border-slate-700/80 px-3 py-1 bg-slate-900/60">
                Drag‑to‑position artwork
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 -translate-x-10 -translate-y-6 blur-3xl opacity-40 pointer-events-none bg-gradient-to-br from-sky-500 via-purple-500 to-emerald-400" />
            <div className="relative rounded-[2rem] border border-slate-800/80 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 shadow-2xl shadow-slate-900/80">
              <div className="mb-4 flex items-center justify-between text-xs sm:text-sm text-slate-400">
                <span className="font-medium text-slate-200">
                  Live mockup preview
                </span>
                <span className="rounded-full border border-slate-700 px-2 py-0.5">
                  Demo
                </span>
              </div>
              <div className="aspect-[16/10] rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-sm text-slate-500">
                3D viewer preview
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2 text-[11px] sm:text-xs text-slate-300">
                <span className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-center">
                  Shirt
                </span>
                <span className="rounded-lg border border-slate-900 bg-slate-950 px-2 py-1 text-center text-slate-500">
                  Cup
                </span>
                <span className="rounded-lg border border-slate-900 bg-slate-950 px-2 py-1 text-center text-slate-500">
                  Bottle
                </span>
                <span className="rounded-lg border border-slate-900 bg-slate-950 px-2 py-1 text-center text-slate-500">
                  Box
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}


