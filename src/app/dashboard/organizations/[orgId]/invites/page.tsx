"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter, useParams } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, firestore } from "@/lib/firebaseConfig";
import {
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
  collection,
  addDoc,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";

type Role = "pm" | "sub" | "vendor" | "readonly";

export default function InvitesPage() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const params = useParams();
  const { orgId } = params as { orgId: string };

  const [role, setRole] = useState<Role>("pm");
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [orgRole, setOrgRole] = useState<
    "owner" | "pm" | "sub" | "vendor" | "readonly" | null
  >(null);

  // Check if the user is PM or owner in this org
  useEffect(() => {
    if (!user) {
      router.replace("/public/auth/sign-in");
      return;
    }
    checkMemberRole();
  }, [user]);

  async function checkMemberRole() {
    try {
      const memRef = doc(firestore, "organizations", orgId, "members", user!.uid);
      const memSnap = await getDoc(memRef);
      if (!memSnap.exists()) {
        setError("You are not a member of this organization.");
        return;
      }
      const data = memSnap.data();
      const r = data.role as string;
      if (r !== "owner" && r !== "pm") {
        setError("You do not have permission to create invites. (Owner/PM only)");
      } else {
        setOrgRole(r as any);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch membership role.");
    }
  }

  async function handleCreateInvite() {
    setError("");
    try {
      if (!orgRole) {
        throw new Error("Membership check not complete or invalid role.");
      }
      if (orgRole !== "owner" && orgRole !== "pm") {
        throw new Error("Only an Owner or PM can create invites.");
      }
      const code = uuidv4();
      const inviteRef = doc(firestore, "invites", code);
      await setDoc(inviteRef, {
        orgId,
        role, // role assigned to the new user who redeems it
        createdAt: serverTimestamp(),
        used: false,
      });
      setInviteCode(code);
    } catch (err: any) {
      setError(err.message || "Error creating invite.");
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-2">Organization Invites</h1>
      {error && <p className="text-red-600 mb-2">{error}</p>}
      {!error && !orgRole && <p>Checking your role in this organization...</p>}
      {orgRole && (orgRole === "owner" || orgRole === "pm") && (
        <div className="space-y-4">
          <div>
            <label className="block mb-1 font-medium">Role to Assign</label>
            <select
              className="border p-2"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="pm">Project Manager</option>
              <option value="sub">Subcontractor</option>
              <option value="vendor">Vendor</option>
              <option value="readonly">Read-Only</option>
            </select>
          </div>

          <button
            onClick={handleCreateInvite}
            className="bg-black text-white px-4 py-2 rounded hover:bg-neutral-800"
          >
            Generate Invite
          </button>
          {inviteCode && (
            <div className="mt-4 p-2 bg-green-100 border border-green-300 text-sm">
              <p className="mb-1 font-medium">Invite Code:</p>
              <p className="break-all">{inviteCode}</p>
              <p className="mt-1">
                Share this code with the new user. They can sign up and select “Invite
                Code” flow to join this org as <strong>{role}</strong>.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
