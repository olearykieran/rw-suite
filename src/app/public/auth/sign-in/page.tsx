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

/**
 * SignInPage component that allows users to sign in via Google or Email/Password.
 * The styling now mirrors the sign-up page with consistent headers, cards, and input styling.
 */
export default function SignInPage() {
  const router = useRouter();

  // State for error messages and in-progress indicator.
  const [error, setError] = useState("");
  const [inProgress, setInProgress] = useState(false);

  // State for Email/Password fields.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pwVisible, setPwVisible] = useState(false);

  /**
   * Handles Google sign-in.
   */
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

  /**
   * Handles Email/Password sign-in.
   * @param e - Form event for email sign in.
   */
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
      {/* Header container with page title and error message */}
      <PageContainer>
        <h1 className="text-3xl font-bold text-center mb-6">Sign In</h1>
        {error && <MessageAlert type="error" message={error} />}
      </PageContainer>

      {/* Container for the two sign-in methods - using items-stretch for equal height */}
      <div className="flex flex-col md:flex-row items-stretch justify-center gap-16">
        {/* Google Sign-In Card */}
        <PageContainer className="max-w-xl flex-1 ">
          <Card className=" h-full flex flex-col justify-center">
            <h2 className="text-xl  font-semibold text-center mb-4">
              Sign In with Google
            </h2>
            <GrayButton
              onClick={handleGoogleSignIn}
              disabled={inProgress}
              className="w-full flex justify-center items-center"
            >
              {inProgress ? "Signing In..." : "Google Sign-In"}
            </GrayButton>
          </Card>
        </PageContainer>

        {/* Vertical Divider (hidden on mobile) */}
        <div className="hidden md:block w-px bg-white" />

        {/* Email/Password Sign-In Card */}
        <PageContainer className="max-w-xl  flex-1">
          <Card className=" h-full">
            <h2 className="text-xl font-semibold  text-center mb-4">
              Sign In with Email
            </h2>
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              {/* Email Field */}
              <div>
                <label className="block mb-1   font-medium">Email</label>
                <input
                  type="email"
                  className="border p-2 w-full  rounded bg-white dark:bg-neutral-800"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password Field */}
              <div>
                <label className="block mb-1  font-medium">Password</label>
                <div className="relative">
                  <input
                    type={pwVisible ? "text" : "password"}
                    className="border p-2 w-full  rounded bg-white dark:bg-neutral-800"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setPwVisible(!pwVisible)}
                    className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 underline"
                    tabIndex={-1}
                  >
                    {pwVisible ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Sign In Button */}
              <GrayButton type="submit" disabled={inProgress} className="w-full">
                {inProgress ? "Signing In..." : "Email Sign-In"}
              </GrayButton>
            </form>
          </Card>
        </PageContainer>
      </div>

      {/* Bottom GrayButton for navigating to the Sign Up page */}
      <PageContainer>
        <div className="flex justify-center mt-4">
          <GrayButton onClick={() => router.push("/public/auth/sign-up")}>
            Don't have an account? Sign Up
          </GrayButton>
        </div>
      </PageContainer>
    </>
  );
}
