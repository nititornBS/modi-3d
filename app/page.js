import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function LandingPage() {
  const tools = [
    {
      id: "3d-mockup",
      title: "3D Mockup",
      description: "Create stunning 3D product mockups with your designs on shirts, cups, bottles, and boxes.",
      href: "/models",
      icon: "🎨",
      gradient: "from-sky-500 via-cyan-400 to-emerald-400",
      features: ["3D viewer", "Multiple models", "Real-time preview"],
    },
    {
      id: "2d-mockup",
      title: "2D Mockup",
      description: "Generate professional 2D product mockups and presentations for your designs.",
      href: "/mockup-2d",
      icon: "📐",
      gradient: "from-purple-500 via-pink-400 to-rose-400",
      features: ["Quick generation", "Multiple templates", "Export ready"],
    },
    {
      id: "remove-background",
      title: "Remove Background",
      description: "Instantly remove backgrounds from your images with AI-powered precision.",
      href: "/remove-background",
      icon: "✨",
      gradient: "from-emerald-500 via-teal-400 to-cyan-400",
      features: ["AI powered", "Instant processing", "High quality"],
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <Navbar subtitle="Creative tools for designers" />

      <section className="flex-1 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.15),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(56,189,248,0.12),_transparent_55%)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
          {/* Header */}
          <div className="text-center mb-12 sm:mb-16 space-y-4 sm:space-y-6">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-tight">
              Choose Your{" "}
              <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">
                Creative Tool
              </span>
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-slate-300 max-w-3xl mx-auto">
              Powerful design tools to bring your creative ideas to life. All running directly in your browser.
            </p>
          </div>

          {/* Tools Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
            {tools.map((tool) => (
              <Link
                key={tool.id}
                href={tool.href}
                className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-6 sm:p-8 hover:border-slate-700 transition-all duration-300 hover:shadow-2xl hover:shadow-sky-500/20"
              >
                {/* Gradient Background on Hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                
                <div className="relative space-y-4">
                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center text-3xl shadow-lg shadow-sky-500/20 group-hover:scale-110 transition-transform duration-300`}>
                    {tool.icon}
                  </div>

                  {/* Content */}
                  <div className="space-y-2">
                    <h3 className="text-xl sm:text-2xl font-semibold text-slate-100 group-hover:text-white transition-colors">
                      {tool.title}
                    </h3>
                    <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
                      {tool.description}
                    </p>
                  </div>

                  {/* Features */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {tool.features.map((feature, index) => (
                      <span
                        key={index}
                        className="text-xs px-3 py-1 rounded-full border border-slate-700 bg-slate-900/50 text-slate-400"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center text-sky-400 group-hover:text-sky-300 transition-colors pt-2">
                    <span className="text-sm font-medium">Get Started</span>
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
              </Link>
            ))}
          </div>

          {/* Info Section */}
          <div className="mt-16 sm:mt-20 text-center">
            <p className="text-sm text-slate-400">
              No installation required • All tools run in your browser • Fast and secure
            </p>
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
              Discover the scale of our creative platform and join thousands of creators
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
                  Creative tools for designers
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
                  Tools
                </div>
                <p className="text-xs sm:text-sm text-slate-400">
                  3D, 2D mockups & background removal
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
