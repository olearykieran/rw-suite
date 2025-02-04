"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

import { auth, firestore } from "@/lib/firebaseConfig";
import { createOrganizationAndMembership, Role } from "@/lib/organizationHelpers";

// Shared UI
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";
import { MessageAlert } from "@/components/ui/MessageAlert";

/** The roles you allow in your system */
type CombinedRole =
  | "owner"
  | "pm"
  | "architect"
  | "engineer"
  | "sub"
  | "vendor"
  | "readonly";

/** The sign-up flow for org membership (create, join, or invite) */
type Flow = "create" | "join" | "invite";

/** We'll have two steps: Step1 => Org, Step2 => Auth method */
enum Step {
  OrgInfo = 1,
  AuthMethod = 2,
}

export default function SignUpPage() {
  const router = useRouter();

  // Overall error/success messages
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Wizard step
  const [step, setStep] = useState<Step>(Step.OrgInfo);
  const [inProgress, setInProgress] = useState(false);

  // =====================
  // (A) ORG MEMBERSHIP STATE (Step 1)
  // =====================
  const [flow, setFlow] = useState<Flow>("create");
  const [orgName, setOrgName] = useState(""); // for create
  const [orgIdInput, setOrgIdInput] = useState(""); // for join
  const [inviteCode, setInviteCode] = useState(""); // for invite
  const [role, setRole] = useState<CombinedRole>("pm"); // for create/join flows

  // =====================
  // (B) SIGN UP FIELDS (Step 2)
  // =====================
  // Email/pw
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwVisible, setPwVisible] = useState(false);

  // Optional phone
  const [phone, setPhone] = useState("");

  // ------------------------------------------------------
  // Step 1: Org & Role Information
  // ------------------------------------------------------
  async function handleNextStep() {
    try {
      if (flow === "create") {
        if (!orgName.trim()) {
          throw new Error("Please enter an organization name.");
        }
      } else if (flow === "join") {
        if (!orgIdInput.trim()) {
          throw new Error("Please enter an existing org ID to join.");
        }
        const safeOrgId = orgIdInput.trim().toLowerCase().replace(/\s+/g, "-");
        const orgRef = doc(firestore, "organizations", safeOrgId);
        const orgSnap = await getDoc(orgRef);
        if (!orgSnap.exists()) {
          throw new Error(`Organization "${safeOrgId}" does not exist.`);
        }
      } else if (flow === "invite") {
        if (!inviteCode.trim()) {
          throw new Error("Please enter an invite code.");
        }
      }
      setError("");
      setSuccessMsg("");
      setStep(Step.AuthMethod);
    } catch (err: any) {
      setError(err.message || "Invalid organization info.");
    }
  }

  function handleBackToStep1() {
    setStep(Step.OrgInfo);
    setError("");
    setSuccessMsg("");
  }

  // ------------------------------------------------------
  // Step 2: Sign Up Methods
  // ------------------------------------------------------

  async function createUserDoc(uid: string, mail: string | null, displayName?: string) {
    await setDoc(
      doc(firestore, "users", uid),
      {
        email: mail || "",
        displayName: displayName || "",
        phone: phone.trim(),
        role, // overridden if invite flow
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  async function handleOrgMembership(uid: string) {
    if (flow === "create") {
      const safeOrgId = orgName.trim().toLowerCase().replace(/\s+/g, "-");
      await createOrganizationAndMembership(uid, safeOrgId, role as Role, orgName.trim());
    } else if (flow === "join") {
      const safeOrgId = orgIdInput.trim().toLowerCase().replace(/\s+/g, "-");
      const orgRef = doc(firestore, "organizations", safeOrgId);
      const orgSnap = await getDoc(orgRef);
      if (!orgSnap.exists()) {
        throw new Error(`Organization "${safeOrgId}" does not exist.`);
      }
      await setDoc(doc(firestore, "organizations", safeOrgId, "members", uid), {
        role,
        joinedAt: serverTimestamp(),
      });
    } else {
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
      await setDoc(inviteRef, { ...inviteData, used: true }, { merge: true });
      await setDoc(doc(firestore, "organizations", safeOrgId, "members", uid), {
        role: inviteRole,
        joinedAt: serverTimestamp(),
      });
      await setDoc(doc(firestore, "users", uid), { role: inviteRole }, { merge: true });
    }
  }

  async function handleEmailSignUp(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setInProgress(true);
    try {
      if (email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
        throw new Error("Emails do not match.");
      }
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;
      await createUserDoc(uid, userCred.user.email, userCred.user.displayName || "");
      await handleOrgMembership(uid);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Sign up error. Please try again.");
    } finally {
      setInProgress(false);
    }
  }

  async function handleGoogleSignUp() {
    setError("");
    setSuccessMsg("");
    setInProgress(true);
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
      setError(err.message || "Google sign up failed. Please try again.");
    } finally {
      setInProgress(false);
    }
  }

  return (
    <>
      {/* Step 1: Org & Role Info */}
      {step === Step.OrgInfo && (
        <PageContainer>
          <h1 className="text-3xl font-bold text-center mb-6">Sign Up</h1>
          {error && <MessageAlert type="error" message={error} />}
          {successMsg && <MessageAlert type="success" message={successMsg} />}
          <Card>
            <div className="space-y-6">
              <p className="font-medium text-base">
                Step 1: Organization / Role Information
              </p>
              <div className="flex gap-4 items-center flex-wrap text-sm">
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
                <div>
                  <label className="block font-medium text-sm mb-1">
                    New Organization Name
                  </label>
                  <input
                    type="text"
                    placeholder="Acme Builders"
                    className="border p-2 w-full rounded bg-white dark:bg-neutral-800 dark:text-white"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                  />
                </div>
              )}
              {flow === "join" && (
                <div>
                  <label className="block font-medium text-sm mb-1">
                    Existing Org ID
                  </label>
                  <input
                    type="text"
                    placeholder="acme-builders"
                    className="border p-2 w-full rounded bg-white dark:bg-neutral-800 dark:text-white"
                    value={orgIdInput}
                    onChange={(e) => setOrgIdInput(e.target.value)}
                  />
                </div>
              )}
              {flow === "invite" && (
                <div>
                  <label className="block font-medium text-sm mb-1">Invite Code</label>
                  <input
                    type="text"
                    placeholder="ABC123"
                    className="border p-2 w-full rounded bg-white dark:bg-neutral-800 dark:text-white"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                  />
                </div>
              )}
              {flow !== "invite" && (
                <div>
                  <label className="block font-medium text-sm mb-1">Your Role</label>
                  <select
                    className="border p-2 w-full rounded bg-white dark:bg-neutral-800 dark:text-white"
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
            <div className="mt-6 flex justify-end gap-2">
              <GrayButton onClick={handleNextStep}>Next</GrayButton>
            </div>
          </Card>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <a href="/public/auth/sign-in" className="text-blue-600 underline">
              Sign In
            </a>
          </div>
        </PageContainer>
      )}

      {/* Step 2: Sign Up Methods */}
      {step === Step.AuthMethod && (
        <>
          <PageContainer>
            <h1 className="text-3xl font-bold text-center mb-6">Sign Up</h1>
            {error && <MessageAlert type="error" message={error} />}
            {successMsg && <MessageAlert type="success" message={successMsg} />}
            <div className="relative mb-4">
              <GrayButton
                onClick={handleBackToStep1}
                className="absolute left-0 top-0 text-xs"
              >
                &larr; Back
              </GrayButton>
              <p className="text-sm text-center">Step 2: Choose your sign-up method</p>
            </div>
          </PageContainer>
          <div className="flex flex-col md:flex-row items-start justify-center gap-8 px-4">
            {/* Google sign up */}
            <PageContainer className="max-w-md">
              <Card>
                <h2 className="text-xl font-semibold text-center mb-4">
                  Sign Up with Google
                </h2>
                <GrayButton
                  onClick={handleGoogleSignUp}
                  disabled={inProgress}
                  className="w-full text-sm"
                >
                  {inProgress ? "Signing Up..." : "Sign Up with Google"}
                </GrayButton>
              </Card>
            </PageContainer>
            {/* Vertical line */}
            <div className="hidden md:block w-px bg-neutral-300" />
            {/* Email/pw sign up */}
            <PageContainer className="max-w-md">
              <Card>
                <h2 className="text-xl font-semibold text-center mb-4">
                  Sign Up with Email
                </h2>
                <form onSubmit={handleEmailSignUp} className="space-y-4">
                  <div>
                    <label className="block mb-1 font-medium text-sm">Email</label>
                    <input
                      type="email"
                      className="border p-2 w-full rounded bg-white dark:bg-neutral-800 dark:text-white"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium text-sm">
                      Confirm Email
                    </label>
                    <input
                      type="email"
                      className="border p-2 w-full rounded bg-white dark:bg-neutral-800 dark:text-white"
                      placeholder="Confirm your email"
                      value={confirmEmail}
                      onChange={(e) => setConfirmEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium text-sm">Password</label>
                    <div className="relative">
                      <input
                        type={pwVisible ? "text" : "password"}
                        className="border p-2 w-full rounded bg-white dark:bg-neutral-800 dark:text-white"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setPwVisible(!pwVisible)}
                        className="absolute top-1/2 right-2 -translate-y-1/2 text-sm text-blue-600 underline"
                        tabIndex={-1}
                      >
                        {pwVisible ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium text-sm">
                      Confirm Password
                    </label>
                    <input
                      type={pwVisible ? "text" : "password"}
                      className="border p-2 w-full rounded bg-white dark:bg-neutral-800 dark:text-white"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium text-sm">
                      Phone Number (optional)
                    </label>
                    <input
                      type="tel"
                      className="border p-2 w-full rounded bg-white dark:bg-neutral-800 dark:text-white"
                      placeholder="(555) 123-4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <GrayButton
                    type="submit"
                    disabled={inProgress}
                    className="w-full text-sm"
                  >
                    {inProgress ? "Creating Account..." : "Sign Up with Email"}
                  </GrayButton>
                </form>
              </Card>
            </PageContainer>
          </div>
          <PageContainer>
            <p className="text-center text-sm mt-4">
              Already have an account?{" "}
              <a href="/public/auth/sign-in" className="text-blue-600 underline">
                Sign In
              </a>
            </p>
          </PageContainer>
        </>
      )}
    </>
  );
}
