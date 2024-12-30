// src/app/public/auth/sign-in/page.tsx

"use client";

import { useState, FormEvent } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "@/lib/firebaseConfig";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleEmailSignIn(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Sign in error:", err);
      setError(err.message || "Invalid credentials.");
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Google sign in error:", err);
      setError(err.message || "Google sign in failed. Please try again.");
    }
  }

  return (
    <main className="max-w-md mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Sign In</h1>
      {error && <p className="text-red-600">{error}</p>}

      {/* Google */}
      <button
        onClick={handleGoogleSignIn}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
      >
        Sign In with Google
      </button>

      <div className="text-center text-sm text-neutral-500">OR</div>

      {/* Email/Password */}
      <form
        onSubmit={handleEmailSignIn}
        className="bg-white p-4 border rounded space-y-3"
      >
        <div>
          <label className="block mb-1 font-medium">Email</label>
          <input
            type="email"
            className="border p-2 w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Password</label>
          <input
            type="password"
            className="border p-2 w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          className="bg-black text-white px-4 py-2 rounded hover:bg-neutral-800 w-full"
        >
          Sign In with Email
        </button>
      </form>
    </main>
  );
}
