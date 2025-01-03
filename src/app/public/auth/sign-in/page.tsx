// src/app/public/auth/sign-in/page.tsx

"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";

import { auth } from "@/lib/firebaseConfig";

// Shared UI components
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";
import { MessageAlert } from "@/components/ui/MessageAlert";

export default function SignInPage() {
  const router = useRouter();

  const [error, setError] = useState("");
  const [inProgress, setInProgress] = useState(false);

  // Email/pw fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pwVisible, setPwVisible] = useState(false);

  // Google Sign In
  async function handleGoogleSignIn() {
    setError("");
    setInProgress(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      setError(err.message || "Google sign-in failed. Please try again.");
    } finally {
      setInProgress(false);
    }
  }

  // Email/Password Sign In
  async function handleEmailSignIn(e: FormEvent) {
    e.preventDefault();
    setError("");
    setInProgress(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Email sign-in error:", err);
      setError(err.message || "Invalid credentials.");
    } finally {
      setInProgress(false);
    }
  }

  return (
    <>
      {/* Main title container */}
      <PageContainer>
        <h1 className="text-3xl font-bold text-center mb-6">Sign In</h1>

        {/* Global error display (if any) */}
        {error && (
          <div className="mb-4">
            <MessageAlert type="error" message={error} />
          </div>
        )}
      </PageContainer>

      {/* Two side-by-side containers (Google left, Email right), with vertical divider */}
      <div className="flex flex-col md:flex-row items-start justify-center gap-8">
        {/* Left: Google Sign-In in its own PageContainer */}
        <PageContainer className="max-w-md flex flex-col items-center">
          <Card className="w-full">
            <h2 className="text-xl font-semibold text-center mb-4">
              Sign In with Google
            </h2>
            <div className="flex justify-center">
              <GrayButton
                onClick={handleGoogleSignIn}
                disabled={inProgress}
                className="text-sm px-4 py-3 w-full"
              >
                {inProgress ? "Signing In..." : "Google Sign-In"}
              </GrayButton>
            </div>
          </Card>
        </PageContainer>

        {/* Vertical Line (hidden on mobile) */}
        <div className="hidden md:block w-px bg-neutral-300" />

        {/* Right: Email Sign-In in its own PageContainer */}
        <PageContainer className="max-w-md flex flex-col items-center">
          <Card className="w-full">
            <h2 className="text-xl font-semibold text-center mb-4">Sign In with Email</h2>
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              {/* Email Field */}
              <div>
                <label className="block mb-1 font-medium">Email</label>
                <input
                  type="email"
                  className="
                    border p-2 w-full rounded
                    bg-white dark:bg-neutral-800 dark:text-white
                  "
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password Field */}
              <div>
                <label className="block mb-1 font-medium">Password</label>
                <div className="relative">
                  <input
                    type={pwVisible ? "text" : "password"}
                    className="
                      border p-2 w-full rounded
                      bg-white dark:bg-neutral-800 dark:text-white
                    "
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setPwVisible(!pwVisible)}
                    className="
                      absolute top-1/2 right-2 -translate-y-1/2
                      text-xs text-blue-600 underline
                    "
                    tabIndex={-1}
                  >
                    {pwVisible ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Sign In button */}
              <div className="flex justify-center pt-2">
                <GrayButton
                  type="submit"
                  disabled={inProgress}
                  className="text-sm px-4 py-3 w-full"
                >
                  {inProgress ? "Signing In..." : "Email Sign-In"}
                </GrayButton>
              </div>
            </form>
          </Card>
        </PageContainer>
      </div>

      {/* Sign Up Link at the bottom */}
      <PageContainer>
        <p className="text-center text-sm">
          Don’t have an account?{" "}
          <a href="/public/auth/sign-up" className="text-blue-600 underline">
            Sign Up
          </a>
        </p>
      </PageContainer>
    </>
  );
}
