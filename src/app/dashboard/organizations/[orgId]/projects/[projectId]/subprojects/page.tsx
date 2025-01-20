"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebaseConfig";
import Link from "next/link";

// Shared UI
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";
import { AnimatedList } from "@/components/ui/AnimatedList";

interface SubProject {
  id: string;
  name: string;
  status?: string;
  [key: string]: any;
}

export default function SubProjectsPage() {
  const { orgId, projectId } = useParams() as { orgId: string; projectId: string };
  const [subProjects, setSubProjects] = useState<SubProject[]>([]);
  const [mainProjectName, setMainProjectName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        // 1) Load the main project doc for the name
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

        // 2) Load sub-projects
        const subprojectsRef = collection(mainProjectRef, "subprojects");
        const snap = await getDocs(subprojectsRef);
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as SubProject[];
        setSubProjects(data);
      } catch (err: any) {
        console.error("Fetch subprojects error:", err);
        setError("Failed to load sub-projects.");
      } finally {
        setLoading(false);
      }
    }
    if (orgId && projectId) {
      fetchData();
    }
  }, [orgId, projectId]);

  const renderSubProject = (sp: SubProject) => (
    <Card>
      <h3 className="font-semibold text-lg">{sp.name}</h3>
      <p className="text-sm">Status: {sp.status || "active"}</p>
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${sp.id}`}
        className="
          text-blue-600 hover:underline text-sm mt-2 inline-block
          hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300
        "
      >
        Open Project
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
      {/* Back link to main project */}
      <Link
        href={`/dashboard/organizations/${orgId}/projects`}
        className="
          text-sm font-medium text-blue-600 underline
          hover:text-blue-700 dark:text-blue-400
          dark:hover:text-blue-300 transition-colors
        "
      >
        &larr; Back to {mainProjectName}
      </Link>

      <h1 className="text-2xl font-bold mt-4">Sub-Projects under {mainProjectName}</h1>

      <AnimatedList
        items={subProjects}
        renderItem={renderSubProject}
        isLoading={loading}
        className="mt-4"
        emptyMessage={
          <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-2">
            No sub-projects found.
          </p>
        }
      />
    </PageContainer>
  );
}
