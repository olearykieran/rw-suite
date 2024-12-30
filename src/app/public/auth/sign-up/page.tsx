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

/**
 * We define a single union type for all possible roles
 */
type CombinedRole =
  | "owner"
  | "pm"
  | "architect"
  | "engineer"
  | "sub"
  | "vendor"
  | "readonly";

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  // =====================
  // 1) Org Flow (same as before)
  // =====================
  const [flow, setFlow] = useState<"create" | "join" | "invite">("create");

  // CREATE FLOW - needs org name
  const [orgName, setOrgName] = useState("");

  // JOIN FLOW - needs existing org ID
  const [orgIdInput, setOrgIdInput] = useState("");

  // INVITE - needs code
  const [inviteCode, setInviteCode] = useState("");

  // =====================
  // 2) Email/Password Fields
  // =====================
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // =====================
  // 3) Additional fields
  // =====================
  const [phone, setPhone] = useState("");

  /**
   * A single role field for both user doc & membership doc
   * (Except in the invite flow, we override it from the invite's role.)
   */
  const [role, setRole] = useState<CombinedRole>("pm");

  /**
   * createUserDoc => writes phone + role to /users/{uid}
   */
  async function createUserDoc(uid: string, mail: string | null, displayName?: string) {
    await setDoc(
      doc(firestore, "users", uid),
      {
        email: mail || "",
        displayName: displayName || "",
        phone: phone.trim(),
        role, // single role from the user's selection
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  /**
   * handleOrgMembership => sets membership doc in org if needed.
   *   - create => new org with same role
   *   - join => existing org with same role
   *   - invite => read role from code
   */
  async function handleOrgMembership(uid: string) {
    if (flow === "create") {
      // Create new org
      const safeOrgId = orgName.trim().toLowerCase().replace(/\s+/g, "-");
      if (!safeOrgId) {
        throw new Error("Please provide a valid organization name.");
      }

      // uses the role state
      await createOrganizationAndMembership(uid, safeOrgId, role as Role, orgName.trim());
    } else if (flow === "join") {
      const safeOrgId = orgIdInput.trim().toLowerCase().replace(/\s+/g, "-");
      if (!safeOrgId) {
        throw new Error("Please provide a valid org ID.");
      }
      const orgRef = doc(firestore, "organizations", safeOrgId);
      const orgSnap = await getDoc(orgRef);
      if (!orgSnap.exists()) {
        throw new Error(`Organization "${safeOrgId}" does not exist.`);
      }
      // store membership doc with our chosen role
      await setDoc(doc(firestore, "organizations", safeOrgId, "members", uid), {
        role,
        joinedAt: serverTimestamp(),
      });
    } else {
      // invite
      if (!inviteCode.trim()) {
        throw new Error("Please provide an invite code.");
      }
      const inviteRef = doc(firestore, "invites", inviteCode.trim());
      const inviteSnap = await getDoc(inviteRef);
      if (!inviteSnap.exists()) {
        throw new Error("Invalid invite code.");
      }
      const inviteData = inviteSnap.data();
      if (inviteData.used) {
        throw new Error("This invite code has already been used.");
      }

      const safeOrgId = inviteData.orgId as string;
      const inviteRole = inviteData.role as Role;

      // Mark invite used
      await setDoc(
        inviteRef,
        {
          ...inviteData,
          used: true,
        },
        { merge: true }
      );
      // membership doc => uses the inviteRole
      await setDoc(doc(firestore, "organizations", safeOrgId, "members", uid), {
        role: inviteRole,
        joinedAt: serverTimestamp(),
      });

      // Also, we want the user doc to show the inviteRole rather than the user’s selection
      // so the user doc is consistent. If you prefer, you can skip overriding user doc.
      await setDoc(doc(firestore, "users", uid), { role: inviteRole }, { merge: true });
    }
  }

  // =====================
  // handleEmailSignUp
  // =====================
  async function handleEmailSignUp(e: FormEvent) {
    e.preventDefault();
    setError("");

    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;

      // create user doc
      await createUserDoc(uid, userCred.user.email, userCred.user.displayName || "");

      // handle membership logic
      await handleOrgMembership(uid);

      router.push("/dashboard");
    } catch (err: any) {
      console.error("Sign up error:", err);
      setError(err.message || "An error occurred. Please try again.");
    }
  }

  // =====================
  // handleGoogleSignUp
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
  // UI
  // =====================
  return (
    <main className="max-w-md mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Sign Up</h1>
      {error && <p className="text-red-600">{error}</p>}

      {/* (A) Org Flow */}
      <div className="bg-gray-100 p-4 rounded space-y-4">
        <p className="font-medium">
          First, choose how you'd like to connect to an organization:
        </p>
        <div className="flex gap-4 items-center">
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

        {/* If flow=create => ask for orgName */}
        {flow === "create" && (
          <div className="space-y-2">
            <label className="block font-medium">New Organization Name</label>
            <input
              type="text"
              className="border p-2 w-full"
              placeholder="Acme Builders"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
          </div>
        )}

        {/* If flow=join => ask for orgIdInput */}
        {flow === "join" && (
          <div className="space-y-2">
            <label className="block font-medium">Existing Org ID</label>
            <input
              type="text"
              className="border p-2 w-full"
              placeholder="acme-builders"
              value={orgIdInput}
              onChange={(e) => setOrgIdInput(e.target.value)}
            />
          </div>
        )}

        {/* If flow=invite => ask for inviteCode */}
        {flow === "invite" && (
          <div className="space-y-2">
            <label className="block font-medium">Invite Code</label>
            <input
              type="text"
              className="border p-2 w-full"
              placeholder="ABC123"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
            />
          </div>
        )}

        {/* One single role dropdown (used for create/join).
            If invite flow => We'll override with code's role. */}
        {flow !== "invite" && (
          <div className="space-y-2">
            <label className="block font-medium">Your Role</label>
            <select
              className="border p-2 w-full"
              value={role}
              onChange={(e) => setRole(e.target.value as CombinedRole)}
            >
              <option value="owner">Owner / Admin</option>
              <option value="pm">Project Manager</option>
              <option value="architect">Architect</option>
              <option value="engineer">Engineer</option>
              <option value="sub">Subcontractor</option>
              <option value="vendor">Vendor</option>
              <option value="readonly">Read-Only</option>
            </select>
          </div>
        )}
      </div>

      {/* (B) Actual user sign up (Google or email+pass) */}
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Next, choose how you'd like to create your user account:
        </p>

        <button
          onClick={handleGoogleSignUp}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
        >
          Sign Up with Google
        </button>

        <div className="text-center text-sm text-neutral-500">OR</div>

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

          {/* phone + single role usage */}
          <div>
            <label className="block mb-1 font-medium">Phone Number (optional)</label>
            <input
              type="tel"
              className="border p-2 w-full"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
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
