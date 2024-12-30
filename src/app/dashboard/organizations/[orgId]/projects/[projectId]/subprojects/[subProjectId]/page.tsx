// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebaseConfig";
import Link from "next/link";

/** Define an interface for your sub-project doc shape. */
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

        // Merge snapshot data into our SubProjectDoc
        const subProjData: SubProjectDoc = {
          id: subSnap.id,
          ...(subSnap.data() as Omit<SubProjectDoc, "id">),
        };

        // Update local state
        setSubProject(subProjData);

        // Compare old vs. new subProject name
        const oldName = localStorage.getItem("selectedSubProjectName") || "";
        const newName = subProjData.name || "";

        // Update localStorage for ID references
        localStorage.setItem("selectedOrgId", orgId);
        localStorage.setItem("selectedProjectId", projectId);
        localStorage.setItem("selectedSubProjectId", subProjectId);

        // If sub-project name changed, set it and do a FULL BROWSER RELOAD
        if (oldName !== newName) {
          localStorage.setItem("selectedSubProjectName", newName);

          // Hard reload forces the entire page to refresh,
          // so TopHeader re-mounts & sees updated localStorage immediately
          window.location.assign(
            `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}`
          );
          return; // Stop execution here, because we've triggered a reload
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
    return <div className="p-6 text-gray-700">Loading sub-project...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }
  if (!subProject) {
    return <div className="p-6 text-gray-700">No sub-project found.</div>;
  }

  return (
    <main className="p-6 space-y-6">
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects`}
        className="text-blue-600 underline"
      >
        &larr; Back to Sub-Projects of {mainProjectName}
      </Link>

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">
          Sub-Project: {subProject.name}
        </h1>
        <button
          onClick={handleDeselectSubProject}
          className="bg-gray-200 px-4 py-2 rounded text-sm hover:bg-gray-300 transition"
        >
          Deselect
        </button>
      </div>

      <p className="text-gray-700">Status: {subProject.status}</p>

      <div className="border-t mt-4 pt-4">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">Sub-Project Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* RFIs */}
          <Link
            href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/rfis`}
            className="block border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition"
          >
            <h3 className="font-bold mb-1 text-gray-900">RFIs</h3>
            <p className="text-sm text-gray-600">
              Create, distribute, and track Requests for Information.
            </p>
          </Link>

          {/* Submittals */}
          <Link
            href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/submittals`}
            className="block border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition"
          >
            <h3 className="font-bold mb-1 text-gray-900">Submittals</h3>
            <p className="text-sm text-gray-600">
              Create, distribute, and track Submittals.
            </p>
          </Link>

          {/* Blueprints */}
          <Link
            href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/blueprints`}
            className="block border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition"
          >
            <h3 className="font-bold mb-1 text-gray-900">Blueprints</h3>
            <p className="text-sm text-gray-600">
              Create, distribute, and track Blueprints.
            </p>
          </Link>

          {/* Tasks */}
          <Link
            href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/tasks`}
            className="block border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition"
          >
            <h3 className="font-bold mb-1 text-gray-900">Tasks & Scheduling</h3>
            <p className="text-sm text-gray-600">Create, distribute, and track Tasks.</p>
          </Link>

          {/* Finances */}
          <Link
            href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/finances`}
            className="block border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition"
          >
            <h3 className="font-bold mb-1 text-gray-900">Finances</h3>
            <p className="text-sm text-gray-600">
              Create, distribute, and track Finances.
            </p>
          </Link>

          {/* Change Orders */}
          <Link
            href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/change-orders`}
            className="block border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition"
          >
            <h3 className="font-bold mb-1 text-gray-900">Change Orders</h3>
            <p className="text-sm text-gray-600">
              Track changes to scope, costs, or schedule.
            </p>
          </Link>

          {/* Daily Reports */}
          <Link
            href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/daily-reports`}
            className="block border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition"
          >
            <h3 className="font-bold mb-1 text-gray-900">Daily Reports</h3>
            <p className="text-sm text-gray-600">
              Log site conditions, progress, and any incidents daily.
            </p>
          </Link>

          {/* Meeting Minutes */}
          <Link
            href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/meeting-minutes`}
            className="block border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition"
          >
            <h3 className="font-bold mb-1 text-gray-900">Meeting Minutes</h3>
            <p className="text-sm text-gray-600">
              Document discussions, decisions, and next steps from meetings.
            </p>
          </Link>

          {/* Punch Lists */}
          <Link
            href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/punch-lists`}
            className="block border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition"
          >
            <h3 className="font-bold mb-1 text-gray-900">Punch Lists</h3>
            <p className="text-sm text-gray-600">
              Track final tasks or issues that must be resolved before project close-out.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
