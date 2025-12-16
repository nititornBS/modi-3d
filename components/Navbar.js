"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function Navbar({ 
  subtitle = "Fast product mockups in your browser",
  backLink = null,
  backText = null,
  rightAction = null 
}) {
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();

  const handleLoginClick = () => {
    const currentPath = window.location.pathname;
    router.push(`/login?returnUrl=${encodeURIComponent(currentPath)}`);
  };

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 text-sm sm:text-base">
          <span className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-sky-500 via-cyan-400 to-emerald-400 shadow-md shadow-sky-500/40 flex items-center justify-center text-[11px] font-bold">
            M3D
          </span>
          <div>
            <span className="font-medium text-slate-100">Mockup 3D Studio</span>
            {subtitle && (
              <span className="ml-2 text-xs text-slate-400 hidden sm:inline">
                • {subtitle}
              </span>
            )}
          </div>
        </Link>
        
        <div className="flex items-center gap-3">
          {backLink && (
            <Link
              href={backLink}
              className="text-xs sm:text-sm text-slate-400 hover:text-sky-400 transition"
            >
              {backText || "← Back"}
            </Link>
          )}
          {isAuthenticated() ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center text-xs font-bold text-slate-950">
                  {user?.username?.charAt(0).toUpperCase() || "U"}
                </div>
                <span className="text-xs text-slate-300">{user?.username || "User"}</span>
              </div>
              <button
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium text-slate-100 shadow-sm hover:border-sky-500 hover:text-sky-100 transition"
              >
                <span className="hidden sm:inline">Log out</span>
                <span className="sm:hidden">Logout</span>
              </button>
            </div>
          ) : (
            rightAction || (
              <button
                onClick={handleLoginClick}
                className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium text-slate-100 shadow-sm hover:border-sky-500 hover:text-sky-100 transition"
              >
                <span className="hidden sm:inline">Log in</span>
                <span className="sm:hidden">Login</span>
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
}
