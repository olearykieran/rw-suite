// src/app/dashboard/organizations/[orgId]/projects/page.tsx
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { firestore } from "@/lib/firebaseConfig";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";

// Shared UI
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";
import { AnimatedList } from "@/components/ui/AnimatedList";

// Import the global loading bar hook.
import { useLoadingBar } from "@/context/LoadingBarContext";

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
  const router = useRouter();

  // Use the global loading bar setter.
  const { setIsLoading } = useLoadingBar();

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
    <Card key={project.id}>
      <p className="font-semibold text-lg">{project.name || project.id}</p>
      {project.status && <p className="-">Status: {project.status}</p>}
      {project.mainProjectId && (
        <p className="">Sub-project of: {project.mainProjectId}</p>
      )}
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${project.id}/subprojects`}
        onClick={() => setIsLoading(true)}
        className="mt-2 inline-block"
      >
        <GrayButton>View Project</GrayButton>
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
      <button
        onClick={() => router.push("/dashboard/organizations")}
        className="
          bg-gray-300 text-black
          hover:bg-gray-400
          dark:bg-gray-700 dark:text-white
          dark:hover:bg-gray-600
          transition-colors
          px-4 py-2 rounded-xl 
        "
      >
        &larr; Back to Organizations
      </button>

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
        className="mt-4 text-black dark:text-white"
        emptyMessage={
          <p className=" text-neutral-600  dark:text-neutral-300 mt-2">
            No projects found. Create one!
          </p>
        }
      />
    </PageContainer>
  );
}
