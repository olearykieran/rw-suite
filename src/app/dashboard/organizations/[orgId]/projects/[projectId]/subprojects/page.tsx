// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { firestore } from "@/lib/firebaseConfig";
import Link from "next/link";

// Shared UI
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";
import { AnimatedList } from "@/components/ui/AnimatedList";
import { useLoadingBar } from "@/context/LoadingBarContext";

interface SubProject {
  id: string;
  name?: string;
  status?: string;
  [key: string]: any;
}

export default function SubProjectsPage() {
  const router = useRouter();
  const { orgId, projectId } = useParams() as { orgId: string; projectId: string };
  const [subProjects, setSubProjects] = useState<SubProject[]>([]);
  const [mainProjectName, setMainProjectName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Use the global loading bar state.
  const { setIsLoading } = useLoadingBar();

  useEffect(() => {
    async function fetchData() {
      try {
        // 1) Load the main project document to get its name.
        const mainProjectRef = doc(
          firestore,
          "organizations",
          orgId,
          "projects",
          projectId
        );
        const mainSnap = await getDoc(mainProjectRef);
        if (!mainSnap.exists()) {
          setError("Main project not found.");
          setLoading(false);
          return;
        }
        setMainProjectName(mainSnap.data().name || projectId);

        // 2) Load sub‑projects.
        const subprojectsRef = collection(mainProjectRef, "subprojects");
        const snap = await getDocs(subprojectsRef);
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as SubProject[];
        setSubProjects(data);
      } catch (err: any) {
        console.error("Fetch subprojects error:", err);
        setError("Failed to load sub‑projects.");
      } finally {
        setLoading(false);
      }
    }
    if (orgId && projectId) {
      fetchData();
    }
  }, [orgId, projectId]);

  const renderSubProject = (sp: SubProject) => (
    <Card key={sp.id}>
      <p className="font-semibold text-lg">{sp.name || sp.id}</p>
      <p className="text-sm">Status: {sp.status || "active"}</p>
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${sp.id}`}
        onClick={() => setIsLoading(true)}
        className="mt-2 inline-block"
      >
        <GrayButton>Open Project</GrayButton>
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
      <button
        onClick={() => router.push(`/dashboard/organizations/${orgId}/projects`)}
        className="bg-gray-300 text-black hover:bg-gray-400 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 transition-colors px-4 py-2 rounded-xl text-sm"
      >
        &larr; Back to {mainProjectName}
      </button>

      <div className="flex justify-between items-center mt-4">
        <h1 className="text-2xl font-bold">Sub‑Projects under {mainProjectName}</h1>
      </div>

      <AnimatedList
        items={subProjects}
        renderItem={renderSubProject}
        isLoading={loading}
        className="mt-4 text-black dark:text-white"
        emptyMessage={
          <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-2">
            No sub‑projects found.
          </p>
        }
      />
    </PageContainer>
  );
}
