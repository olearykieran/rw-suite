// src/components/TasksHeaderNav.tsx
"use client";

import { useRouter } from "next/navigation";
import { GrayButton } from "@/components/ui/GrayButton";
import { useLoadingBar } from "@/context/LoadingBarContext";

interface Props {
  orgId: string;
  projectId: string;
  subProjectId: string;
}

/**
 * Renders a small nav bar for Tasks:
 *  - Back to Sub-Project
 *  - List/Table
 *  - Gantt
 *  - Import/Export
 */
export default function TasksHeaderNav({ orgId, projectId, subProjectId }: Props) {
  const router = useRouter();
  const { setIsLoading } = useLoadingBar();

  // Construct base URLs for navigation.
  const baseTasksUrl = `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/tasks`;
  const subProjectUrl = `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}`;

  // Helper to navigate with loading bar trigger.
  const handleNavigate = (path: string) => {
    setIsLoading(true);
    router.push(path);
  };

  return (
    <nav className="mb-4 flex items-center gap-4 flex-wrap">
      {/* Back to sub-project */}
      <GrayButton onClick={() => handleNavigate(subProjectUrl)}>
        &larr; Back to Sub-Project
      </GrayButton>

      <span className="text-neutral-400">|</span>

      <GrayButton onClick={() => handleNavigate(baseTasksUrl)}>List/Table</GrayButton>

      <GrayButton onClick={() => handleNavigate(`${baseTasksUrl}/gantt`)}>
        Gantt
      </GrayButton>

      <GrayButton onClick={() => handleNavigate(`${baseTasksUrl}/importexport`)}>
        Import/Export
      </GrayButton>
    </nav>
  );
}
