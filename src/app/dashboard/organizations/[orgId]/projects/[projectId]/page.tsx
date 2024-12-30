// src/app/dashboard/organizations/[orgId]/projects/[projectId]/page.tsx

"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebaseConfig";
import Link from "next/link";

export default function MainProjectOverviewPage() {
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
      } catch (err) {
        console.error("Fetch Project error:", err);
        setError("Failed to load project.");
      } finally {
        setLoading(false);
      }
    }
    fetchProject();
  }, [orgId, projectId]);

  if (loading) {
    return <div className="p-6 text-gray-700">Loading main project overview...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }
  if (!project) {
    return <div className="p-6 text-gray-700">No project data found.</div>;
  }

  return (
    <main className="p-6 space-y-6">
      <Link
        href={`/dashboard/organizations/${orgId}/projects`}
        className="text-blue-600 underline mb-4 inline-block"
      >
        &larr; Back to Projects
      </Link>

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Main Project: {project.name}</h1>
      </div>

      <p className="text-gray-700">Status: {project.status}</p>
      <p className="text-gray-700">
        This is the main/umbrella project. All features (RFIs, tasks, finances) are
        located within the sub-projects.
      </p>

      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects`}
        className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
      >
        View Project Management Tools
      </Link>
    </main>
  );
}
