"use client";

import { useEffect } from "react";

/**
 * Filters out harmless Google CORS errors from console
 * These errors come from Google Identity Services internal logging
 * and don't affect functionality
 */
export default function ErrorFilter() {
  useEffect(() => {
    // Store original console.error
    const originalError = console.error;
    const originalWarn = console.warn;

    // Filter function to check if error should be suppressed
    const shouldSuppressError = (message) => {
      if (typeof message === "string") {
        return (
          message.includes("play.google.com/log") ||
          message.includes("CORS request did not succeed") ||
          message.includes("Cross-Origin Request Blocked") ||
          (message.includes("google") && message.includes("log") && message.includes("CORS"))
        );
      }
      return false;
    };

    // Override console.error to filter Google CORS errors
    console.error = (...args) => {
      const message = args[0];
      if (!shouldSuppressError(message)) {
        originalError.apply(console, args);
      }
      // Silently ignore filtered errors
    };

    // Override console.warn to filter Google CORS warnings
    console.warn = (...args) => {
      const message = args[0];
      if (!shouldSuppressError(message)) {
        originalWarn.apply(console, args);
      }
      // Silently ignore filtered warnings
    };

    // Restore original console methods on unmount
    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  return null;
}

