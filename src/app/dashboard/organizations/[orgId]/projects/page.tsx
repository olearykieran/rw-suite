"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { firestore } from "@/lib/firebaseConfig";
import Link from "next/link";

// Shared UI
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";
import { AnimatedList } from "@/components/ui/AnimatedList";

interface Project {
  id: string;
  name?: string;
  status?: string;
  mainProjectId?: string;
  [key: string]: any;
}

export default function ProjectsPage() {
  const { orgId } = useParams() as { orgId: string };
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProjects() {
      if (!orgId) return;
      try {
        const ref = collection(firestore, "organizations", orgId, "projects");
        const snap = await getDocs(ref);
        const data = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Project[];
        setProjects(data);
      } catch (err: any) {
        console.error("Fetch projects error:", err);
        setError("Failed to load projects.");
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, [orgId]);

  const renderProject = (project: Project) => (
    <Card>
      <p className="font-semibold text-lg">{project.name || project.id}</p>
      {project.status && <p className="text-sm">Status: {project.status}</p>}
      {project.mainProjectId && (
        <p className="text-sm">Sub-project of: {project.mainProjectId}</p>
      )}
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${project.id}/subprojects`}
        className="
          text-blue-600 underline text-sm mt-2 inline-block
          hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300
        "
      >
        View Project
      </Link>
    </Card>
  );

  if (error) {
    return (
      <PageContainer>
        <div className="p-6 text-red-600">{error}</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Back to all organizations */}
      <Link
        href="/dashboard/organizations"
        className="
          text-sm font-medium text-blue-600 underline
          hover:text-blue-700 dark:text-blue-400
          dark:hover:text-blue-300 transition-colors
        "
      >
        &larr; Back to Organizations
      </Link>

      <div className="flex justify-between items-center mt-4">
        <h1 className="text-2xl font-bold">Projects under Org {orgId}</h1>
        <Link href={`/dashboard/organizations/${orgId}/projects/new`}>
          <GrayButton>Create New Project</GrayButton>
        </Link>
      </div>

      <AnimatedList
        items={projects}
        renderItem={renderProject}
        isLoading={loading}
        className="mt-4"
        emptyMessage={
          <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-2">
            No projects found. Create one!
          </p>
        }
      />
    </PageContainer>
  );
}
