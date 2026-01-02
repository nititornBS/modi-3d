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
  const [usernameAvailable, setUsernameAvailable] = useState(null); // null = not checked, true = available, false = taken/invalid
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameMessage, setUsernameMessage] = useState("");

  // Password validation functions
  const passwordValidations = {
    minLength: (pwd) => pwd.length >= 8,
    hasCapital: (pwd) => /[A-Z]/.test(pwd),
    hasNumber: (pwd) => /[0-9]/.test(pwd),
    hasSpecial: (pwd) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
  };

  // Check all password conditions
  const getPasswordValidation = (pwd) => {
    return {
      minLength: passwordValidations.minLength(pwd),
      hasCapital: passwordValidations.hasCapital(pwd),
      hasNumber: passwordValidations.hasNumber(pwd),
      hasSpecial: passwordValidations.hasSpecial(pwd),
    };
  };

  const passwordValidation = getPasswordValidation(password);
  const isPasswordValid = Object.values(passwordValidation).every(Boolean);

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

  // Debounced username availability check
  useEffect(() => {
    // Reset state if username is too short
    if (!username || username.trim().length < 3) {
      setUsernameAvailable(null);
      setUsernameMessage("");
      setIsCheckingUsername(false);
      return;
    }

    // Debounce: wait 500ms after user stops typing
    const timeoutId = setTimeout(async () => {
      const trimmedUsername = username.trim();
      if (!trimmedUsername || trimmedUsername.length < 3) {
        return;
      }

      setIsCheckingUsername(true);
      try {
        const data = await apiClient.checkUsername(trimmedUsername);
        setUsernameAvailable(data.available);
        setUsernameMessage(data.message || data.error || "");
      } catch (error) {
        console.error("Error checking username:", error);
        setUsernameAvailable(false);
        setUsernameMessage("Failed to check username availability");
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [username]);

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

    // Check password requirements
    const validation = getPasswordValidation(password);
    if (!validation.minLength) {
      const errorMsg = "Password must be at least 8 characters long";
      setError(errorMsg);
      showError(errorMsg);
      return;
    }
    if (!validation.hasCapital) {
      const errorMsg = "Password must contain at least one capital letter";
      setError(errorMsg);
      showError(errorMsg);
      return;
    }
    if (!validation.hasNumber) {
      const errorMsg = "Password must contain at least one number";
      setError(errorMsg);
      showError(errorMsg);
      return;
    }
    if (!validation.hasSpecial) {
      const errorMsg = "Password must contain at least one special character";
      setError(errorMsg);
      showError(errorMsg);
      return;
    }

    // Check if username is available
    if (usernameAvailable === false) {
      const errorMsg = usernameMessage || "Username is not available";
      setError(errorMsg);
      showError(errorMsg);
      return;
    }

    // If username is still being checked, wait a bit
    if (isCheckingUsername) {
      const errorMsg = "Please wait while we check username availability";
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
              <div className="relative">
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border bg-slate-950 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 hover:border-slate-600 ${
                    usernameAvailable === true
                      ? "border-emerald-500/50 focus:ring-emerald-500"
                      : usernameAvailable === false
                      ? "border-red-500/50 focus:ring-red-500"
                      : "border-slate-700 focus:ring-sky-500"
                  }`}
                  placeholder="Choose a username"
                  disabled={isLoading}
                  required
                  autoFocus
                />
                {isCheckingUsername && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg
                      className="animate-spin h-5 w-5 text-slate-400"
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
                  </div>
                )}
                {!isCheckingUsername && usernameAvailable === true && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg
                      className="h-5 w-5 text-emerald-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                )}
                {!isCheckingUsername && usernameAvailable === false && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg
                      className="h-5 w-5 text-red-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </div>
                )}
              </div>
              {usernameMessage && (
                <p
                  className={`mt-1 text-xs ${
                    usernameAvailable === true
                      ? "text-emerald-400"
                      : usernameAvailable === false
                      ? "text-red-400"
                      : "text-slate-400"
                  }`}
                >
                  {usernameMessage}
                </p>
              )}
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
                className={`w-full px-4 py-3 rounded-lg border bg-slate-950 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 hover:border-slate-600 ${
                  password && isPasswordValid
                    ? "border-emerald-500/50 focus:ring-emerald-500"
                    : password && !isPasswordValid
                    ? "border-yellow-500/50 focus:ring-yellow-500"
                    : "border-slate-700 focus:ring-sky-500"
                }`}
                placeholder="Create a password"
                disabled={isLoading}
                required
                minLength={8}
              />
              
              {/* Password requirements */}
              {password && (
                <div className="mt-2 p-3 rounded-lg bg-slate-950/50 border border-slate-800 space-y-1.5">
                  <p className="text-xs font-medium text-slate-400 mb-2">Password requirements:</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {passwordValidation.minLength ? (
                        <svg className="h-4 w-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4 text-slate-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className={`text-xs ${passwordValidation.minLength ? 'text-emerald-400' : 'text-slate-500'}`}>
                        At least 8 characters
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {passwordValidation.hasCapital ? (
                        <svg className="h-4 w-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4 text-slate-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className={`text-xs ${passwordValidation.hasCapital ? 'text-emerald-400' : 'text-slate-500'}`}>
                        At least 1 capital letter
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {passwordValidation.hasNumber ? (
                        <svg className="h-4 w-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4 text-slate-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className={`text-xs ${passwordValidation.hasNumber ? 'text-emerald-400' : 'text-slate-500'}`}>
                        Contains a number
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {passwordValidation.hasSpecial ? (
                        <svg className="h-4 w-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4 text-slate-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className={`text-xs ${passwordValidation.hasSpecial ? 'text-emerald-400' : 'text-slate-500'}`}>
                        Contains a special character (!@#$%_&*...)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="animate-[fadeInUp_0.5s_ease-out_0.7s_both]">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border bg-slate-950 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 hover:border-slate-600 ${
                    confirmPassword && password === confirmPassword
                      ? "border-emerald-500/50 focus:ring-emerald-500"
                      : confirmPassword && password !== confirmPassword
                      ? "border-red-500/50 focus:ring-red-500"
                      : "border-slate-700 focus:ring-sky-500"
                  }`}
                  placeholder="Confirm your password"
                  disabled={isLoading}
                  required
                  minLength={8}
                />
                {confirmPassword && password === confirmPassword && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg
                      className="h-5 w-5 text-emerald-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                )}
                {confirmPassword && password !== confirmPassword && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg
                      className="h-5 w-5 text-red-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </div>
                )}
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-xs text-red-400">
                  Passwords do not match
                </p>
              )}
              {confirmPassword && password === confirmPassword && (
                <p className="mt-1 text-xs text-emerald-400">
                  Passwords match
                </p>
              )}
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

