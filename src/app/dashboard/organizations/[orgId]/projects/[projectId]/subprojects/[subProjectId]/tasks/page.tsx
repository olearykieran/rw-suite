"use client";

import React, {
  useEffect,
  useState,
  DragEvent,
  FormEvent,
  HTMLAttributes,
  ReactNode,
} from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import {
  TaskDoc,
  SubTask,
  fetchAllTasks,
  createTask,
  updateTask,
  deleteTask,
} from "@/lib/services/TaskService";

import { PageContainer } from "@/components/ui/PageContainer";
import TasksHeaderNav from "@/components/TasksHeaderNav";
import { GrayButton } from "@/components/ui/GrayButton";

function ScrollableCard({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return (
    <section
      {...props}
      className={`
        dark:bg-neutral-900 bg-white
        dark:text-neutral-100 text-black
        border border-neutral-700 dark:border-neutral-800
        rounded-lg
        p-6
        w-full
        h-[calc(100vh-200px)]  
        overflow-auto
        ${className}
      `}
    >
      {children}
    </section>
  );
}

// We skip weekends + an example holiday
const BLOCKED_WEEKDAYS = [0, 6];
const BLOCKED_DATES = ["2024-01-01"];

/**
 * computeWorkingDaysCount => skip weekends + blockedDates
 */
function computeWorkingDaysCount(
  start: Date,
  end: Date,
  blockedWeekdays: number[],
  blockedDates: string[]
) {
  let count = 0;
  const cur = new Date(start.getTime());
  while (cur <= end) {
    const dow = cur.getDay();
    const iso = cur.toISOString().slice(0, 10);
    if (!blockedWeekdays.includes(dow) && !blockedDates.includes(iso)) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/**
 * computeEndDateIgnoringBlocked => recalc end from start ignoring weekends & blocked dates
 */
function computeEndDateIgnoringBlocked(
  start: Date,
  durationDays: number,
  blockedWeekdays: number[],
  blockedDates: string[]
): Date {
  if (durationDays <= 0) {
    return new Date(start);
  }
  let remaining = durationDays;
  const cur = new Date(start);
  remaining -= 1; // day1 = start

  while (remaining > 0) {
    cur.setDate(cur.getDate() + 1);
    const dow = cur.getDay();
    const iso = cur.toISOString().slice(0, 10);
    if (!blockedWeekdays.includes(dow) && !blockedDates.includes(iso)) {
      remaining--;
    }
  }
  return cur;
}

/**
 * parseDateIso => parse a full ISO-like string: "2025-01-20T05:00:00.000Z"
 * returns a valid Date or null if invalid.
 */
function parseDateIso(val: string): Date | null {
  const dt = new Date(val);
  if (isNaN(dt.getTime())) {
    return null;
  }
  return dt;
}

/**
 * parseDateInput => interpret user input "YYYY-MM-DD" as local date at midnight
 * (only used for user input in the table)
 */
function parseDateInput(val: string): Date | null {
  if (!val) return null;
  const [yyyy, mm, dd] = val.split("-").map(Number);
  if (!yyyy || !mm || !dd) return null;
  return new Date(yyyy, mm - 1, dd, 0, 0, 0);
}

/**
 * toDateInputValue => show "YYYY-MM-DD"
 */
function toDateInputValue(dt?: Date | null): string {
  if (!dt) return "";
  if (isNaN(dt.getTime())) return "";
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * coerceTaskDates => if the stored date is a full ISO string, parse it with parseDateIso.
 */
function coerceTaskDates(task: TaskDoc): TaskDoc {
  let s: Date | null = null;
  let e: Date | null = null;

  if (task.startDate instanceof Date && !isNaN(task.startDate.getTime())) {
    s = task.startDate;
  } else if (typeof task.startDate === "string") {
    // if it looks like "YYYY-MM-DDT", parse as ISO
    if (/^\d{4}-\d{2}-\d{2}T/.test(task.startDate)) {
      s = parseDateIso(task.startDate);
    } else {
      s = parseDateInput(task.startDate);
    }
  }

  if (task.endDate instanceof Date && !isNaN(task.endDate.getTime())) {
    e = task.endDate;
  } else if (typeof task.endDate === "string") {
    if (/^\d{4}-\d{2}-\d{2}T/.test(task.endDate)) {
      e = parseDateIso(task.endDate);
    } else {
      e = parseDateInput(task.endDate);
    }
  }

  return { ...task, startDate: s, endDate: e };
}

/**
 * coerceSubtaskDates => similarly handle subtask dates
 */
function coerceSubtaskDates(sub: SubTask): SubTask {
  let s: Date | null = null;
  let e: Date | null = null;

  if (sub.startDate instanceof Date && !isNaN(sub.startDate.getTime())) {
    s = sub.startDate;
  } else if (typeof sub.startDate === "string") {
    if (/^\d{4}-\d{2}-\d{2}T/.test(sub.startDate)) {
      s = parseDateIso(sub.startDate) || null;
    } else {
      s = parseDateInput(sub.startDate) || null;
    }
  }

  if (sub.endDate instanceof Date && !isNaN(sub.endDate.getTime())) {
    e = sub.endDate;
  } else if (typeof sub.endDate === "string") {
    if (/^\d{4}-\d{2}-\d{2}T/.test(sub.endDate)) {
      e = parseDateIso(sub.endDate) || null;
    } else {
      e = parseDateInput(sub.endDate) || null;
    }
  }

  return { ...sub, startDate: s, endDate: e };
}

/**
 * recalcMainTaskDates => if it has subtasks, unify the main's start/end to earliest / latest.
 */
function recalcMainTaskDates(task: TaskDoc): TaskDoc {
  const subs = task.subtasks ?? [];
  if (subs.length === 0) return task;

  let earliest: Date | null = null;
  let latest: Date | null = null;

  for (const sub of subs) {
    if (sub.startDate instanceof Date && !isNaN(sub.startDate.getTime())) {
      if (!earliest || sub.startDate < earliest) earliest = sub.startDate;
    }
    if (sub.endDate instanceof Date && !isNaN(sub.endDate.getTime())) {
      if (!latest || sub.endDate > latest) latest = sub.endDate;
    }
  }

  if (earliest && latest) {
    task.startDate = earliest;
    task.endDate = latest;
    task.durationDays = computeWorkingDaysCount(
      earliest,
      latest,
      BLOCKED_WEEKDAYS,
      BLOCKED_DATES
    );
  }
  return task;
}

export default function TasksListPage() {
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };

  const [tasks, setTasks] = useState<TaskDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showContent, setShowContent] = useState(false);

  // For drag & drop
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // For "Add Main Task"
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskStart, setNewTaskStart] = useState("");
  const [newTaskEnd, setNewTaskEnd] = useState("");
  const [newTaskDuration, setNewTaskDuration] = useState(0);

  // ---------- LOAD TASKS ----------
  useEffect(() => {
    async function load() {
      try {
        if (!orgId || !projectId || !subProjectId) return;
        let data = await fetchAllTasks(orgId, projectId, subProjectId);

        // Coerce main + subtask dates
        data = data.map((t) => {
          const coerced = coerceTaskDates(t);
          const subs = (coerced.subtasks ?? []).map(coerceSubtaskDates);
          return { ...coerced, subtasks: subs };
        });

        // Sort by orderIndex if present
        data.sort((a, b) => {
          const aOrder = (a as any).orderIndex ?? 99999;
          const bOrder = (b as any).orderIndex ?? 99999;
          return aOrder - bOrder;
        });

        setTasks(data);
      } catch (err: any) {
        console.error("Fetch tasks error:", err);
        setError("Failed to load tasks.");
      } finally {
        setLoading(false);
        // fade in
        setTimeout(() => setShowContent(true), 100);
      }
    }
    setLoading(true);
    load();
  }, [orgId, projectId, subProjectId]);

  // ---------- MAIN TASKS ----------
  function handleChangeTask(taskId: string, field: keyof TaskDoc, value: any) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const updated = { ...t };

        // If it has subtasks => main start/end read-only
        if ((field === "startDate" || field === "endDate") && updated.subtasks?.length) {
          return recalcMainTaskDates(updated);
        }

        if (field === "startDate") {
          const parsed = parseDateInput(value);
          updated.startDate = parsed;
          if (updated.endDate && parsed) {
            updated.durationDays = computeWorkingDaysCount(
              parsed,
              updated.endDate,
              BLOCKED_WEEKDAYS,
              BLOCKED_DATES
            );
          }
        } else if (field === "endDate") {
          const parsed = parseDateInput(value);
          updated.endDate = parsed;
          if (updated.startDate && parsed) {
            updated.durationDays = computeWorkingDaysCount(
              updated.startDate,
              parsed,
              BLOCKED_WEEKDAYS,
              BLOCKED_DATES
            );
          }
        } else if (field === "durationDays") {
          const dur = Number(value);
          updated.durationDays = dur;
          if (updated.startDate) {
            updated.endDate = computeEndDateIgnoringBlocked(
              updated.startDate,
              dur,
              BLOCKED_WEEKDAYS,
              BLOCKED_DATES
            );
          }
        } else {
          (updated as any)[field] = value;
        }

        return recalcMainTaskDates(updated);
      })
    );
  }

  async function handleBlurSave(task: TaskDoc) {
    try {
      await updateTask(orgId, projectId, subProjectId, task.id, task);
    } catch (err: any) {
      console.error("Error updating main task:", err);
      setError("Failed to update task.");
    }
  }

  async function handleDeleteTask(taskId: string) {
    try {
      await deleteTask(orgId, projectId, subProjectId, taskId);
      setTasks((prev) => prev.filter((x) => x.id !== taskId));
    } catch (err: any) {
      console.error("Delete task error:", err);
      setError("Failed to delete task.");
    }
  }

  async function handleAddMainTask(e: FormEvent) {
    e.preventDefault();
    try {
      const sDate = parseDateInput(newTaskStart) || null;
      const eDate = parseDateInput(newTaskEnd) || null;
      let duration = 0;
      if (sDate && eDate) {
        duration = computeWorkingDaysCount(sDate, eDate, BLOCKED_WEEKDAYS, BLOCKED_DATES);
      }

      const orderIndex = tasks.length;

      const newData: Partial<TaskDoc> = {
        title: newTaskTitle || "Untitled Task",
        assignedTo: newTaskAssignedTo,
        description: newTaskDescription,
        startDate: sDate,
        endDate: eDate,
        durationDays: duration,
        subtasks: [],
        status: "notStarted",
        orderIndex,
      };

      const newId = await createTask(orgId, projectId, subProjectId, newData as TaskDoc);
      setTasks((prev) => [...prev, { ...newData, id: newId } as TaskDoc]);

      // Clear
      setNewTaskTitle("");
      setNewTaskAssignedTo("");
      setNewTaskDescription("");
      setNewTaskStart("");
      setNewTaskEnd("");
      setNewTaskDuration(0);
    } catch (err: any) {
      console.error("Create main task error:", err);
      setError("Failed to create new task.");
    }
  }

  // ---------- SUBTASKS ----------
  function handleAddSubtask(taskId: string) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const newSub: SubTask = {
          id: "sub-" + Date.now(),
          title: "New Subtask",
          assignedTo: "",
          description: "",
          startDate: null,
          endDate: null,
          durationDays: 0,
          status: "notStarted",
        };
        const subs = t.subtasks ?? [];
        const newSubs = [...subs, newSub];
        return recalcMainTaskDates({ ...t, subtasks: newSubs });
      })
    );
  }

  function handleChangeSubtask(
    taskId: string,
    subId: string,
    field: keyof SubTask,
    value: any
  ) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const subs = t.subtasks ?? [];
        const newSubs = subs.map((sub) => {
          if (sub.id !== subId) return sub;
          const changed = { ...sub };

          if (field === "startDate") {
            const parsed = parseDateInput(value);
            changed.startDate = parsed || null;
            if (changed.endDate && parsed) {
              changed.durationDays = computeWorkingDaysCount(
                parsed,
                changed.endDate,
                BLOCKED_WEEKDAYS,
                BLOCKED_DATES
              );
            }
          } else if (field === "endDate") {
            const parsed = parseDateInput(value);
            changed.endDate = parsed || null;
            if (changed.startDate && parsed) {
              changed.durationDays = computeWorkingDaysCount(
                changed.startDate,
                parsed,
                BLOCKED_WEEKDAYS,
                BLOCKED_DATES
              );
            }
          } else if (field === "durationDays") {
            const dur = Number(value);
            changed.durationDays = dur;
            if (changed.startDate) {
              changed.endDate = computeEndDateIgnoringBlocked(
                changed.startDate,
                dur,
                BLOCKED_WEEKDAYS,
                BLOCKED_DATES
              );
            }
          } else {
            (changed as any)[field] = value;
          }
          return changed;
        });

        const updated = { ...t, subtasks: newSubs };
        return recalcMainTaskDates(updated);
      })
    );
  }

  async function handleBlurSubtaskSave(task: TaskDoc) {
    try {
      await updateTask(orgId, projectId, subProjectId, task.id, task);
    } catch (err: any) {
      console.error("Error updating subtask:", err);
      setError("Failed to update subtask.");
    }
  }

  async function handleDeleteSubtask(taskId: string, subId: string) {
    // local
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const subs = t.subtasks ?? [];
        const updated = { ...t, subtasks: subs.filter((s) => s.id !== subId) };
        return recalcMainTaskDates(updated);
      })
    );
    // firestore
    const found = tasks.find((x) => x.id === taskId);
    if (found) {
      const subs = found.subtasks ?? [];
      const after = { ...found, subtasks: subs.filter((s) => s.id !== subId) };
      try {
        await updateTask(orgId, projectId, subProjectId, found.id, after);
      } catch (err: any) {
        console.error("Error deleting subtask in Firestore:", err);
        setError("Failed to delete subtask in Firestore.");
      }
    }
  }

  // ---------- DRAG & DROP + ORDER SAVING ----------
  function handleDragStart(e: DragEvent<HTMLTableRowElement>, taskId: string) {
    setDraggedTaskId(taskId);
  }

  function handleDragOver(e: DragEvent<HTMLTableRowElement>) {
    e.preventDefault();
  }

  async function handleDrop(e: DragEvent<HTMLTableRowElement>, targetTaskId: string) {
    e.preventDefault();
    if (!draggedTaskId || draggedTaskId === targetTaskId) {
      setDraggedTaskId(null);
      return;
    }
    const newList = [...tasks];
    const oldIndex = newList.findIndex((t) => t.id === draggedTaskId);
    const newIndex = newList.findIndex((t) => t.id === targetTaskId);
    if (oldIndex < 0 || newIndex < 0) {
      setDraggedTaskId(null);
      return;
    }
    const [moved] = newList.splice(oldIndex, 1);
    newList.splice(newIndex, 0, moved);

    newList.forEach((t, idx) => {
      (t as any).orderIndex = idx;
    });

    setTasks(newList);
    setDraggedTaskId(null);

    // Batch update
    try {
      for (const t of newList) {
        await updateTask(orgId, projectId, subProjectId, t.id, t);
      }
    } catch (err: any) {
      console.error("Error updating tasks order in Firestore:", err);
      setError("Failed to save new task order.");
    }
  }

  // ---------- RENDERING ----------
  function renderTaskRow(task: TaskDoc, index: number) {
    const subs = task.subtasks ?? [];
    const hasSubs = subs.length > 0;
    const isReadOnly = hasSubs;

    return (
      <React.Fragment key={task.id}>
        {/* MAIN TASK ROW */}
        <tr
          draggable
          onDragStart={(e) => handleDragStart(e, task.id)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, task.id)}
          className="border-b border-neutral-700 hover:bg-neutral-800"
        >
          {/* # */}
          <td className="px-4 py-3 font-bold text-center select-none w-[50px]">
            {index + 1}
          </td>

          {/* Task Title */}
          <td className="px-4 py-3 w-[150px]">
            <input
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100"
              placeholder="Task Title"
              value={task.title || ""}
              onChange={(e) => handleChangeTask(task.id, "title", e.target.value)}
              onBlur={() => handleBlurSave(task)}
            />
          </td>

          {/* Assigned To */}
          <td className="px-4 py-3 w-[150px]">
            <input
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100"
              placeholder="Assigned To"
              value={task.assignedTo || ""}
              onChange={(e) => handleChangeTask(task.id, "assignedTo", e.target.value)}
              onBlur={() => handleBlurSave(task)}
            />
          </td>

          {/* Description */}
          <td className="px-4 py-3 w-[220px]">
            <input
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100"
              placeholder="Description"
              value={task.description || ""}
              onChange={(e) => handleChangeTask(task.id, "description", e.target.value)}
              onBlur={() => handleBlurSave(task)}
            />
          </td>

          {/* Start (read-only if sub) */}
          <td className="px-4 py-3 w-[150px]">
            <input
              type="date"
              disabled={isReadOnly}
              className={`w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100 ${
                isReadOnly ? "opacity-60 cursor-not-allowed" : ""
              }`}
              value={task.startDate ? toDateInputValue(task.startDate) : ""}
              onChange={(e) => handleChangeTask(task.id, "startDate", e.target.value)}
              onBlur={() => handleBlurSave(task)}
            />
          </td>

          {/* End (read-only if sub) */}
          <td className="px-4 py-3 w-[150px]">
            <input
              type="date"
              disabled={isReadOnly}
              className={`w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100 ${
                isReadOnly ? "opacity-60 cursor-not-allowed" : ""
              }`}
              value={task.endDate ? toDateInputValue(task.endDate) : ""}
              onChange={(e) => handleChangeTask(task.id, "endDate", e.target.value)}
              onBlur={() => handleBlurSave(task)}
            />
          </td>

          {/* Duration */}
          <td className="px-4 py-3 w-[100px]">
            <input
              type="number"
              disabled={isReadOnly}
              className={`w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100 ${
                isReadOnly ? "opacity-60 cursor-not-allowed" : ""
              }`}
              placeholder="0"
              value={task.durationDays ?? 0}
              onChange={(e) => handleChangeTask(task.id, "durationDays", e.target.value)}
              onBlur={() => handleBlurSave(task)}
            />
          </td>

          {/* Status Dropdown */}
          <td className="px-4 py-3 w-[120px]">
            <select
              className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100"
              value={task.status || "notStarted"}
              onChange={(e) => handleChangeTask(task.id, "status", e.target.value)}
              onBlur={() => handleBlurSave(task)}
            >
              <option value="notStarted">Not Started</option>
              <option value="inProgress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="delayed">Delayed</option>
            </select>
          </td>

          {/* Actions */}
          <td className="px-4 py-3 text-right w-[120px]">
            <div className="flex gap-2 justify-end">
              <GrayButton
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1"
                onClick={() => handleAddSubtask(task.id)}
              >
                + Subtask
              </GrayButton>

              <GrayButton
                className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1"
                onClick={() => handleDeleteTask(task.id)}
              >
                Delete
              </GrayButton>
            </div>
          </td>
        </tr>

        {/* Subtask Rows */}
        {subs.map((sub) => (
          <tr key={sub.id} className="border-b border-neutral-700 hover:bg-neutral-800">
            <td />

            {/* Subtask Title */}
            <td className="px-4 py-2 pl-8">
              <input
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100 italic"
                placeholder="Subtask Title"
                value={sub.title}
                onChange={(e) =>
                  handleChangeSubtask(task.id, sub.id, "title", e.target.value)
                }
                onBlur={() => handleBlurSubtaskSave(task)}
              />
            </td>

            {/* Subtask AssignedTo */}
            <td className="px-4 py-2">
              <input
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100 italic"
                placeholder="Assigned To"
                value={sub.assignedTo || ""}
                onChange={(e) =>
                  handleChangeSubtask(task.id, sub.id, "assignedTo", e.target.value)
                }
                onBlur={() => handleBlurSubtaskSave(task)}
              />
            </td>

            {/* Subtask Description */}
            <td className="px-4 py-2">
              <input
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100 italic"
                placeholder="Description"
                value={sub.description || ""}
                onChange={(e) =>
                  handleChangeSubtask(task.id, sub.id, "description", e.target.value)
                }
                onBlur={() => handleBlurSubtaskSave(task)}
              />
            </td>

            {/* Subtask Start */}
            <td className="px-4 py-2">
              <input
                type="date"
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100 italic"
                value={sub.startDate ? toDateInputValue(sub.startDate) : ""}
                onChange={(e) =>
                  handleChangeSubtask(task.id, sub.id, "startDate", e.target.value)
                }
                onBlur={() => handleBlurSubtaskSave(task)}
              />
            </td>

            {/* Subtask End */}
            <td className="px-4 py-2">
              <input
                type="date"
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100 italic"
                value={sub.endDate ? toDateInputValue(sub.endDate) : ""}
                onChange={(e) =>
                  handleChangeSubtask(task.id, sub.id, "endDate", e.target.value)
                }
                onBlur={() => handleBlurSubtaskSave(task)}
              />
            </td>

            {/* Subtask Duration */}
            <td className="px-4 py-2">
              <input
                type="number"
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100 italic"
                placeholder="0"
                value={sub.durationDays ?? 0}
                onChange={(e) =>
                  handleChangeSubtask(task.id, sub.id, "durationDays", e.target.value)
                }
                onBlur={() => handleBlurSubtaskSave(task)}
              />
            </td>

            {/* Subtask Status */}
            <td className="px-4 py-2">
              <div className="flex gap-2 items-center justify-end">
                <select
                  className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100 italic"
                  value={sub.status || "notStarted"}
                  onChange={(e) =>
                    handleChangeSubtask(task.id, sub.id, "status", e.target.value)
                  }
                  onBlur={() => handleBlurSubtaskSave(task)}
                >
                  <option value="notStarted">Not Started</option>
                  <option value="inProgress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="delayed">Delayed</option>
                </select>

                <GrayButton
                  className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1"
                  onClick={() => handleDeleteSubtask(task.id, sub.id)}
                >
                  Remove
                </GrayButton>
              </div>
            </td>
          </tr>
        ))}
      </React.Fragment>
    );
  }

  if (loading) {
    return <PageContainer>Loading tasks...</PageContainer>;
  }
  if (error) {
    return (
      <PageContainer>
        <p className="text-red-500">{error}</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="dark:bg-neutral-900 dark:text-neutral-100 max-w-full">
      <TasksHeaderNav orgId={orgId} projectId={projectId} subProjectId={subProjectId} />

      <h1 className="text-3xl font-bold mt-4">Tasks</h1>

      <div
        className={`
          opacity-0 transition-all duration-500 ease-out delay-[100ms]
          ${showContent ? "opacity-100 translate-y-0" : "translate-y-4"}
        `}
      >
        <ScrollableCard className="mt-4">
          <table className="min-w-[1700px] border border-neutral-700 text-base">
            <thead className="sticky top-0 bg-neutral-800 text-neutral-100">
              <tr>
                <th className="px-4 py-3 text-left font-semibold w-[50px] border-b border-neutral-700">
                  #
                </th>
                <th className="px-4 py-3 text-left font-semibold w-[150px] border-b border-neutral-700">
                  Task Name
                </th>
                <th className="px-4 py-3 text-left font-semibold w-[150px] border-b border-neutral-700">
                  Assigned To
                </th>
                <th className="px-4 py-3 text-left font-semibold w-[220px] border-b border-neutral-700">
                  Description
                </th>
                <th className="px-4 py-3 text-left font-semibold w-[150px] border-b border-neutral-700">
                  Start
                </th>
                <th className="px-4 py-3 text-left font-semibold w-[150px] border-b border-neutral-700">
                  Finish
                </th>
                <th className="px-4 py-3 text-left font-semibold w-[100px] border-b border-neutral-700">
                  Duration
                </th>
                <th className="px-4 py-3 text-left font-semibold w-[120px] border-b border-neutral-700">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-semibold w-[120px] border-b border-neutral-700">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {tasks.map((task, i) => renderTaskRow(task, i))}

              {/* ADD NEW MAIN TASK */}
              <tr className="border-t border-neutral-700 bg-neutral-800 hover:bg-neutral-700">
                <td className="px-4 py-3 font-bold text-center">+</td>

                <td className="px-4 py-3">
                  <input
                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100"
                    placeholder="New Task Title"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                  />
                </td>

                <td className="px-4 py-3">
                  <input
                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100"
                    placeholder="Assigned To"
                    value={newTaskAssignedTo}
                    onChange={(e) => setNewTaskAssignedTo(e.target.value)}
                  />
                </td>

                <td className="px-4 py-3">
                  <input
                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100"
                    placeholder="Description"
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                  />
                </td>

                <td className="px-4 py-3">
                  <input
                    type="date"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100"
                    value={newTaskStart}
                    onChange={(e) => setNewTaskStart(e.target.value)}
                  />
                </td>

                <td className="px-4 py-3">
                  <input
                    type="date"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100"
                    value={newTaskEnd}
                    onChange={(e) => setNewTaskEnd(e.target.value)}
                  />
                </td>

                <td className="px-4 py-3">
                  <input
                    type="number"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100"
                    placeholder="0"
                    value={newTaskDuration}
                    onChange={(e) => setNewTaskDuration(Number(e.target.value))}
                  />
                </td>

                <td className="px-4 py-3">(defaults to "notStarted")</td>

                <td className="px-4 py-3 text-right">
                  <GrayButton
                    className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-2"
                    onClick={handleAddMainTask}
                  >
                    + Add Task
                  </GrayButton>
                </td>
              </tr>
            </tbody>
          </table>
        </ScrollableCard>
      </div>
    </PageContainer>
  );
}
