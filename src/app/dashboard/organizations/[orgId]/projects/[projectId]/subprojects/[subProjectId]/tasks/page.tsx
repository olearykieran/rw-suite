// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/tasks/page.tsx

"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  TaskDoc,
  SubTask,
  fetchAllTasks,
  updateTask,
  deleteTask,
} from "@/lib/services/TaskService";

// Shared UI
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";
import TasksHeaderNav from "@/components/TasksHeaderNav"; // We'll create this mini-header as a reusable component

export default function TasksListPage() {
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

  // Update a task’s status
  async function handleTaskStatusChange(task: TaskDoc, newStatus: string) {
    try {
      await updateTask(orgId, projectId, subProjectId, task.id, { status: newStatus });
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
      );
    } catch (err: any) {
      console.error("Task status update error:", err);
      setError("Failed to update task status");
    }
  }

  // Delete a task
  async function handleDeleteTask(taskId: string) {
    try {
      await deleteTask(orgId, projectId, subProjectId, taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err: any) {
      console.error("Delete task error:", err);
      setError("Failed to delete task");
    }
  }

  // Add a subtask
  async function handleAddSubtask(task: TaskDoc) {
    const title = prompt("Subtask title?");
    if (!title) return;

    const newSub: SubTask = {
      id: "sub-" + Date.now(),
      title,
      status: "notStarted",
    };
    const updatedSubs = [...(task.subtasks || []), newSub];
    await updateTask(orgId, projectId, subProjectId, task.id, { subtasks: updatedSubs });
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, subtasks: updatedSubs } : t))
    );
  }

  // Remove a subtask
  async function handleDeleteSubtask(task: TaskDoc, subId: string) {
    if (!task.subtasks) return;
    const updatedSubs = task.subtasks.filter((s) => s.id !== subId);
    await updateTask(orgId, projectId, subProjectId, task.id, { subtasks: updatedSubs });
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, subtasks: updatedSubs } : t))
    );
  }

  if (loading) {
    return <div className="p-6 text-sm">Loading Tasks (Table View)...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <PageContainer>
      {/* The reusable mini-header with links to each tasks view */}
      <TasksHeaderNav orgId={orgId} projectId={projectId} subProjectId={subProjectId} />

      <h1 className="text-2xl font-bold">Tasks (List / Table View)</h1>

      {tasks.length === 0 && (
        <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-2">
          No tasks found.
        </p>
      )}

      <div className="space-y-4 mt-4">
        {tasks.map((task) => (
          <Card key={task.id}>
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <h3 className="font-bold text-lg">{task.title}</h3>
                <p className="text-sm">{task.description}</p>
                <p className="text-sm">
                  <strong>Start:</strong>{" "}
                  {task.startDate instanceof Date
                    ? task.startDate.toLocaleDateString()
                    : ""}
                  &nbsp; | <strong>End:</strong>{" "}
                  {task.endDate instanceof Date ? task.endDate.toLocaleDateString() : ""}
                </p>
                <p className="text-sm">
                  <strong>Assigned:</strong> {task.assignedTo || "N/A"}
                </p>
              </div>
              {/* Right column: actions */}
              <div className="flex flex-col items-end gap-2">
                <p className="text-sm">
                  <span className="font-semibold">Status:</span> {task.status}
                </p>
                <div className="flex gap-2">
                  <GrayButton
                    onClick={() => handleTaskStatusChange(task, "completed")}
                    className="text-xs"
                  >
                    Mark Complete
                  </GrayButton>
                  <GrayButton
                    onClick={() => handleTaskStatusChange(task, "inProgress")}
                    className="text-xs"
                  >
                    In Progress
                  </GrayButton>
                  <GrayButton
                    onClick={() => handleTaskStatusChange(task, "delayed")}
                    className="text-xs"
                  >
                    Delayed
                  </GrayButton>
                  <GrayButton
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-xs"
                  >
                    Delete
                  </GrayButton>
                </div>
              </div>
            </div>

            {/* Subtasks */}
            <div className="mt-4 border-t pt-2 space-y-2">
              <div className="flex justify-between items-center">
                <p className="font-medium text-sm">Subtasks</p>
                <GrayButton onClick={() => handleAddSubtask(task)} className="text-xs">
                  + Add Subtask
                </GrayButton>
              </div>
              {task.subtasks && task.subtasks.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm">
                  {task.subtasks.map((sub) => (
                    <li
                      key={sub.id}
                      className="flex justify-between items-center border p-2 rounded"
                    >
                      <span>
                        <strong>{sub.title}</strong> &ndash; {sub.status}
                      </span>
                      <GrayButton
                        onClick={() => handleDeleteSubtask(task, sub.id)}
                        className="text-xs"
                      >
                        Remove
                      </GrayButton>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm mt-1">No subtasks yet.</p>
              )}
            </div>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
