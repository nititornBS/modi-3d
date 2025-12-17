"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";
import UserInfoDisplay from "./UserInfoDisplay";

export default function Navbar({ 
  subtitle = "Fast product mockups in your browser",
  backLink = null,
  backText = null,
  rightAction = null 
}) {
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const { info } = useToast();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isUserInfoOpen, setIsUserInfoOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLoginClick = () => {
    const currentPath = window.location.pathname;
    router.push(`/login?returnUrl=${encodeURIComponent(currentPath)}`);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const getLoginMethodLabel = (method) => {
    if (method === "google") return "Google";
    if (method === "password") return "Email/Password";
    return method || "Unknown";
  };

  const getInitials = () => {
    if (user?.name) {
      const names = user.name.split(" ");
      if (names.length >= 2) {
        return (names[0][0] + names[1][0]).toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    if (user?.username) {
      return user.username.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
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
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-sky-500 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center text-sm font-bold text-slate-950">
                  {user?.picture ? (
                    <img 
                      src={user.picture} 
                      alt={user.name || user.username} 
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    getInitials()
                  )}
                </div>
                <span className="hidden sm:inline text-xs text-slate-300 font-medium">
                  {user?.name || user?.username || "User"}
                </span>
                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* User Info Section */}
                  <div className="p-4 border-b border-slate-800 bg-slate-950/50">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center text-lg font-bold text-slate-950 flex-shrink-0">
                        {user?.picture ? (
                          <img 
                            src={user.picture} 
                            alt={user.name || user.username} 
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          getInitials()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-100 truncate">
                          {user?.name || "No name"}
                        </div>
                        <div className="text-xs text-slate-400 truncate">
                          @{user?.username || "username"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span>Signed in with {getLoginMethodLabel(user?.method)}</span>
                    </div>
                    {user?.email && (
                      <div className="mt-2 text-xs text-slate-500 truncate">
                        {user.email}
                      </div>
                    )}
                  </div>

                  {/* User Information Button */}
                  <div className="p-2 border-b border-slate-800">
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setIsUserInfoOpen(true);
                      }}
                      className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800/50 hover:text-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>User Information</span>
                      </div>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  {/* Logout Button */}
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        info("Logged out successfully. See you soon!");
                        setTimeout(() => {
                          logout();
                        }, 300);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
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
                className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium text-slate-100 shadow-sm hover:border-sky-500 hover:text-sky-100 transition"
              >
                <span className="hidden sm:inline">Log in</span>
                <span className="sm:hidden">Login</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* User Info Display */}
      <UserInfoDisplay isOpen={isUserInfoOpen} onClose={() => setIsUserInfoOpen(false)} />
    </header>
  );
}
