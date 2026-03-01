import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { UnsavedChangesProvider } from "@/contexts/UnsavedChangesContext";
import ToastContainer from "@/components/ToastContainer";
import ErrorFilter from "@/components/ErrorFilter";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Mockup 3D Studio",
  description: "Create stunning 3D product mockups in your browser",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorFilter />
        <AuthProvider>
          <ToastProvider>
            <UnsavedChangesProvider>
              <Navbar />
              {children}
              <ToastContainer />
            </UnsavedChangesProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
