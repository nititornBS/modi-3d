"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { apiClient } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { success, error: showError } = useToast();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [returnUrl, setReturnUrl] = useState("");

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

    // Validation
    if (!username || !email || !password || !confirmPassword) {
      const errorMsg = "Please fill in all fields";
      setError(errorMsg);
      showError(errorMsg);
      return;
    }

    if (password !== confirmPassword) {
      const errorMsg = "Passwords do not match";
      setError(errorMsg);
      showError(errorMsg);
      return;
    }

    if (password.length < 6) {
      const errorMsg = "Password must be at least 6 characters long";
      setError(errorMsg);
      showError(errorMsg);
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiClient.register(username, email, password);

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
      success("Registration successful! Welcome to M3D.");

      // Redirect to the page they came from or models page
      const returnUrl = new URLSearchParams(window.location.search).get("returnUrl") || "/models";
      router.push(returnUrl);
    } catch (err) {
      console.error("Registration error:", err);
      const errorMsg = err.message || "Registration failed. Please try again.";
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
        <div className="text-center mb-8 animate-[fadeIn_0.6s_ease-out]">
          <Link href="/" className="inline-flex items-center gap-2 mb-4 group">
            <span className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-sky-500 via-cyan-400 to-emerald-400 shadow-md shadow-sky-500/40 flex items-center justify-center text-sm font-bold transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-sky-500/60 animate-pulse">
              M3D
            </span>
          </Link>
          <h1 className="text-3xl font-bold text-slate-100 mb-2 animate-[fadeInUp_0.6s_ease-out_0.1s_both]">Create Account</h1>
          <p className="text-sm text-slate-400 animate-[fadeInUp_0.6s_ease-out_0.2s_both]">Sign up to start creating amazing 3D mockups</p>
        </div>

        {/* Register Card */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl p-6 sm:p-8 animate-[fadeInUp_0.6s_ease-out_0.3s_both]">
          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-[slideInRight_0.4s_ease-out]">
              {error}
            </div>
          )}

          {/* Register form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="animate-[fadeInUp_0.5s_ease-out_0.4s_both]">
              <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-700 bg-slate-950 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all duration-300 hover:border-slate-600"
                placeholder="Choose a username"
                disabled={isLoading}
                required
                autoFocus
              />
            </div>

            <div className="animate-[fadeInUp_0.5s_ease-out_0.5s_both]">
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
                disabled={isLoading}
                required
              />
            </div>

            <div className="animate-[fadeInUp_0.5s_ease-out_0.6s_both]">
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-700 bg-slate-950 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all duration-300 hover:border-slate-600"
                placeholder="Create a password"
                disabled={isLoading}
                required
                minLength={6}
              />
            </div>

            <div className="animate-[fadeInUp_0.5s_ease-out_0.7s_both]">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-700 bg-slate-950 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all duration-300 hover:border-slate-600"
                placeholder="Confirm your password"
                disabled={isLoading}
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-semibold shadow-lg shadow-sky-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl hover:shadow-sky-500/50 animate-[fadeInUp_0.5s_ease-out_0.8s_both]"
            >
              {isLoading ? "Creating account..." : "Sign Up"}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-slate-400 animate-[fadeIn_0.5s_ease-out_0.9s_both]">
            Already have an account?{" "}
            <Link 
              href={returnUrl ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` : "/login"}
              className="text-sky-400 hover:text-sky-300 transition-colors duration-300 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Back to home */}
        <div className="mt-6 text-center animate-[fadeIn_0.5s_ease-out_0.9s_both]">
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

