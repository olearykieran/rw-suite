// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/tasks/page.tsx

"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  TaskDoc,
  SubTask,
  fetchAllTasks,
  createTask,
  updateTask,
  deleteTask,
} from "@/lib/services/TaskService";

export default function TasksListPage() {
  const router = useRouter();
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };

  const [tasks, setTasks] = useState<TaskDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // For creating a new top-level task
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskStart, setNewTaskStart] = useState<Date | null>(null);
  const [newTaskEnd, setNewTaskEnd] = useState<Date | null>(null);
  const [newAssignedTo, setNewAssignedTo] = useState("");

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

  async function handleCreateTask() {
    if (!newTaskTitle.trim()) return;
    try {
      const newId = await createTask(orgId, projectId, subProjectId, {
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim() || "",
        startDate: newTaskStart,
        endDate: newTaskEnd,
        assignedTo: newAssignedTo.trim(),
        status: "notStarted",
        priority: "medium",
        subtasks: [],
      });
      // Reload
      const data = await fetchAllTasks(orgId, projectId, subProjectId);
      setTasks(data);
      // Clear
      setNewTaskTitle("");
      setNewTaskDesc("");
      setNewTaskStart(null);
      setNewTaskEnd(null);
      setNewAssignedTo("");
    } catch (err: any) {
      console.error("Create task error:", err);
      setError("Failed to create task");
    }
  }

  async function handleDeleteTask(taskId: string) {
    try {
      await deleteTask(orgId, projectId, subProjectId, taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err: any) {
      console.error("Delete task error:", err);
      setError("Failed to delete task");
    }
  }

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

  // Subtask Logic
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

  async function handleDeleteSubtask(task: TaskDoc, subId: string) {
    if (!task.subtasks) return;
    const updatedSubs = task.subtasks.filter((s) => s.id !== subId);
    await updateTask(orgId, projectId, subProjectId, task.id, { subtasks: updatedSubs });
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, subtasks: updatedSubs } : t))
    );
  }

  if (loading) {
    return <div className="p-4">Loading Tasks...</div>;
  }
  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }

  return (
    <main className="p-4 space-y-6">
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}`}
        className="text-blue-600 underline"
      >
        &larr; Back
      </Link>

      <h1 className="text-2xl font-bold">Tasks (List / Interactive)</h1>

      {/* Quick Nav */}
      <div className="flex gap-4">
        <Link
          href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/tasks/grid`}
          className="underline text-blue-600"
        >
          Card View
        </Link>
        <Link
          href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/tasks/gantt`}
          className="underline text-blue-600"
        >
          Gantt View
        </Link>
        <Link
          href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/tasks/importexport`}
          className="underline text-blue-600"
        >
          Import/Export
        </Link>
      </div>

      {/* Create Task */}
      <div className="border p-3 rounded space-y-2 w-full max-w-xl">
        <h2 className="font-semibold">Create New Task</h2>
        <input
          className="border p-2 w-full"
          placeholder="Task Title"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
        />
        <textarea
          className="border p-2 w-full"
          placeholder="Description"
          rows={2}
          value={newTaskDesc}
          onChange={(e) => setNewTaskDesc(e.target.value)}
        />
        <div className="flex gap-2 items-center">
          <label className="text-sm">Start:</label>
          <DatePicker
            className="border p-2 text-sm"
            selected={newTaskStart}
            onChange={(date) => setNewTaskStart(date)}
          />
          <label className="text-sm">End:</label>
          <DatePicker
            className="border p-2 text-sm"
            selected={newTaskEnd}
            onChange={(date) => setNewTaskEnd(date)}
          />
        </div>
        <div>
          <label className="text-sm font-medium block">Assigned To:</label>
          <input
            className="border p-2 w-full text-sm"
            placeholder="user@example.com"
            value={newAssignedTo}
            onChange={(e) => setNewAssignedTo(e.target.value)}
          />
        </div>
        <button
          onClick={handleCreateTask}
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
        >
          Add Task
        </button>
      </div>

      {/* Task List */}
      {tasks.length === 0 && <p>No tasks found.</p>}

      <div className="space-y-4">
        {tasks.map((task) => (
          <div key={task.id} className="border p-3 rounded">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">{task.title}</h3>
                <p className="text-sm text-gray-500">{task.description}</p>
                <p className="text-sm text-gray-500">
                  Start:{" "}
                  {task.startDate instanceof Date
                    ? task.startDate.toLocaleDateString()
                    : ""}
                  &nbsp; | End:{" "}
                  {task.endDate instanceof Date ? task.endDate.toLocaleDateString() : ""}
                </p>
                <p className="text-sm text-gray-600">
                  Assigned: {task.assignedTo || "N/A"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <p className="text-sm">
                  <span className="font-semibold">Status:</span> {task.status}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleTaskStatusChange(task, "completed")}
                    className="text-xs bg-green-200 px-2 py-1 rounded"
                  >
                    Mark Complete
                  </button>
                  <button
                    onClick={() => handleTaskStatusChange(task, "inProgress")}
                    className="text-xs bg-yellow-200 px-2 py-1 rounded"
                  >
                    In Progress
                  </button>
                  <button
                    onClick={() => handleTaskStatusChange(task, "delayed")}
                    className="text-xs bg-red-200 px-2 py-1 rounded"
                  >
                    Delayed
                  </button>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-xs bg-gray-300 px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>

            {/* Subtasks */}
            <div className="mt-2 border-t pt-2">
              <div className="flex justify-between items-center">
                <p className="font-medium text-sm">Subtasks</p>
                <button
                  onClick={() => handleAddSubtask(task)}
                  className="text-xs bg-blue-100 px-2 py-1 rounded"
                >
                  + Add Subtask
                </button>
              </div>
              {task.subtasks && task.subtasks.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {task.subtasks.map((sub) => (
                    <li key={sub.id} className="flex justify-between items-center">
                      <span>
                        <strong>{sub.title}</strong> &ndash;{" "}
                        <span className="text-xs text-gray-500">{sub.status}</span>
                      </span>
                      <button
                        onClick={() => handleDeleteSubtask(task, sub.id)}
                        className="text-xs text-red-600 underline"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400 mt-1">No subtasks yet.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
