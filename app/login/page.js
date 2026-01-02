"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { apiClient } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { success, error: showError } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [returnUrl, setReturnUrl] = useState("");
  const googleButtonRef = useRef(null);
  const googleLoaded = useRef(false);

  // Get returnUrl from query params
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const url = params.get("returnUrl");
      if (url) {
        setReturnUrl(url);
      }
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (!email || !password) {
        const errorMsg = "Please enter both email and password";
        setError(errorMsg);
        showError(errorMsg);
        setIsLoading(false);
        return;
      }

      const response = await apiClient.login(email, password);

      // Store user data and token
      login(
        {
          id: response.user.id,
          username: response.user.username,
          email: response.user.email,
          method: "password",
        },
        response.token
      );

      // Show success notification
      success("Login successful! Welcome back.");

      // Redirect to the page they came from or home
      const returnUrl = new URLSearchParams(window.location.search).get("returnUrl") || "/models";
      router.push(returnUrl);
    } catch (err) {
      console.error("Login error:", err);
      const errorMsg = err.message || "Login failed. Please try again.";
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Load Google Identity Services
  useEffect(() => {
    if (typeof window !== "undefined" && !googleLoaded.current) {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      
      if (!clientId) {
        console.error("Google Client ID is not configured");
        return;
      }

      // Load Google Identity Services script
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.google && window.google.accounts) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleCallback,
          });

          // Render the button
          if (googleButtonRef.current) {
            window.google.accounts.id.renderButton(googleButtonRef.current, {
              theme: "outline",
              size: "large",
              width: "100%",
              text: "signin_with",
              locale: "en",
            });
          }
          googleLoaded.current = true;
        }
      };
      script.onerror = () => {
        console.error("Failed to load Google Identity Services");
      };
      document.head.appendChild(script);

      return () => {
        // Cleanup if needed
      };
    }
  }, []);

  const handleGoogleCallback = async (response) => {
    setError("");
    setIsGoogleLoading(true);
    setIsLoading(true);

    try {
      // Send the idToken to backend API
      const data = await apiClient.googleLogin(response.credential);

      // Store user data and token
      login(
        {
          id: data.user.id,
          username: data.user.username,
          email: data.user.email,
          method: "google",
        },
        data.token
      );

      // Show success notification
      success("Login successful! Welcome back.");

      // Redirect to the page they came from or home
      const returnUrl = new URLSearchParams(window.location.search).get("returnUrl") || "/models";
      router.push(returnUrl);
    } catch (err) {
      console.error("Google login error:", err);
      const errorMsg = err.message || "Google login failed. Please try again.";
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setIsGoogleLoading(false);
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8 animate-[fadeIn_0.6s_ease-out]">
          <Link href="/" className="inline-flex items-center gap-2 mb-4 group">
            <span className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-sky-500 via-cyan-400 to-emerald-400 shadow-md shadow-sky-500/40 flex items-center justify-center text-sm font-bold transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-sky-500/60 animate-pulse">
              M3D
            </span>
          </Link>
          <h1 className="text-3xl font-bold text-slate-100 mb-2 animate-[fadeInUp_0.6s_ease-out_0.1s_both]">Welcome Back</h1>
          <p className="text-sm text-slate-400 animate-[fadeInUp_0.6s_ease-out_0.2s_both]">Sign in to your account to continue</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl p-6 sm:p-8 animate-[fadeInUp_0.6s_ease-out_0.3s_both]">
          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-[slideInRight_0.4s_ease-out]">
              {error}
            </div>
          )}

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <div className="animate-[fadeInUp_0.5s_ease-out_0.4s_both]">
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-700 bg-slate-950 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all duration-300 hover:border-slate-600"
                placeholder="Enter your email"
                disabled={isLoading || isGoogleLoading}
                required
                autoFocus
              />
            </div>

            <div className="animate-[fadeInUp_0.5s_ease-out_0.5s_both]">
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-700 bg-slate-950 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all duration-300 hover:border-slate-600"
                placeholder="Enter your password"
                disabled={isLoading || isGoogleLoading}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-semibold shadow-lg shadow-sky-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl hover:shadow-sky-500/50"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6 animate-[fadeIn_0.5s_ease-out_0.6s_both]">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-slate-900 text-slate-400">Or continue with</span>
            </div>
          </div>

          {/* Google login button */}
          <div 
            ref={googleButtonRef}
            className="w-full flex justify-center animate-[fadeIn_0.5s_ease-out_0.7s_both]"
            style={{ minHeight: "40px", opacity: isGoogleLoading ? 0.5 : 1, pointerEvents: isGoogleLoading ? "none" : "auto" }}
          />
          
          {/* Google loading indicator */}
          {isGoogleLoading && (
            <div className="mt-4 p-4 rounded-lg bg-sky-500/10 border border-sky-500/20 animate-[fadeIn_0.4s_ease-out]">
              <div className="flex items-center justify-center gap-3">
                <svg
                  className="animate-spin h-5 w-5 text-sky-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span className="text-sm font-medium text-sky-400">
                  Signing in with Google...
                </span>
              </div>
              <p className="mt-2 text-xs text-center text-slate-400">
                Please wait while we authenticate you
              </p>
            </div>
          )}

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-slate-400 animate-[fadeIn_0.5s_ease-out_0.8s_both]">
            Don't have an account?{" "}
            <Link 
              href={returnUrl ? `/register?returnUrl=${encodeURIComponent(returnUrl)}` : "/register"}
              className="text-sky-400 hover:text-sky-300 transition-colors duration-300 hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>

        {/* Back to home */}
        <div className="mt-6 text-center animate-[fadeIn_0.5s_ease-out_0.8s_both]">
          <Link
            href="/"
            className="text-sm text-slate-400 hover:text-sky-400 transition-colors duration-300 hover:underline inline-flex items-center gap-1"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
