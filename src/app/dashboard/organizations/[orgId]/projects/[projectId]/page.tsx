// src/app/dashboard/organizations/[orgId]/projects/[projectId]/page.tsx
"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebaseConfig";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function MainProjectOverviewPage() {
  const router = useRouter();
  const { orgId, projectId } = useParams() as { orgId: string; projectId: string };
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProject() {
      try {
        if (!orgId || !projectId) return;
        const ref = doc(firestore, "organizations", orgId, "projects", projectId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setError("Project not found or insufficient permissions.");
          return;
        }
        setProject({ id: snap.id, ...snap.data() });

        // could store localstorage if you want:
        localStorage.setItem("selectedProjectId", snap.id);
        localStorage.setItem("selectedOrgId", orgId);
      } catch (err: any) {
        console.error("Fetch Project error:", err);
        setError("Failed to load project.");
      } finally {
        setLoading(false);
      }
    }
    fetchProject();
  }, [orgId, projectId]);

  function handleDeselectProject() {
    localStorage.removeItem("selectedProjectId");
    localStorage.removeItem("selectedOrgId");
    router.push(`/dashboard/organizations/${orgId}/projects`);
  }

  if (loading) {
    return <div className="p-4">Loading main project overview...</div>;
  }
  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }
  if (!project) {
    return <div className="p-4">No project data found.</div>;
  }

  return (
    <main className="p-4 space-y-6">
      {/* Back button */}
      <Link
        href={`/dashboard/organizations/${orgId}/projects`}
        className="text-blue-600 underline mb-4 inline-block"
      >
        &larr; Back to Projects
      </Link>

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Umbrella Project: {project.name}</h1>
        <button
          onClick={handleDeselectProject}
          className="bg-gray-200 px-3 py-1 rounded text-sm hover:bg-gray-300"
        >
          Deselect
        </button>
      </div>

      <p>Status: {project.status}</p>
      <p>
        This is the main/umbrella project. All actual features (RFIs, tasks, finances) are
        located in the sub-projects.
      </p>

      {/* Link to subprojects listing */}
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects`}
        className="inline-block bg-black text-white px-4 py-2 rounded hover:bg-neutral-800"
      >
        View Sub-Projects
      </Link>
    </main>
  );
}
