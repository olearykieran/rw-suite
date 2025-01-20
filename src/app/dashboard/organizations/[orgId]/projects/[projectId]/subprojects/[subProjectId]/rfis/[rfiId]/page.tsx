"use client";

import React, { useEffect, useState, useRef, FormEvent, DragEvent } from "react";
import { useParams } from "next/navigation";
import {
  TaskDoc,
  SubTask,
  fetchAllTasks,
  fetchTask,
  createTask,
  updateTask,
  deleteTask,
} from "@/lib/services/TaskService";

import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import TasksHeaderNav from "@/components/TasksHeaderNav";
import { GrayButton } from "@/components/ui/GrayButton";

import gantt from "dhtmlx-gantt";
import "dhtmlx-gantt/codebase/dhtmlxgantt.css";

/**
 * We'll define custom CSS classes for blocked columns,
 * e.g. `.gantt_inactive_day` for the day scale + timeline cells we want grayed out.
 *
 * In your global CSS or <style jsx global>:
 *
 * .gantt_inactive_day {
 *   background-color: rgba(120,120,120,0.5) !important;
 * }
 */

// ---------- Types for Gantt items ----------
interface DhtmlxTaskItem {
  id: string | number;
  text: string;
  start_date: string; // e.g. "2025-01-10 00:00"
  end_date: string; // e.g. "2025-01-20 00:00"
  parent?: string | number;
}

interface DhtmlxLink {
  id: string | number;
  source: string | number;
  target: string | number;
  type: number; // 0 => finish-to-start
}

interface DhtmlxGanttData {
  data: DhtmlxTaskItem[];
  links: DhtmlxLink[];
}

/** Helper: convert a Firestore/Date to "YYYY-MM-DD HH:mm" local-midnight */
function safeDateString(val: any): string {
  if (!val) return "2024-01-01 00:00";
  let d: Date;
  if (val instanceof Date) {
    d = val;
  } else if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
    d = new Date(val);
  } else if (val && typeof val === "object" && "seconds" in val) {
    d = new Date(val.seconds * 1000);
  } else {
    d = new Date("2024-01-01T00:00:00");
  }
  if (isNaN(d.getTime())) return "2024-01-01 00:00";
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd} 00:00`;
}

/** Build the Gantt data from your Firestore tasks, respecting orderIndex. */
function buildGanttData(taskDocs: TaskDoc[]): DhtmlxGanttData {
  const data: DhtmlxTaskItem[] = [];
  const links: DhtmlxLink[] = [];

  for (const main of taskDocs) {
    data.push({
      id: main.id,
      text: main.title,
      start_date: safeDateString(main.startDate),
      end_date: safeDateString(main.endDate),
      parent: "0",
    });

    if (main.predecessors?.length) {
      for (const pred of main.predecessors) {
        links.push({
          id: `${pred}->${main.id}`,
          source: pred,
          target: main.id,
          type: 0,
        });
      }
    }

    if (main.subtasks?.length) {
      for (const sub of main.subtasks) {
        data.push({
          id: sub.id,
          text: sub.title,
          start_date: safeDateString(sub.startDate),
          end_date: safeDateString(sub.endDate),
          parent: main.id,
        });

        if (sub.predecessors?.length) {
          for (const sp of sub.predecessors) {
            links.push({
              id: `${sp}->${sub.id}`,
              source: sp,
              target: sub.id,
              type: 0,
            });
          }
        }
      }
    }
  }

  return { data, links };
}

/** A scrollable card for the main tasks table. */
function ScrollableCard({ children }: { children: React.ReactNode }) {
  return (
    <section
      className={`
        dark:bg-neutral-900 bg-white
        dark:text-neutral-100 text-black
        border border-neutral-700 dark:border-neutral-800
        rounded-lg
        p-6
        w-full
        h-[calc(100vh-200px)]
        overflow-auto
      `}
    >
      {children}
    </section>
  );
}

// We skip weekends + a holiday
const DEFAULT_BLOCKED_WEEKDAYS = [0, 6];
const DEFAULT_BLOCKED_DATES = ["2024-01-01"];

// ---------- The main Gantt page (and table) ----------
export default function TasksGanttPage() {
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };

  const [tasks, setTasks] = useState<TaskDoc[]>([]);
  const [ganttData, setGanttData] = useState<DhtmlxGanttData>({ data: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showContent, setShowContent] = useState(false);

  // For blocking out weekends, etc.
  const [blockedWeekdays, setBlockedWeekdays] = useState<number[]>(
    DEFAULT_BLOCKED_WEEKDAYS
  );
  const [blockedDates, setBlockedDates] = useState<string[]>(DEFAULT_BLOCKED_DATES);

  // For table reorder
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // For "Add Main Task"
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskStart, setNewTaskStart] = useState("");
  const [newTaskEnd, setNewTaskEnd] = useState("");
  const [newTaskDuration, setNewTaskDuration] = useState(0);

  // ---------- 1) Load tasks from Firestore once ----------
  useEffect(() => {
    if (!orgId || !projectId || !subProjectId) return;
    loadEverything();
  }, [orgId, projectId, subProjectId]);

  async function loadEverything() {
    try {
      setLoading(true);
      const all = await fetchAllTasks(orgId, projectId, subProjectId);

      // coerce main + subtask dates
      let data = all.map((t) => {
        // parse main
        let c = coerceTaskDates(t);
        // parse subs
        let s = (c.subtasks || []).map(coerceSubtaskDates);
        c = { ...c, subtasks: s };
        return c;
      });

      // sort by orderIndex
      data.sort((a, b) => {
        const aIdx = (a as any).orderIndex ?? 99999;
        const bIdx = (b as any).orderIndex ?? 99999;
        return aIdx - bIdx;
      });

      setTasks(data);
      setGanttData(buildGanttData(data));
    } catch (err: any) {
      console.error("Gantt fetch error:", err);
      setError(err.message || "Failed to load tasks for Gantt.");
    } finally {
      setLoading(false);
      setTimeout(() => setShowContent(true), 100);
    }
  }

  // ---------- 2) Gantt event handlers (dragging tasks, links, etc.) ----------

  // a) If user drags/resizes a bar => partial update
  async function handleGanttTaskUpdated(ganttTask: any) {
    try {
      const newStart = new Date(ganttTask.start_date);
      const newEnd = new Date(ganttTask.end_date);

      // If parent=0 => main
      if (String(ganttTask.parent) === "0") {
        await updateTask(orgId, projectId, subProjectId, String(ganttTask.id), {
          startDate: newStart,
          endDate: newEnd,
          title: ganttTask.text,
        });
      } else {
        // subtask => find parent
        const all = await fetchAllTasks(orgId, projectId, subProjectId);
        const parentDoc = all.find((m) =>
          m.subtasks?.some((s) => String(s.id) === String(ganttTask.id))
        );
        if (!parentDoc) return;

        const newSubs = (parentDoc.subtasks || []).map((sub) => {
          if (String(sub.id) === String(ganttTask.id)) {
            return {
              ...sub,
              startDate: newStart,
              endDate: newEnd,
              title: ganttTask.text,
            };
          }
          return sub;
        });
        await updateTask(orgId, projectId, subProjectId, parentDoc.id, {
          subtasks: newSubs,
        });
      }

      // reload
      await loadEverything();
    } catch (err: any) {
      console.error("handleGanttTaskUpdated error:", err);
      setError("Error updating => " + (err.message || ""));
    }
  }

  // b) If user adds a link => new dependency
  async function handleGanttLinkAdded(link: DhtmlxLink) {
    try {
      const predecessorId = String(link.source);
      const successorId = String(link.target);

      // same logic as your handleLinkAdded in previous code
      // partial updates -> then reload
      let predDoc = await fetchTask(orgId, projectId, subProjectId, predecessorId).catch(
        () => null
      );
      let succDoc = await fetchTask(orgId, projectId, subProjectId, successorId).catch(
        () => null
      );

      if (predDoc) {
        const newSucc = new Set(predDoc.successors || []);
        newSucc.add(successorId);
        await updateTask(orgId, projectId, subProjectId, predDoc.id, {
          successors: Array.from(newSucc),
        });
      } else {
        // sub
        const all = await fetchAllTasks(orgId, projectId, subProjectId);
        for (const m of all) {
          const subIdx = (m.subtasks || []).findIndex((s) => s.id === predecessorId);
          if (subIdx >= 0) {
            const subarray = [...(m.subtasks || [])];
            const old = subarray[subIdx];
            const newSucc = new Set(old.successors || []);
            newSucc.add(successorId);
            subarray[subIdx] = { ...old, successors: Array.from(newSucc) };
            await updateTask(orgId, projectId, subProjectId, m.id, {
              subtasks: subarray,
            });
            break;
          }
        }
      }

      // do the successor side => add predecessor
      if (succDoc) {
        const newPred = new Set(succDoc.predecessors || []);
        newPred.add(predecessorId);
        await updateTask(orgId, projectId, subProjectId, succDoc.id, {
          predecessors: Array.from(newPred),
        });
      } else {
        // sub
        const all = await fetchAllTasks(orgId, projectId, subProjectId);
        for (const m of all) {
          const subIdx = (m.subtasks || []).findIndex((s) => s.id === successorId);
          if (subIdx >= 0) {
            const subarray = [...(m.subtasks || [])];
            const old = subarray[subIdx];
            const newPred = new Set(old.predecessors || []);
            newPred.add(predecessorId);
            subarray[subIdx] = { ...old, predecessors: Array.from(newPred) };
            await updateTask(orgId, projectId, subProjectId, m.id, {
              subtasks: subarray,
            });
            break;
          }
        }
      }

      // reload
      await loadEverything();
    } catch (err: any) {
      console.error("handleGanttLinkAdded error:", err);
      setError("Error adding link => " + (err.message || ""));
    }
  }

  // c) If user deletes a link
  async function handleGanttLinkDeleted(link: DhtmlxLink) {
    try {
      const predecessorId = String(link.source);
      const successorId = String(link.target);

      // same logic as handleLinkDeleted previously
      // partial updates -> then reload
      let predDoc = await fetchTask(orgId, projectId, subProjectId, predecessorId).catch(
        () => null
      );
      if (predDoc) {
        const newSucc = new Set(predDoc.successors || []);
        newSucc.delete(successorId);
        await updateTask(orgId, projectId, subProjectId, predDoc.id, {
          successors: Array.from(newSucc),
        });
      } else {
        // sub
        const all = await fetchAllTasks(orgId, projectId, subProjectId);
        for (const m of all) {
          const subIdx = (m.subtasks || []).findIndex((s) => s.id === predecessorId);
          if (subIdx >= 0) {
            const subs = [...(m.subtasks || [])];
            const old = subs[subIdx];
            const newSucc = new Set(old.successors || []);
            newSucc.delete(successorId);
            subs[subIdx] = { ...old, successors: Array.from(newSucc) };
            await updateTask(orgId, projectId, subProjectId, m.id, { subtasks: subs });
            break;
          }
        }
      }

      // successor side
      let succDoc = await fetchTask(orgId, projectId, subProjectId, successorId).catch(
        () => null
      );
      if (succDoc) {
        const newPred = new Set(succDoc.predecessors || []);
        newPred.delete(predecessorId);
        await updateTask(orgId, projectId, subProjectId, succDoc.id, {
          predecessors: Array.from(newPred),
        });
      } else {
        // sub
        const all = await fetchAllTasks(orgId, projectId, subProjectId);
        for (const m of all) {
          const subIdx = (m.subtasks || []).findIndex((s) => s.id === successorId);
          if (subIdx >= 0) {
            const subs = [...(m.subtasks || [])];
            const old = subs[subIdx];
            const newPred = new Set(old.predecessors || []);
            newPred.delete(predecessorId);
            subs[subIdx] = { ...old, predecessors: Array.from(newPred) };
            await updateTask(orgId, projectId, subProjectId, m.id, { subtasks: subs });
            break;
          }
        }
      }

      // reload
      await loadEverything();
    } catch (err: any) {
      console.error("handleGanttLinkDeleted error:", err);
      setError("Error removing link => " + (err.message || ""));
    }
  }

  // ---------- 3) Gantt Component with custom "gray out columns" approach ----------
  function GanttChart() {
    const ganttContainer = useRef<HTMLDivElement>(null);

    useEffect(() => {
      gantt.clearAll();

      gantt.config.xml_date = "%Y-%m-%d %H:%i";
      gantt.config.scales = [
        { unit: "day", step: 1, format: "%d %M %Y" },
        { unit: "day", step: 1, format: "%D" },
      ];
      gantt.config.min_column_width = 50;

      // We disable highlight_non_working_time if it's not working well for you
      // We'll do a "gray out" approach with templates instead:
      gantt.config.work_time = false; // or true, but see below
      gantt.config.highlight_non_working_time = false;

      // columns
      gantt.config.columns = [
        { name: "text", label: "Task Name", width: 220, tree: true },
        { name: "start_date", label: "Start", align: "center", width: 90 },
        { name: "end_date", label: "End", align: "center", width: 90 },
      ];

      // #A. Use scale_cell_class => to color top scale if day is blocked
      gantt.templates.scale_cell_class = function (date) {
        if (isDayBlocked(date)) {
          return "gantt_inactive_day";
        }
        return "";
      };

      // #B. Use timeline_cell_class => to color timeline cells if day is blocked
      gantt.templates.timeline_cell_class = function (item, date) {
        if (isDayBlocked(date)) {
          return "gantt_inactive_day";
        }
        return "";
      };

      // onAfterTaskUpdate => we call handleGanttTaskUpdated
      gantt.attachEvent("onAfterTaskUpdate", function (id, updatedTask) {
        handleGanttTaskUpdated({ ...updatedTask, id });
        return true;
      });

      // onBeforeLinkAdd => if user tries weird link => we can do partial checks
      gantt.attachEvent("onBeforeLinkAdd", function (id, link) {
        const sourceTask = gantt.getTask(link.source);
        const targetTask = gantt.getTask(link.target);
        if (!sourceTask || !targetTask) return false;

        const sEnd = new Date(sourceTask.end_date);
        const tStart = new Date(targetTask.start_date);
        if (sEnd > tStart) {
          // flip
          const temp = link.source;
          link.source = link.target;
          link.target = temp;
        }
        link.type = 0;
        return true;
      });

      // onAfterLinkAdd => handleGanttLinkAdded
      gantt.attachEvent("onAfterLinkAdd", function (id, link) {
        handleGanttLinkAdded({ ...link, id });
        return true;
      });

      // onAfterLinkDelete => handleGanttLinkDeleted
      gantt.attachEvent("onAfterLinkDelete", function (id, link) {
        handleGanttLinkDeleted({ ...link, id });
        return true;
      });

      // pick min/max
      const minMax = computeMinMaxDates(ganttData.data);
      if (minMax) {
        gantt.config.start_date = new Date(minMax.minDate.getTime() - 4 * 86400000);
        gantt.config.end_date = new Date(minMax.maxDate.getTime() + 4 * 86400000);
      }

      if (ganttContainer.current) {
        gantt.init(ganttContainer.current);
        gantt.parse(ganttData);
      }

      return () => {
        gantt.clearAll();
      };
    }, [ganttData]);

    // A small helper that checks if a date is a blocked weekday or in blockedDates
    function isDayBlocked(date: Date): boolean {
      const dow = date.getDay();
      if (blockedWeekdays.includes(dow)) return true;
      const iso = date.toISOString().slice(0, 10);
      if (blockedDates.includes(iso)) return true;
      return false;
    }

    function computeMinMaxDates(items: DhtmlxTaskItem[]) {
      if (!items.length) return null;
      let minDate = new Date(items[0].start_date);
      let maxDate = new Date(items[0].end_date);
      for (const it of items) {
        const sd = new Date(it.start_date);
        const ed = new Date(it.end_date);
        if (sd < minDate) minDate = sd;
        if (ed > maxDate) maxDate = ed;
      }
      return { minDate, maxDate };
    }

    return (
      <div style={{ width: "100%", overflowX: "auto" }}>
        <div ref={ganttContainer} style={{ width: "2400px", height: "600px" }} />
      </div>
    );
  }

  // ---------- 4) Table logic (like your main tasks table) ----------

  // parse user input date => Date
  function parseDateInput(val: string): Date | null {
    if (!val) return null;
    const [yyyy, mm, dd] = val.split("-").map(Number);
    if (!yyyy || !mm || !dd) return null;
    return new Date(yyyy, mm - 1, dd, 0, 0, 0);
  }

  function handleChangeTask(taskId: string, field: keyof TaskDoc, value: any) {
    // same as your existing logic
    // ...
  }

  // etc. (we’ll keep your existing table logic)...

  // For the sake of brevity, I'll only show where we build our table:
  function renderTaskTable() {
    return (
      <ScrollableCard>
        {/* same table code */}
        {/* We'll just map tasks => rows, with drag & drop to reorder */}
        ...
      </ScrollableCard>
    );
  }

  // ---------- RENDER ----------
  if (loading) {
    return <PageContainer>Loading tasks for Gantt...</PageContainer>;
  }
  if (error) {
    return (
      <PageContainer>
        <p className="text-red-600">{error}</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="dark:bg-neutral-900 dark:text-neutral-100 max-w-full">
      <TasksHeaderNav orgId={orgId} projectId={projectId} subProjectId={subProjectId} />

      <h1 className="text-2xl font-bold mb-4">Tasks + Gantt</h1>

      {/* (Optional) Some instructions or UI for blocking days */}
      {/* ... your forms to add blockedWeekdays & blockedDates ... */}

      <Card className="mb-4">{renderTaskTable()}</Card>

      <Card className="relative overflow-hidden">
        <GanttChart />
      </Card>
    </PageContainer>
  );
}
