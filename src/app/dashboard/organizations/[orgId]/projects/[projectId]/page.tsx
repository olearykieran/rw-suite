// src/app/dashboard/organizations/[orgId]/projects/[projectId]/page.tsx

"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebaseConfig";
import Link from "next/link";

// Shared UI
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

export default function MainProjectOverviewPage() {
  const { orgId, projectId } = useParams() as { orgId: string; projectId: string };
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch project information from Firestore
  useEffect(() => {
    async function fetchProject() {
      try {
        // Return early if IDs aren't available
        if (!orgId || !projectId) return;

        // Create reference to the project doc in Firestore
        const ref = doc(firestore, "organizations", orgId, "projects", projectId);
        const snap = await getDoc(ref);

        // Check if project exists
        if (!snap.exists()) {
          setError("Project not found or insufficient permissions.");
          return;
        }
        // Save project data to state
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

  // Loading state
  if (loading) {
    return <div className="p-6 text-sm">Loading main project overview...</div>;
  }

  // Error state
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  // No project found
  if (!project) {
    return <div className="p-6">No project data found.</div>;
  }

  return (
    <PageContainer>
      {/* Back link to Projects list */}
      <Link
        href={`/dashboard/organizations/${orgId}/projects`}
        className="
          text-sm font-medium text-blue-600 underline 
          hover:text-blue-700 dark:text-blue-400 
          dark:hover:text-blue-300 transition-colors
        "
      >
        &larr; Back to Projects
      </Link>

      <div className="flex justify-between items-center mt-4">
        <h1 className="text-2xl font-bold">Main Project: {project.name}</h1>
      </div>

      {/* Card displaying the main project’s status & description */}
      <Card>
        <p className="text-sm">
          Status: <strong>{project.status || "unknown"}</strong>
        </p>
        <p className="text-sm mt-2">
          This is the main/umbrella project. All features (RFIs, tasks, finances, etc.)
          are located within its sub-projects.
        </p>
      </Card>

      {/* Added `mt-6` to create margin between the card and this button */}
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects`}
        className="mt-6 inline-block"
      >
        <GrayButton>View Project Details</GrayButton>
      </Link>
    </PageContainer>
  );
}
