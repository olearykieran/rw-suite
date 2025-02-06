"use client";

import React, {
  useEffect,
  useState,
  DragEvent,
  FormEvent,
  HTMLAttributes,
  ReactNode,
} from "react";
import { useParams } from "next/navigation";

import {
  TaskDoc,
  fetchAllTasks,
  createTask,
  updateTask,
  deleteTask,
} from "@/lib/services/TaskService";

import { PageContainer } from "@/components/ui/PageContainer";
import TasksHeaderNav from "@/components/TasksHeaderNav";
import { GrayButton } from "@/components/ui/GrayButton";

/** A scrollable container for your table */
function ScrollableCard({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return (
    <section
      {...props}
      className={`
        dark:bg-neutral-900 bg-neutral-900
        dark:text-neutral-100 text-white
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

// Example: skip weekends + a holiday
const BLOCKED_WEEKDAYS = [0, 6];
const BLOCKED_DATES = ["2024-01-01"];

/** computeWorkingDaysCount => skip blocked days */
function computeWorkingDaysCount(
  start: Date,
  end: Date,
  blockedWeekdays: number[],
  blockedDates: string[]
): number {
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

/** computeEndDateIgnoringBlocked => recalc end date from start + duration ignoring blocked */
function computeEndDateIgnoringBlocked(
  start: Date,
  durationDays: number,
  blockedWeekdays: number[],
  blockedDates: string[]
): Date {
  if (durationDays <= 0) return new Date(start);
  let remaining = durationDays;
  const cur = new Date(start.getTime());
  remaining -= 1;

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

/** parseDateInput => interpret "YYYY-MM-DD" as local date at midnight */
function parseDateInput(val: string): Date | null {
  if (!val) return null;
  const [yyyy, mm, dd] = val.split("-").map(Number);
  if (!yyyy || !mm || !dd) return null;
  return new Date(yyyy, mm - 1, dd, 0, 0, 0);
}

/** parseDateIso => parse "2025-01-20T05:00:00.000Z" => Date or null */
function parseDateIso(val: string): Date | null {
  const dt = new Date(val);
  if (isNaN(dt.getTime())) return null;
  return dt;
}

/** toDateInputValue => "YYYY-MM-DD" */
function toDateInputValue(dt?: Date | null): string {
  if (!dt || isNaN(dt.getTime())) return "";
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** coerceTaskDates => handle strings, Firestore Timestamps, etc. */
function coerceTaskDates(task: TaskDoc): TaskDoc {
  let s: Date | null = null;
  let e: Date | null = null;

  // parse start
  if (task.startDate instanceof Date) {
    s = task.startDate;
  } else if (
    typeof task.startDate === "string" &&
    /^\d{4}-\d{2}-\d{2}T/.test(task.startDate)
  ) {
    s = parseDateIso(task.startDate);
  } else if (typeof task.startDate === "string") {
    s = parseDateInput(task.startDate);
  }

  // parse end
  if (task.endDate instanceof Date) {
    e = task.endDate;
  } else if (
    typeof task.endDate === "string" &&
    /^\d{4}-\d{2}-\d{2}T/.test(task.endDate)
  ) {
    e = parseDateIso(task.endDate);
  } else if (typeof task.endDate === "string") {
    e = parseDateInput(task.endDate);
  }

  return { ...task, startDate: s, endDate: e };
}

/**
 * If a subtask changes, you might want to recalc its parent's earliest start & latest end.
 * We'll do that only if you want the parent to reflect subtask dates in the UI.
 * For now, let's keep it simple. We can add a "recalcMainDates()" if needed.
 */

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

  // For drag+drop ordering
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // For “Add Main Task” form
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskStart, setNewTaskStart] = useState("");
  const [newTaskEnd, setNewTaskEnd] = useState("");
  const [newTaskDuration, setNewTaskDuration] = useState(0);

  // ---------- LOAD TASKS ----------
  useEffect(() => {
    if (!orgId || !projectId || !subProjectId) return;
    loadTasks();
  }, [orgId, projectId, subProjectId]);

  async function loadTasks() {
    try {
      setLoading(true);
      let data = await fetchAllTasks(orgId, projectId, subProjectId);

      // coerce date fields
      data = data.map(coerceTaskDates);

      // sort by orderIndex if present
      data.sort((a, b) => {
        const aOrder = a.orderIndex ?? 99999;
        const bOrder = b.orderIndex ?? 99999;
        return aOrder - bOrder;
      });

      setTasks(data);
    } catch (err: any) {
      console.error("Fetch tasks error:", err);
      setError("Failed to load tasks.");
    } finally {
      setLoading(false);
      setTimeout(() => setShowContent(true), 100);
    }
  }

  // ---------- MAIN TASKS ----------
  function handleChangeTask(taskId: string, field: keyof TaskDoc, value: any) {
    // Update local state
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const updated = { ...t };

        if (field === "startDate") {
          const parsed = parseDateInput(value);
          updated.startDate = parsed || null;
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
          updated.endDate = parsed || null;
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

        return updated;
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
        title: newTaskTitle || "Untitled",
        assignedTo: newTaskAssignedTo,
        description: newTaskDescription,
        startDate: sDate,
        endDate: eDate,
        durationDays: duration,
        status: "notStarted",
        orderIndex,
        isSubtask: false,
        subtaskIds: [], // main tasks can keep an array of child IDs
      };

      const newId = await createTask(orgId, projectId, subProjectId, newData as TaskDoc);
      setTasks((prev) => [...prev, { ...newData, id: newId } as TaskDoc]);

      // Clear form
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
  /** handleAddSubtask => create a new doc with isSubtask=true, parentId=main.id,
   *  then push the child's docId into main.subtaskIds
   */
  async function handleAddSubtask(mainTask: TaskDoc) {
    try {
      const orderIndex = tasks.length;
      const newData: Partial<TaskDoc> = {
        title: "New Subtask",
        assignedTo: "",
        description: "",
        startDate: null,
        endDate: null,
        durationDays: 0,
        status: "notStarted",
        orderIndex,
        isSubtask: true,
        parentId: mainTask.id,
      };

      // create subtask doc
      const newId = await createTask(orgId, projectId, subProjectId, newData as TaskDoc);

      // Locally add it to tasks
      setTasks((prev) => {
        // Add child doc
        const childDoc = { ...newData, id: newId } as TaskDoc;
        // Update parent's subtaskIds
        const updatedArr = prev.map((t) => {
          if (t.id === mainTask.id) {
            const newSubIds = [...(t.subtaskIds || []), newId];
            return { ...t, subtaskIds: newSubIds };
          }
          return t;
        });
        return [...updatedArr, childDoc];
      });

      // Firestore => push child's doc ID into mainTask.subtaskIds
      const mainNewSubIds = [...(mainTask.subtaskIds || []), newId];
      await updateTask(orgId, projectId, subProjectId, mainTask.id, {
        subtaskIds: mainNewSubIds,
      });
    } catch (err: any) {
      console.error("handleAddSubtask error:", err);
      setError("Failed to add subtask.");
    }
  }

  async function handleDeleteSubtask(parent: TaskDoc, subTaskId: string) {
    try {
      // remove from parent's subtaskIds
      const newSubs = (parent.subtaskIds || []).filter((id) => id !== subTaskId);
      await updateTask(orgId, projectId, subProjectId, parent.id, {
        subtaskIds: newSubs,
      });

      // delete child doc
      await deleteTask(orgId, projectId, subProjectId, subTaskId);

      // update local
      setTasks((prev) => {
        // remove child doc
        const filtered = prev.filter((x) => x.id !== subTaskId);
        // also update parent's subtaskIds
        return filtered.map((t) => {
          if (t.id === parent.id) {
            return { ...t, subtaskIds: newSubs };
          }
          return t;
        });
      });
    } catch (err: any) {
      console.error("Delete subtask error:", err);
      setError("Failed to delete subtask.");
    }
  }

  // ---------- DRAG & DROP reordering ----------
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
      t.orderIndex = idx;
    });

    setTasks(newList);
    setDraggedTaskId(null);

    // batch update Firestore
    for (const t of newList) {
      try {
        await updateTask(orgId, projectId, subProjectId, t.id, {
          orderIndex: t.orderIndex,
        });
      } catch (err: any) {
        console.error("Error saving new task order:", err);
        setError("Failed to save new task order.");
      }
    }
  }

  // ========== Render Rows ==========

  /**
   * For a given main task, we look at main.subtaskIds -> child doc IDs,
   * then find them in the tasks[] array. We'll nest them below the main.
   */
  function renderMainTaskWithSubs(task: TaskDoc, index: number) {
    const childIds = task.subtaskIds || [];
    const children = tasks.filter((t) => childIds.includes(t.id));

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

          {/* Title */}
          <td className="px-4 py-3 w-[150px]">
            <input
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100"
              placeholder="Task Title"
              value={task.title}
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

          {/* Start */}
          <td className="px-4 py-3 w-[150px]">
            <input
              type="date"
              className={`w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100`}
              value={task.startDate ? toDateInputValue(task.startDate) : ""}
              onChange={(e) => handleChangeTask(task.id, "startDate", e.target.value)}
              onBlur={() => handleBlurSave(task)}
            />
          </td>

          {/* End */}
          <td className="px-4 py-3 w-[150px]">
            <input
              type="date"
              className={`w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100`}
              value={task.endDate ? toDateInputValue(task.endDate) : ""}
              onChange={(e) => handleChangeTask(task.id, "endDate", e.target.value)}
              onBlur={() => handleBlurSave(task)}
            />
          </td>

          {/* Duration */}
          <td className="px-4 py-3 w-[100px]">
            <input
              type="number"
              className={`w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100`}
              placeholder="0"
              value={task.durationDays ?? 0}
              onChange={(e) => handleChangeTask(task.id, "durationDays", e.target.value)}
              onBlur={() => handleBlurSave(task)}
            />
          </td>

          {/* Status */}
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
                onClick={() => handleAddSubtask(task)}
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
        {children.map((child) => (
          <tr
            key={child.id}
            className="border-b border-neutral-700 hover:bg-neutral-800"
            draggable
            onDragStart={(e) => handleDragStart(e, child.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, child.id)}
          >
            <td />
            {/* Subtask Title */}
            <td className="px-4 py-2 pl-8">
              <input
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100 italic"
                placeholder="Subtask Title"
                value={child.title}
                onChange={(e) => handleChangeTask(child.id, "title", e.target.value)}
                onBlur={() => handleBlurSave(child)}
              />
            </td>

            {/* Subtask AssignedTo */}
            <td className="px-4 py-2">
              <input
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100 italic"
                placeholder="Assigned To"
                value={child.assignedTo || ""}
                onChange={(e) => handleChangeTask(child.id, "assignedTo", e.target.value)}
                onBlur={() => handleBlurSave(child)}
              />
            </td>

            {/* Subtask Description */}
            <td className="px-4 py-2">
              <input
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100 italic"
                placeholder="Description"
                value={child.description || ""}
                onChange={(e) =>
                  handleChangeTask(child.id, "description", e.target.value)
                }
                onBlur={() => handleBlurSave(child)}
              />
            </td>

            {/* Subtask Start */}
            <td className="px-4 py-2">
              <input
                type="date"
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100 italic"
                value={child.startDate ? toDateInputValue(child.startDate) : ""}
                onChange={(e) => handleChangeTask(child.id, "startDate", e.target.value)}
                onBlur={() => handleBlurSave(child)}
              />
            </td>

            {/* Subtask End */}
            <td className="px-4 py-2">
              <input
                type="date"
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100 italic"
                value={child.endDate ? toDateInputValue(child.endDate) : ""}
                onChange={(e) => handleChangeTask(child.id, "endDate", e.target.value)}
                onBlur={() => handleBlurSave(child)}
              />
            </td>

            {/* Subtask Duration */}
            <td className="px-4 py-2">
              <input
                type="number"
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100 italic"
                placeholder="0"
                value={child.durationDays ?? 0}
                onChange={(e) =>
                  handleChangeTask(child.id, "durationDays", e.target.value)
                }
                onBlur={() => handleBlurSave(child)}
              />
            </td>

            {/* Subtask Status */}
            <td className="px-4 py-2">
              <select
                className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100 italic"
                value={child.status || "notStarted"}
                onChange={(e) => handleChangeTask(child.id, "status", e.target.value)}
                onBlur={() => handleBlurSave(child)}
              >
                <option value="notStarted">Not Started</option>
                <option value="inProgress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="delayed">Delayed</option>
              </select>
            </td>

            {/* Subtask Action */}
            <td className="px-4 py-2 text-right">
              <GrayButton
                className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1"
                onClick={() => handleDeleteSubtask(task, child.id)}
              >
                Remove
              </GrayButton>
            </td>
          </tr>
        ))}
      </React.Fragment>
    );
  }

  // ---------- Render ----------
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

  // Gather main tasks (isSubtask=false)
  const mainTasks = tasks.filter((t) => !t.isSubtask);

  return (
    <PageContainer className="dark:bg-neutral-900 dark:text-neutral-100 max-w-full">
      <TasksHeaderNav orgId={orgId} projectId={projectId} subProjectId={subProjectId} />

      <h1 className="text-3xl font-bold mt-4">Tasks List</h1>

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
              {mainTasks.map((task, i) => renderMainTaskWithSubs(task, i))}

              {/* ADD NEW MAIN TASK ROW */}
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
