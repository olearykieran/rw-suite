// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/tasks/new/page.tsx

"use client";

import React, { FormEvent, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { createTask } from "@/lib/services/TaskService";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";
import TasksHeaderNav from "@/components/TasksHeaderNav";

export default function NewTaskPage() {
  const router = useRouter();
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [assignedTo, setAssignedTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required!");
      return;
    }
    setLoading(true);

    try {
      await createTask(orgId, projectId, subProjectId, {
        title: title.trim(),
        description: description.trim(),
        startDate,
        endDate,
        assignedTo: assignedTo.trim(),
        status: "notStarted",
        priority: "medium",
        subtasks: [],
      });
      router.push(
        `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/tasks`
      );
    } catch (err: any) {
      console.error("Create new task error:", err);
      setError(err.message || "Failed to create task");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer>
      <TasksHeaderNav orgId={orgId} projectId={projectId} subProjectId={subProjectId} />

      <h1 className="text-2xl font-bold">Create New Task</h1>

      {error && <p className="text-red-600">{error}</p>}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-semibold mb-1 text-sm">Title</label>
            <input
              className="
                border p-2 w-full rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
              placeholder="e.g. 'Design Foundation'"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block font-semibold mb-1 text-sm">Description</label>
            <textarea
              className="
                border p-2 w-full rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
              placeholder="Brief details..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex gap-4 items-center">
            <div>
              <label className="block font-semibold text-sm mb-1">Start Date</label>
              <DatePicker
                className="
                  border p-2 text-sm rounded
                  bg-white dark:bg-neutral-800 dark:text-white
                "
                selected={startDate}
                onChange={(date) => setStartDate(date)}
              />
            </div>
            <div>
              <label className="block font-semibold text-sm mb-1">End Date</label>
              <DatePicker
                className="
                  border p-2 text-sm rounded
                  bg-white dark:bg-neutral-800 dark:text-white
                "
                selected={endDate}
                onChange={(date) => setEndDate(date)}
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1 text-sm">Assigned To</label>
            <input
              className="
                border p-2 w-full text-sm rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
              placeholder="someone@example.com"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
            />
          </div>

          <GrayButton type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Task"}
          </GrayButton>
        </form>
      </Card>
    </PageContainer>
  );
}
