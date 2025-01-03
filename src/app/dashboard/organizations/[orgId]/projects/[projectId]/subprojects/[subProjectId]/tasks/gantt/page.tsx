// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/tasks/gantt/page.tsx

"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { TaskDoc, fetchAllTasks, updateTask } from "@/lib/services/TaskService";
import DhtmlxGantt from "@/components/DhtmlxGantt";

// Shared UI
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import TasksHeaderNav from "@/components/TasksHeaderNav";

interface DhtmlxTaskItem {
  id: string | number;
  text: string;
  start_date: string;
  end_date: string;
  parent?: string | number;
}

interface GanttData {
  data: DhtmlxTaskItem[];
  links: any[];
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

  // Convert date to “YYYY-MM-DD HH:mm”
  function formatDate(d: Date | null | undefined) {
    if (!d || !(d instanceof Date)) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = "00";
    const mins = "00";
    return `${year}-${month}-${day} ${hours}:${mins}`;
  }

  function buildGanttData(tasks: TaskDoc[]): GanttData {
    const items: DhtmlxTaskItem[] = [];
    tasks.forEach((task) => {
      items.push({
        id: task.id,
        text: task.title,
        start_date: formatDate(task.startDate),
        end_date: formatDate(task.endDate),
        parent: "0",
      });

      if (task.subtasks && task.subtasks.length > 0) {
        task.subtasks.forEach((sub) => {
          items.push({
            id: sub.id,
            text: sub.title,
            start_date: formatDate(sub.startDate),
            end_date: formatDate(sub.endDate),
            parent: task.id,
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
        setGanttData(buildGanttData(tasks));
      } catch (err: any) {
        console.error("Gantt fetch error:", err);
        setError("Failed to load tasks for Gantt.");
      } finally {
        setLoading(false);
      }
    }
    if (orgId && projectId && subProjectId) loadTasks();
  }, [orgId, projectId, subProjectId]);

  // Save changes from DHTMLX Gantt back to Firestore
  async function handleTaskUpdated(updated: any) {
    try {
      if (updated.parent === "0") {
        // main task
        await updateTask(orgId, projectId, subProjectId, updated.id, {
          title: updated.text,
          startDate: new Date(updated.start_date),
          endDate: new Date(updated.end_date),
        });
      } else {
        // subtask logic (not fully implemented)
        console.log("Subtask update => parent:", updated.parent);
      }
    } catch (err: any) {
      console.error("Gantt update error:", err);
    }
  }

  if (loading) {
    return <div className="p-6 text-sm">Loading tasks for Gantt...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <PageContainer>
      <TasksHeaderNav orgId={orgId} projectId={projectId} subProjectId={subProjectId} />

      <h1 className="text-2xl font-bold">Tasks (Gantt View)</h1>

      <Card>
        <DhtmlxGantt tasks={ganttData} onTaskUpdated={handleTaskUpdated} />
      </Card>
    </PageContainer>
  );
}
