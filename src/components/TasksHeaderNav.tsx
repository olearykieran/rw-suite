"use client";

import Link from "next/link";

interface Props {
  orgId: string;
  projectId: string;
  subProjectId: string;
}

/**
 * Renders a small nav bar for Tasks:
 *  - Back to Sub-Project
 *  - List/Table
 *  - Card View
 *  - Gantt
 *  - Import/Export
 *  - New Task
 */
export default function TasksHeaderNav({ orgId, projectId, subProjectId }: Props) {
  const baseTasksUrl = `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/tasks`;
  const subProjectUrl = `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}`;

  return (
    <nav className="mb-4 flex items-center gap-4 text-sm flex-wrap">
      {/* Back to sub-project */}
      <Link
        href={subProjectUrl}
        className="
          text-sm font-medium text-blue-600 underline
          hover:text-blue-700 dark:text-blue-400
          dark:hover:text-blue-300 transition-colors
        "
      >
        &larr; Back to Sub-Project
      </Link>

      <span className="text-neutral-400">|</span>

      <Link
        href={`${baseTasksUrl}`}
        className="
          underline text-blue-600 hover:text-blue-700
          dark:text-blue-400 dark:hover:text-blue-300
        "
      >
        List/Table
      </Link>

      <Link
        href={`${baseTasksUrl}/grid`}
        className="
          underline text-blue-600 hover:text-blue-700
          dark:text-blue-400 dark:hover:text-blue-300
        "
      >
        Card View
      </Link>

      <Link
        href={`${baseTasksUrl}/gantt`}
        className="
          underline text-blue-600 hover:text-blue-700
          dark:text-blue-400 dark:hover:text-blue-300
        "
      >
        Gantt
      </Link>

      <Link
        href={`${baseTasksUrl}/importexport`}
        className="
          underline text-blue-600 hover:text-blue-700
          dark:text-blue-400 dark:hover:text-blue-300
        "
      >
        Import/Export
      </Link>

      <Link
        href={`${baseTasksUrl}/new`}
        className="
          underline text-blue-600 hover:text-blue-700
          dark:text-blue-400 dark:hover:text-blue-300
        "
      >
        New Task
      </Link>
    </nav>
  );
}
