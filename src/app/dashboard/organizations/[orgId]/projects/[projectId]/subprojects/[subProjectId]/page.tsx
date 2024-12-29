"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebaseConfig";
import Link from "next/link";

export default function SubProjectOverview() {
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };
  const [subProject, setSubProject] = useState<any>(null);
  const [mainProjectName, setMainProjectName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        // fetch sub-project doc
        const mainRef = doc(firestore, "organizations", orgId, "projects", projectId);
        const subRef = doc(mainRef, "subprojects", subProjectId);
        const snap = await getDoc(subRef);
        if (!snap.exists()) {
          setError("Sub-project not found.");
          setLoading(false);
          return;
        }
        setSubProject({ id: snap.id, ...snap.data() });

        // also get main project name
        const mainSnap = await getDoc(mainRef);
        if (mainSnap.exists()) {
          setMainProjectName(mainSnap.data().name || projectId);
        }
      } catch (err: any) {
        console.error("Fetch sub-project error:", err);
        setError("Failed to load sub-project.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [orgId, projectId, subProjectId]);

  if (loading) return <div className="p-4">Loading sub-project...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!subProject) return <div className="p-4">No sub-project found.</div>;

  return (
    <main className="p-4 space-y-4">
      {/* Back to sub-projects listing */}
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects`}
        className="text-blue-600 underline"
      >
        &larr; Back to Sub-Projects of {mainProjectName}
      </Link>

      <h1 className="text-2xl font-bold">Sub-Project: {subProject.name}</h1>
      <p>Status: {subProject.status}</p>

      {/* Now the real features (RFIs, tasks, finances, etc.) are under the sub-project */}
      <div className="border-t mt-4 pt-4">
        <h2 className="text-xl font-semibold mb-3">Sub-Project Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/rfis`}
            className="block border rounded p-4 hover:bg-gray-50"
          >
            <h3 className="font-bold mb-1">RFIs</h3>
            <p className="text-sm text-gray-600">
              Create, distribute, and track Requests for Information.
            </p>
          </Link>
          {/* tasks, finances, submittals, analytics, etc. all under subProjectId */}
        </div>
      </div>
    </main>
  );
}
