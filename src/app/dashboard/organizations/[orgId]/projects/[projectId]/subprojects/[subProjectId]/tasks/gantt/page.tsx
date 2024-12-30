// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/tasks/gantt/page.tsx

"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { TaskDoc, SubTask, fetchAllTasks, updateTask } from "@/lib/services/TaskService";
import DhtmlxGantt from "@/components/DhtmlxGantt";

interface DhtmlxTaskItem {
  id: string | number;
  text: string;
  start_date: string; // or a Date if we adjust config
  end_date: string;
  parent?: string | number;
}

interface GanttData {
  data: DhtmlxTaskItem[];
  links: any[]; // optional if you want dependencies
}

export default function TasksGanttPage() {
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ganttData, setGanttData] = useState<GanttData>({ data: [], links: [] });

  // `YYYY-MM-DD HH:mm` format or whichever matches gantt.config.date_format
  function formatDate(d: Date | null | undefined) {
    if (!d || !(d instanceof Date)) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = "00"; // or d.getHours()
    const mins = "00"; // or d.getMinutes()
    return `${year}-${month}-${day} ${hours}:${mins}`;
  }

  // Convert your tasks + subtasks into Dhtmlx tasks
  function buildGanttData(tasks: TaskDoc[]): GanttData {
    const items: DhtmlxTaskItem[] = [];

    tasks.forEach((task) => {
      // main task
      const mainId = task.id;
      items.push({
        id: mainId,
        text: task.title,
        start_date: formatDate(task.startDate),
        end_date: formatDate(task.endDate),
        parent: 0, // top-level
      });

      // sub tasks
      if (task.subtasks && task.subtasks.length > 0) {
        task.subtasks.forEach((sub) => {
          items.push({
            id: sub.id,
            text: sub.title,
            start_date: formatDate(sub.startDate),
            end_date: formatDate(sub.endDate),
            parent: mainId, // parent = the main task id
          });
        });
      }
    });

    return { data: items, links: [] };
  }

  useEffect(() => {
    async function loadTasks() {
      try {
        setLoading(true);
        const tasks = await fetchAllTasks(orgId, projectId, subProjectId);
        const data = buildGanttData(tasks);
        setGanttData(data);
      } catch (err: any) {
        console.error("Gantt fetch error:", err);
        setError("Failed to load tasks for Gantt.");
      } finally {
        setLoading(false);
      }
    }
    if (orgId && projectId && subProjectId) loadTasks();
  }, [orgId, projectId, subProjectId]);

  // Example of saving changes back to Firestore
  async function handleTaskUpdated(updated: any) {
    // updated has shape { id, text, start_date, end_date, parent ... }
    console.log("onAfterTaskUpdate =>", updated);

    // If it's a subtask, parent != 0 => find which main task it belongs to
    // Then update your Firestore doc accordingly.
    // (This is only an example. You might handle it differently.)
    try {
      if (updated.parent === "0") {
        // It's a main task
        await updateTask(orgId, projectId, subProjectId, updated.id, {
          title: updated.text,
          // parse the date string if we want real date
          startDate: new Date(updated.start_date),
          endDate: new Date(updated.end_date),
        });
      } else {
        // It's a subtask => we find the main doc and update subtask in that doc
        // (In your real logic, you have to fetch the main doc, adjust subtask array, etc.)
        // For brevity, we won't do the entire logic here.
        console.log("Subtask update - parent =>", updated.parent);
      }
    } catch (err: any) {
      console.error("Failed to update Firestore after Gantt update:", err);
    }
  }

  if (loading) return <div className="p-4">Loading tasks for Gantt...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <main className="p-4 space-y-4">
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/tasks`}
        className="text-blue-600 underline"
      >
        &larr; Back
      </Link>

      <h1 className="text-2xl font-bold">Tasks (Gantt with dhtmlx-gantt)</h1>

      <DhtmlxGantt tasks={ganttData} onTaskUpdated={handleTaskUpdated} />
    </main>
  );
}
