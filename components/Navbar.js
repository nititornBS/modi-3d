"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";
import UserInfoDisplay from "./UserInfoDisplay";

const NAV_LINKS = [
  { href: "/models", label: "3D Mockup" },
  { href: "/mockup-2d", label: "2D Mockup" },
  { href: "/remove-background", label: "Remove BG" },
];

export default function Navbar({
  subtitle = null,
  backLink = null,
  backText = null,
  rightAction = null
}) {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { info } = useToast();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isUserInfoOpen, setIsUserInfoOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLoginClick = () => {
    const currentPath = window.location.pathname;
    router.push(`/login?returnUrl=${encodeURIComponent(currentPath)}`);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const getLoginMethodLabel = (method) => {
    if (method === "google") return "Google";
    if (method === "password") return "Email/Password";
    return method || "Unknown";
  };

  const getDisplayUsername = () => {
    if (user?.username?.trim().length > 0) return user.username;
    if (user?.email) return user.email.split("@")[0] || null;
    return null;
  };

  const getInitials = () => {
    if (user?.name) {
      const names = user.name.split(" ");
      return names.length >= 2
        ? (names[0][0] + names[1][0]).toUpperCase()
        : names[0][0].toUpperCase();
    }
    if (user?.username?.length > 0) return user.username.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return "U";
  };

  const isActive = (href) => pathname === href || pathname.startsWith(href + "/");

  // Skeleton for auth area while loading — prevents blink
  const authSkeleton = (
    <div className="w-24 h-8 rounded-xl bg-white/[0.06] animate-pulse" />
  );

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-4">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-sky-500/30">
                <span className="text-[10px] font-black text-slate-950 tracking-tight">M3D</span>
              </div>
              <span className="font-semibold text-slate-100 text-sm hidden sm:block">Mockup 3D Studio</span>
            </Link>

            {/* Center Nav Links — only shown when authenticated */}
            <nav className={`hidden md:flex items-center gap-1 ${!isLoading && !isAuthenticated() ? "invisible pointer-events-none" : ""}`}>
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive(link.href)
                      ? "bg-sky-500/15 text-sky-300 border border-sky-500/20"
                      : "text-slate-400 hover:text-slate-100 hover:bg-white/[0.06]"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-2 shrink-0">
              {backLink && (
                <Link href={backLink} className="text-xs text-slate-400 hover:text-sky-400 transition hidden sm:block">
                  {backText || "← Back"}
                </Link>
              )}

              {/* Mobile menu toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] transition"
              >
                {isMobileMenuOpen ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>

              {isLoading ? authSkeleton : isAuthenticated() ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-sky-500/40 hover:bg-white/[0.07] transition-all"
                  >
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center text-xs font-bold text-slate-950 overflow-hidden">
                      {user?.picture ? (
                        <img src={user.picture} alt={user.name || user.username} className="w-full h-full object-cover" />
                      ) : getInitials()}
                    </div>
                    <span className="hidden sm:inline text-xs text-slate-300 font-medium max-w-[100px] truncate">
                      {user?.name || getDisplayUsername() || "User"}
                    </span>
                    <svg className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-slate-900/95 border border-white/[0.08] shadow-2xl shadow-black/60 backdrop-blur-xl overflow-hidden">
                      <div className="p-4 border-b border-white/[0.06]">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center text-base font-bold text-slate-950 flex-shrink-0 overflow-hidden">
                            {user?.picture ? (
                              <img src={user.picture} alt={user.name || user.username} className="w-full h-full object-cover" />
                            ) : getInitials()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-slate-100 truncate">{user?.name || getDisplayUsername() || "No name"}</div>
                            {user?.email && <div className="text-[11px] text-slate-500 truncate">{user.email}</div>}
                          </div>
                        </div>
                      </div>

                      <div className="p-2">
                        <button
                          onClick={() => { setIsDropdownOpen(false); setIsUserInfoOpen(true); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/[0.06] hover:text-slate-100 transition-colors"
                        >
                          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Profile
                        </button>
                      </div>

                      <div className="p-2 pt-0">
                        <button
                          onClick={() => {
                            setIsDropdownOpen(false);
                            info("Logged out successfully. See you soon!");
                            setTimeout(() => logout(), 300);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Log out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                rightAction || (
                  <button
                    onClick={handleLoginClick}
                    className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold shadow-lg shadow-sky-500/25 transition-all"
                  >
                    Log in
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && isAuthenticated() && (
          <div className="md:hidden border-t border-white/[0.06] bg-slate-950/95 backdrop-blur-xl px-4 py-3 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive(link.href)
                    ? "bg-sky-500/15 text-sky-300"
                    : "text-slate-400 hover:text-slate-100 hover:bg-white/[0.06]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      <UserInfoDisplay isOpen={isUserInfoOpen} onClose={() => setIsUserInfoOpen(false)} />
    </>
  );
}
