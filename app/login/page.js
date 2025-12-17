"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { success, error: showError } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const googleButtonRef = useRef(null);
  const googleLoaded = useRef(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Simulate login - replace with actual authentication API call
      if (username && password) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        // In a real app, you would validate credentials with your backend
        // For now, we'll accept any username/password combination
        login({
          username: username,
          email: `${username}@example.com`,
          method: "password",
        });
        
        // Show success notification
        success("Login successful! Welcome back.");
        
        // Redirect to the page they came from or home
        const returnUrl = new URLSearchParams(window.location.search).get("returnUrl") || "/models";
        router.push(returnUrl);
      } else {
        const errorMsg = "Please enter both username and password";
        setError(errorMsg);
        showError(errorMsg);
      }
    } catch (err) {
      const errorMsg = "Login failed. Please try again.";
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
        setError("Google login is not configured. Please check your environment variables.");
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
        setError("Failed to load Google Identity Services");
      };
      document.head.appendChild(script);

      return () => {
        // Cleanup if needed
      };
    }
  }, []);

  const handleGoogleCallback = async (response) => {
    setError("");
    setIsLoading(true);

    try {
      // Send the credential to our API to verify and get user info
      const apiResponse = await fetch("/api/auth/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ credential: response.credential }),
      });

      const data = await apiResponse.json();

      if (!apiResponse.ok || !data.success) {
        throw new Error(data.error || "Google login failed");
      }

      // Login the user with the data from Google
      login(data.user);

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
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <span className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-sky-500 via-cyan-400 to-emerald-400 shadow-md shadow-sky-500/40 flex items-center justify-center text-sm font-bold">
              M3D
            </span>
          </Link>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Welcome Back</h1>
          <p className="text-sm text-slate-400">Sign in to your account to continue</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl p-6 sm:p-8">
          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-700 bg-slate-950 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                placeholder="Enter your username"
                disabled={isLoading}
                required
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-700 bg-slate-950 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                placeholder="Enter your password"
                disabled={isLoading}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-semibold shadow-lg shadow-sky-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
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
            className="w-full flex justify-center"
            style={{ minHeight: "40px" }}
          />
          {isLoading && (
            <div className="mt-2 text-center text-sm text-slate-400">
              Signing in with Google...
            </div>
          )}

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-slate-400">
            Don't have an account?{" "}
            <Link href="/signup" className="text-sky-400 hover:text-sky-300 transition-colors">
              Sign up
            </Link>
          </p>
        </div>

        {/* Back to home */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-slate-400 hover:text-sky-400 transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
