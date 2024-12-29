"use client";

import { useState, FormEvent } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth, firestore } from "@/lib/firebaseConfig";
import { useRouter } from "next/navigation";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

import { createOrganizationAndMembership, Role } from "@/lib/organizationHelpers";

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  // =====================
  // 1) Org Flow State
  // =====================
  const [flow, setFlow] = useState<"create" | "join" | "invite">("create");

  // CREATE
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgRole, setNewOrgRole] = useState<Role>("owner");

  // JOIN
  const [existingOrgId, setExistingOrgId] = useState("");
  const [existingOrgRole, setExistingOrgRole] = useState<Role>("pm");

  // INVITE
  const [inviteCode, setInviteCode] = useState("");

  // =====================
  // 2) Email/Password Fields
  // =====================
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // =====================
  // CREATE /users/{uid} doc
  // =====================
  async function createUserDoc(uid: string, email: string | null, displayName?: string) {
    await setDoc(
      doc(firestore, "users", uid),
      {
        email,
        displayName: displayName || "",
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  // =====================
  // handleOrgMembership
  // =====================
  async function handleOrgMembership(uid: string) {
    if (flow === "create") {
      // Use the transaction-based approach
      const orgId = newOrgName.trim().toLowerCase().replace(/\s+/g, "-");
      if (!orgId) {
        throw new Error("Please provide a valid organization name.");
      }
      await createOrganizationAndMembership(uid, orgId, newOrgRole, newOrgName.trim());
    } else if (flow === "join") {
      const orgId = existingOrgId.trim().toLowerCase().replace(/\s+/g, "-");
      if (!orgId) {
        throw new Error("Please provide a valid org ID.");
      }
      const orgRef = doc(firestore, "organizations", orgId);
      const orgSnap = await getDoc(orgRef);
      if (!orgSnap.exists()) {
        throw new Error(`Organization "${orgId}" does not exist.`);
      }
      await setDoc(doc(firestore, "organizations", orgId, "members", uid), {
        role: existingOrgRole,
        joinedAt: serverTimestamp(),
      });
    } else {
      // flow === "invite"
      if (!inviteCode.trim()) {
        throw new Error("Please provide an invite code.");
      }
      const inviteRef = doc(firestore, "invites", inviteCode);
      const inviteSnap = await getDoc(inviteRef);
      if (!inviteSnap.exists()) {
        throw new Error("Invalid invite code.");
      }
      const inviteData = inviteSnap.data();
      if (inviteData.used) {
        throw new Error("This invite code has already been used.");
      }

      const orgId = inviteData.orgId as string;
      const role = inviteData.role as Role;

      // Mark invite used
      await setDoc(inviteRef, { ...inviteData, used: true }, { merge: true });
      // Create membership
      await setDoc(doc(firestore, "organizations", orgId, "members", uid), {
        role,
        joinedAt: serverTimestamp(),
      });
    }
  }

  // =====================
  // Email/Password Sign Up
  // =====================
  async function handleEmailSignUp(e: FormEvent) {
    e.preventDefault();
    setError("");

    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;

      await createUserDoc(uid, userCred.user.email, userCred.user.displayName || "");
      await handleOrgMembership(uid);

      router.push("/dashboard");
    } catch (err: any) {
      console.error("Sign up error:", err);
      setError(err.message || "An error occurred. Please try again.");
    }
  }

  // =====================
  // Google Sign Up
  // =====================
  async function handleGoogleSignUp() {
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      const uid = result.user.uid;
      const mail = result.user.email;
      const displayName = result.user.displayName || "";
      if (!mail) {
        throw new Error("No email found on Google account.");
      }

      await createUserDoc(uid, mail, displayName);
      await handleOrgMembership(uid);

      router.push("/dashboard");
    } catch (err: any) {
      console.error("Google sign up error:", err);
      setError(err.message || "Google sign up failed. Please try again.");
    }
  }

  // =====================
  // RENDER
  // =====================
  return (
    <main className="max-w-md mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Sign Up</h1>

      {error && <p className="text-red-600">{error}</p>}

      {/* 1) Org Selection */}
      <div className="bg-gray-100 p-4 rounded">
        <p className="font-medium mb-2">
          First, choose how you'd like to connect to an organization:
        </p>
        <div className="flex items-center gap-4 mb-4">
          <label>
            <input
              type="radio"
              className="mr-1"
              name="flow"
              value="create"
              checked={flow === "create"}
              onChange={() => setFlow("create")}
            />
            Create Org
          </label>
          <label>
            <input
              type="radio"
              className="mr-1"
              name="flow"
              value="join"
              checked={flow === "join"}
              onChange={() => setFlow("join")}
            />
            Join Org
          </label>
          <label>
            <input
              type="radio"
              className="mr-1"
              name="flow"
              value="invite"
              checked={flow === "invite"}
              onChange={() => setFlow("invite")}
            />
            Invite Code
          </label>
        </div>

        {flow === "create" && (
          <div className="space-y-2">
            <div>
              <label className="block font-medium">New Organization Name</label>
              <input
                type="text"
                className="border p-2 w-full"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="e.g. Acme Builders"
              />
            </div>
            <div>
              <label className="block font-medium">Your Role</label>
              <select
                className="border p-2 w-full"
                value={newOrgRole}
                onChange={(e) => setNewOrgRole(e.target.value as Role)}
              >
                <option value="owner">Owner / Admin</option>
                <option value="pm">Project Manager</option>
              </select>
            </div>
          </div>
        )}

        {flow === "join" && (
          <div className="space-y-2">
            <div>
              <label className="block font-medium">Existing Organization ID</label>
              <input
                type="text"
                className="border p-2 w-full"
                placeholder="acme-builders"
                value={existingOrgId}
                onChange={(e) => setExistingOrgId(e.target.value)}
              />
            </div>
            <div>
              <label className="block font-medium">Your Role</label>
              <select
                className="border p-2 w-full"
                value={existingOrgRole}
                onChange={(e) => setExistingOrgRole(e.target.value as Role)}
              >
                <option value="pm">Project Manager</option>
                <option value="sub">Subcontractor</option>
                <option value="vendor">Vendor</option>
                <option value="readonly">Read-Only</option>
              </select>
            </div>
          </div>
        )}

        {flow === "invite" && (
          <div>
            <label className="block font-medium">Invite Code</label>
            <input
              type="text"
              className="border p-2 w-full"
              placeholder="Paste invite code here"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* 2) Sign Up Methods: Google or Email */}
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Next, pick how you'd like to create your user account:
        </p>

        {/* Google Sign Up */}
        <button
          onClick={handleGoogleSignUp}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
        >
          Sign Up with Google
        </button>

        <div className="text-center text-sm text-neutral-500">OR</div>

        {/* Email/Password Sign Up */}
        <form
          onSubmit={handleEmailSignUp}
          className="bg-white p-4 border rounded space-y-3"
        >
          <div>
            <label className="block mb-1 font-medium">Email</label>
            <input
              type="email"
              className="border p-2 w-full"
              placeholder="you@example.com"
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
            Sign Up with Email
          </button>
        </form>
      </div>
    </main>
  );
}
