"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebaseConfig";
import Link from "next/link";

interface SubProjectDoc {
  id: string;
  name?: string;
  status?: string;
  // add other fields if needed (like startDate, etc.)
}

export default function SubProjectOverview() {
  const router = useRouter();
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };

  const [subProject, setSubProject] = useState<SubProjectDoc | null>(null);
  const [mainProjectName, setMainProjectName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        if (!orgId || !projectId || !subProjectId) return;

        // References
        const mainRef = doc(firestore, "organizations", orgId, "projects", projectId);
        const subRef = doc(mainRef, "subprojects", subProjectId);

        // Fetch sub-project doc
        const subSnap = await getDoc(subRef);
        if (!subSnap.exists()) {
          setError("Sub-project not found.");
          setLoading(false);
          return;
        }

        const subProjData: SubProjectDoc = {
          id: subSnap.id,
          ...(subSnap.data() as Omit<SubProjectDoc, "id">),
        };
        setSubProject(subProjData);

        // Compare old vs. new subProject name
        const oldName = localStorage.getItem("selectedSubProjectName") || "";
        const newName = subProjData.name || "";

        // Update localStorage for ID references
        localStorage.setItem("selectedOrgId", orgId);
        localStorage.setItem("selectedProjectId", projectId);
        localStorage.setItem("selectedSubProjectId", subProjectId);

        // If sub-project name changed, set it and do a full reload
        if (oldName !== newName) {
          localStorage.setItem("selectedSubProjectName", newName);

          // Hard reload so the updated name shows in TopHeader immediately
          window.location.assign(
            `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}`
          );
          return;
        }

        // Fetch main project name
        const mainSnap = await getDoc(mainRef);
        if (mainSnap.exists()) {
          setMainProjectName((mainSnap.data().name as string) || projectId);
        }
      } catch (err) {
        console.error("Fetch sub-project error:", err);
        setError("Failed to load sub-project.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [orgId, projectId, subProjectId]);

  function handleDeselectSubProject() {
    localStorage.removeItem("selectedSubProjectId");
    localStorage.removeItem("selectedProjectId");
    localStorage.removeItem("selectedOrgId");
    localStorage.removeItem("selectedSubProjectName");
    router.push(`/dashboard/organizations/${orgId}/projects`);
  }

  if (loading) {
    return <div className="p-6 text-sm">Loading sub-project...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }
  if (!subProject) {
    return <div className="p-6">No sub-project found.</div>;
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 space-y-8">
      {/* Back link */}
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects`}
          className="
            text-sm font-medium text-blue-600 underline
            hover:text-blue-700 dark:text-blue-400
            dark:hover:text-blue-300 transition-colors
          "
        >
          &larr; Back to Sub-Projects of {mainProjectName}
        </Link>
      </div>

      {/* Sub-Project Header */}
      <div
        className="
          bg-white dark:bg-neutral-900
          border border-neutral-200 dark:border-neutral-800
          rounded-lg p-6 space-y-4
        "
      >
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            Sub-Project: {subProject.name || subProjectId}
          </h1>
          <button
            onClick={handleDeselectSubProject}
            className="
              bg-gray-300 text-black
              hover:bg-gray-400
              dark:bg-gray-700 dark:text-white
              dark:hover:bg-gray-600
              transition-colors
              px-4 py-2 rounded text-sm
            "
          >
            Deselect
          </button>
        </div>
        <p className="text-sm">
          <strong>Status:</strong> {subProject.status || "N/A"}
        </p>
      </div>

      {/* Sub-Project Features */}
      <div
        className="
          bg-white dark:bg-neutral-900
          border border-neutral-200 dark:border-neutral-800
          rounded-lg p-6 space-y-4
        "
      >
        <h2 className="text-xl font-semibold">Sub-Project Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* RFIs */}
          <Link
            href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/rfis`}
            className="
              bg-white dark:bg-neutral-900
              border border-neutral-200 dark:border-neutral-800
              rounded p-4 shadow-sm hover:shadow-md
              transition
            "
          >
            <h3 className="font-bold mb-1">RFIs</h3>
            <p className="text-sm">
              Create, distribute, and track Requests for Information.
            </p>
          </Link>

          {/* Submittals */}
          <Link
            href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/submittals`}
            className="
              bg-white dark:bg-neutral-900
              border border-neutral-200 dark:border-neutral-800
              rounded p-4 shadow-sm hover:shadow-md
              transition
            "
          >
            <h3 className="font-bold mb-1">Submittals</h3>
            <p className="text-sm">Create, distribute, and track Submittals.</p>
          </Link>

          {/* Blueprints */}
          <Link
            href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/blueprints`}
            className="
              bg-white dark:bg-neutral-900
              border border-neutral-200 dark:border-neutral-800
              rounded p-4 shadow-sm hover:shadow-md
              transition
            "
          >
            <h3 className="font-bold mb-1">Blueprints</h3>
            <p className="text-sm">Create, distribute, and track Blueprints.</p>
          </Link>

          {/* Tasks */}
          <Link
            href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/tasks`}
            className="
              bg-white dark:bg-neutral-900
              border border-neutral-200 dark:border-neutral-800
              rounded p-4 shadow-sm hover:shadow-md
              transition
            "
          >
            <h3 className="font-bold mb-1">Tasks & Scheduling</h3>
            <p className="text-sm">Create, distribute, and track Tasks.</p>
          </Link>

          {/* Finances */}
          <Link
            href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/finances`}
            className="
              bg-white dark:bg-neutral-900
              border border-neutral-200 dark:border-neutral-800
              rounded p-4 shadow-sm hover:shadow-md
              transition
            "
          >
            <h3 className="font-bold mb-1">Finances</h3>
            <p className="text-sm">Create, distribute, and track Finances.</p>
          </Link>

          {/* Change Orders */}
          <Link
            href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/change-orders`}
            className="
              bg-white dark:bg-neutral-900
              border border-neutral-200 dark:border-neutral-800
              rounded p-4 shadow-sm hover:shadow-md
              transition
            "
          >
            <h3 className="font-bold mb-1">Change Orders</h3>
            <p className="text-sm">Track changes to scope, costs, or schedule.</p>
          </Link>

          {/* Daily Reports */}
          <Link
            href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/daily-reports`}
            className="
              bg-white dark:bg-neutral-900
              border border-neutral-200 dark:border-neutral-800
              rounded p-4 shadow-sm hover:shadow-md
              transition
            "
          >
            <h3 className="font-bold mb-1">Daily Reports</h3>
            <p className="text-sm">
              Log site conditions, progress, and any incidents daily.
            </p>
          </Link>

          {/* Meeting Minutes */}
          <Link
            href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/meeting-minutes`}
            className="
              bg-white dark:bg-neutral-900
              border border-neutral-200 dark:border-neutral-800
              rounded p-4 shadow-sm hover:shadow-md
              transition
            "
          >
            <h3 className="font-bold mb-1">Meeting Minutes</h3>
            <p className="text-sm">
              Document discussions, decisions, and next steps from meetings.
            </p>
          </Link>

          {/* Punch Lists */}
          <Link
            href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/punch-lists`}
            className="
              bg-white dark:bg-neutral-900
              border border-neutral-200 dark:border-neutral-800
              rounded p-4 shadow-sm hover:shadow-md
              transition
            "
          >
            <h3 className="font-bold mb-1">Punch Lists</h3>
            <p className="text-sm">
              Track final tasks or issues that must be resolved before project close-out.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
