// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/tasks/grid/page.tsx

"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { TaskDoc, fetchAllTasks } from "@/lib/services/TaskService";

// Shared UI
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import TasksHeaderNav from "@/components/TasksHeaderNav";

export default function TasksCardViewPage() {
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };

  const [tasks, setTasks] = useState<TaskDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await fetchAllTasks(orgId, projectId, subProjectId);
        setTasks(data);
      } catch (err: any) {
        console.error("Fetch tasks error:", err);
        setError("Failed to load tasks.");
      } finally {
        setLoading(false);
      }
    }
    if (orgId && projectId && subProjectId) {
      load();
    }
  }, [orgId, projectId, subProjectId]);

  if (loading) {
    return <div className="p-6 text-sm">Loading tasks (card view)...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <PageContainer>
      <TasksHeaderNav orgId={orgId} projectId={projectId} subProjectId={subProjectId} />

      <h1 className="text-2xl font-bold">Tasks (Card-Based View)</h1>

      {tasks.length === 0 && (
        <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-2">
          No tasks found.
        </p>
      )}

      <div className="flex flex-wrap gap-4 mt-4">
        {tasks.map((task) => (
          <Card key={task.id} className="w-full max-w-sm">
            <h3 className="font-semibold text-lg">{task.title}</h3>
            <p className="text-sm mb-2">{task.description}</p>
            <p className="text-xs">
              {task.startDate instanceof Date ? task.startDate.toLocaleDateString() : ""}{" "}
              - {task.endDate instanceof Date ? task.endDate.toLocaleDateString() : ""}
            </p>
            <p className="text-xs">
              <strong>Assigned:</strong> {task.assignedTo || "N/A"} |{" "}
              <strong>Status:</strong> {task.status}
            </p>

            {task.subtasks && task.subtasks.length > 0 && (
              <div className="mt-3 space-y-2">
                {task.subtasks.map((sub) => (
                  <Card key={sub.id} className="p-2">
                    <p className="text-sm font-medium">{sub.title}</p>
                    <p className="text-xs">
                      {sub.status} | {sub.assignedTo || "N/A"}
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
