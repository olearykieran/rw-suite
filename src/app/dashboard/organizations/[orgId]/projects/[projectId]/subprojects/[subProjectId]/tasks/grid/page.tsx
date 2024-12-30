// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/tasks/grid/page.tsx

"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { TaskDoc, fetchAllTasks } from "@/lib/services/TaskService";

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

  if (loading) return <div className="p-4">Loading tasks (card view)...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <main className="p-4 space-y-6">
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/tasks`}
        className="text-blue-600 underline"
      >
        &larr; Back
      </Link>

      <h1 className="text-2xl font-bold">Tasks (Card-Based)</h1>

      {tasks.length === 0 && <p>No tasks found.</p>}

      {/* 
        For demonstration:
        - We'll consider each "Task" as "Main" if it has no parent
        - subTasks are already inlined
        We'll display each main as a card, then subTasks as smaller cards below 
      */}
      <div className="flex flex-wrap gap-4">
        {tasks.map((task) => (
          <div key={task.id} className="border rounded p-3 w-full max-w-sm">
            <h3 className="font-semibold text-lg">{task.title}</h3>
            <p className="text-sm text-gray-600 mb-2">{task.description}</p>
            <p className="text-xs text-gray-500">
              {task.startDate instanceof Date ? task.startDate.toLocaleDateString() : ""}{" "}
              - {task.endDate instanceof Date ? task.endDate.toLocaleDateString() : ""}
            </p>
            <p className="text-xs">
              Assigned: {task.assignedTo || "N/A"} | Status: {task.status}
            </p>

            {/* Subtask cards */}
            {task.subtasks && task.subtasks.length > 0 && (
              <div className="mt-3 space-y-2">
                {task.subtasks.map((sub) => (
                  <div key={sub.id} className="bg-gray-50 p-2 rounded shadow-sm">
                    <p className="text-sm font-medium">{sub.title}</p>
                    <p className="text-xs text-gray-500">
                      {sub.status} | {sub.assignedTo || "N/A"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
