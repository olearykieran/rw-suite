"use client";

import React, { useEffect, useState, useRef, FormEvent } from "react";
import { useParams } from "next/navigation";
import {
  TaskDoc,
  SubTask,
  fetchAllTasks,
  fetchTask,
  updateTask,
} from "@/lib/services/TaskService";

import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import TasksHeaderNav from "@/components/TasksHeaderNav";

import gantt from "dhtmlx-gantt";
import "dhtmlx-gantt/codebase/dhtmlxgantt.css";

/** Types for Gantt items */
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

/** Convert date-ish fields to "YYYY-MM-DD HH:mm" local-midnight. */
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

/** Build Gantt data from your tasks. */
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
      for (const p of main.predecessors) {
        links.push({ id: `${p}->${main.id}`, source: p, target: main.id, type: 0 });
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
            links.push({ id: `${sp}->${sub.id}`, source: sp, target: sub.id, type: 0 });
          }
        }
      }
    }
  }

  return { data, links };
}

/** The main Gantt page component. */
export default function TasksGanttPage() {
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };

  const [ganttData, setGanttData] = useState<DhtmlxGanttData>({ data: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showContent, setShowContent] = useState(false);

  // For blocking out weekends/dates
  const [blockedWeekdays, setBlockedWeekdays] = useState<number[]>([0, 6]);
  const [blockedDates, setBlockedDates] = useState<string[]>(["2024-01-01"]);

  useEffect(() => {
    if (!orgId || !projectId || !subProjectId) return;
    loadTasks();
  }, [orgId, projectId, subProjectId]);

  async function loadTasks() {
    try {
      setLoading(true);
      // fetch tasks => sort => build gantt
      const tasks = await fetchAllTasks(orgId, projectId, subProjectId);

      // If you keep orderIndex on main tasks, sort by it so the Gantt matches the main page:
      tasks.sort((a, b) => {
        const aOrder = (a as any).orderIndex ?? 99999;
        const bOrder = (b as any).orderIndex ?? 99999;
        return aOrder - bOrder;
      });

      setGanttData(buildGanttData(tasks));
    } catch (err: any) {
      console.error("Gantt fetch error:", err);
      setError(err.message || "Failed to load tasks for Gantt.");
    } finally {
      setLoading(false);
      setTimeout(() => setShowContent(true), 100);
    }
  }

  // ---------- GANTT EVENT HANDLERS ----------

  // Partial update when user drags/resizes a bar
  async function handleTaskUpdated(ganttTask: any) {
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
        // sub => find which main has that sub
        const all = await fetchAllTasks(orgId, projectId, subProjectId);
        const parentDoc = all.find((m) =>
          m.subtasks?.some((s) => String(s.id) === String(ganttTask.id))
        );
        if (!parentDoc) return; // no sub => ignore

        const updatedSubs = (parentDoc.subtasks || []).map((sub) => {
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
          subtasks: updatedSubs,
        });
      }

      // Re-fetch once, no multiple reload
      await loadTasks();
    } catch (err: any) {
      console.error("handleTaskUpdated error:", err);
      setError("Error updating => " + (err.message || ""));
    }
  }

  // Link creation => add dependency
  async function handleLinkAdded(link: DhtmlxLink) {
    try {
      const predecessorId = String(link.source);
      const successorId = String(link.target);

      await linkAddOrRemoveDependency(predecessorId, successorId, "add");
      await loadTasks();
    } catch (err: any) {
      console.error("handleLinkAdded error:", err);
      setError("Error adding link => " + (err.message || ""));
    }
  }

  // Link deletion => remove dependency
  async function handleLinkDeleted(link: DhtmlxLink) {
    try {
      const predecessorId = String(link.source);
      const successorId = String(link.target);

      await linkAddOrRemoveDependency(predecessorId, successorId, "remove");
      await loadTasks();
    } catch (err: any) {
      console.error("handleLinkDeleted error:", err);
      setError("Error removing link => " + (err.message || ""));
    }
  }

  /**
   * linkAddOrRemoveDependency => the shared logic for sub or main tasks,
   * adding or removing from predecessors[] / successors[].
   */
  async function linkAddOrRemoveDependency(
    predecessorId: string,
    successorId: string,
    mode: "add" | "remove"
  ) {
    // fetch predecessor
    let predDoc = await fetchTask(orgId, projectId, subProjectId, predecessorId).catch(
      () => null
    );
    if (predDoc) {
      // main => adjust .successors
      const successors = new Set(predDoc.successors || []);
      if (mode === "add") successors.add(successorId);
      else successors.delete(successorId);
      await updateTask(orgId, projectId, subProjectId, predDoc.id, {
        successors: Array.from(successors),
      });
    } else {
      // sub => find which main
      const all = await fetchAllTasks(orgId, projectId, subProjectId);
      for (const m of all) {
        const subIdx = (m.subtasks || []).findIndex((s) => s.id === predecessorId);
        if (subIdx >= 0) {
          const subarray = [...(m.subtasks || [])];
          const old = subarray[subIdx];
          const newSucc = new Set(old.successors || []);
          if (mode === "add") newSucc.add(successorId);
          else newSucc.delete(successorId);
          subarray[subIdx] = { ...old, successors: Array.from(newSucc) };
          await updateTask(orgId, projectId, subProjectId, m.id, { subtasks: subarray });
          break;
        }
      }
    }

    // fetch successor
    let succDoc = await fetchTask(orgId, projectId, subProjectId, successorId).catch(
      () => null
    );
    if (succDoc) {
      // main => adjust .predecessors
      const preds = new Set(succDoc.predecessors || []);
      if (mode === "add") preds.add(predecessorId);
      else preds.delete(predecessorId);
      await updateTask(orgId, projectId, subProjectId, succDoc.id, {
        predecessors: Array.from(preds),
      });
    } else {
      // sub => find which main
      const all = await fetchAllTasks(orgId, projectId, subProjectId);
      for (const m of all) {
        const subIdx = (m.subtasks || []).findIndex((s) => s.id === successorId);
        if (subIdx >= 0) {
          const subarray = [...(m.subtasks || [])];
          const old = subarray[subIdx];
          const newPreds = new Set(old.predecessors || []);
          if (mode === "add") newPreds.add(predecessorId);
          else newPreds.delete(predecessorId);
          subarray[subIdx] = { ...old, predecessors: Array.from(newPreds) };
          await updateTask(orgId, projectId, subProjectId, m.id, { subtasks: subarray });
          break;
        }
      }
    }
  }

  // ---------- BLOCK DAYS FORM ----------
  const [tempDow, setTempDow] = useState(1);
  const [tempDate, setTempDate] = useState("");

  function handleAddBlockedWeekday(e: FormEvent) {
    e.preventDefault();
    if (!blockedWeekdays.includes(tempDow)) {
      setBlockedWeekdays([...blockedWeekdays, tempDow]);
    }
  }
  function handleAddBlockedDate(e: FormEvent) {
    e.preventDefault();
    if (tempDate && !blockedDates.includes(tempDate)) {
      setBlockedDates([...blockedDates, tempDate]);
    }
  }

  // ---------- Gantt Component using sub-scale + css for weekends ----------
  function GanttComponent({
    ganttData,
    blockedWeekdays,
    blockedDates,
    onTaskUpdated,
    onLinkAdded,
    onLinkDeleted,
  }: {
    ganttData: DhtmlxGanttData;
    blockedWeekdays: number[];
    blockedDates: string[];
    onTaskUpdated: (task: any) => void;
    onLinkAdded: (link: DhtmlxLink) => void;
    onLinkDeleted: (link: DhtmlxLink) => void;
  }) {
    const ganttContainer = useRef<HTMLDivElement>(null);
    const inittedRef = useRef(false);

    useEffect(() => {
      gantt.setSkin("dark");
      if (!ganttContainer.current) return;
      if (!inittedRef.current) {
        // ---------------- Initialize Gantt Once -------------
        gantt.config.xml_date = "%Y-%m-%d %H:%i";

        // We'll define a function that returns "weekend" if day is Sat/Sun,
        // or else an empty string. Then we also check if it's in blockedDates.
        const dayCss = (date: Date) => {
          // Check if blocked weekday
          const dow = date.getDay();
          const iso = date.toISOString().slice(0, 10);

          if (blockedWeekdays.includes(dow) || blockedDates.includes(iso)) {
            return "weekend"; // We'll style it similarly
          }
          return "";
        };

        gantt.config.scales = [
          {
            unit: "day",
            format: "%D", // e.g. "Mon", "Tue"
            css: dayCss, // <--- apply CSS class conditionally
          },
          {
            unit: "day",
            format: "%j %M %Y", // e.g. "15 Jan 2025"
            css: dayCss,
          },
        ];

        gantt.config.min_column_width = 40;

        // columns
        gantt.config.columns = [
          { name: "text", label: "Task Name", width: 220, tree: true },
          { name: "start_date", label: "Start", align: "center", width: 90 },
          { name: "end_date", label: "End", align: "center", width: 90 },
        ];

        // -------------- Attach Gantt events --------------
        // clamp subtask drag
        gantt.attachEvent("onTaskDrag", (id, mode, task) => {
          // if sub => clamp
          const item = ganttData.data.find((d) => String(d.id) === String(id));
          if (item && item.parent && item.parent !== "0") {
            const parent = ganttData.data.find(
              (d) => String(d.id) === String(item.parent)
            );
            if (parent) {
              const ps = new Date(parent.start_date);
              const pe = new Date(parent.end_date);
              const st = new Date(task.start_date);
              const en = new Date(task.end_date);
              if (st < ps) task.start_date = new Date(ps);
              if (en > pe) task.end_date = new Date(pe);
            }
          }
          return true;
        });
        // partial update
        gantt.attachEvent("onAfterTaskUpdate", (id, updatedTask) => {
          onTaskUpdated({ ...updatedTask, id });
          return true;
        });
        // link flipping if reversed
        gantt.attachEvent("onBeforeLinkAdd", (id, link) => {
          const sTask = gantt.getTask(link.source);
          const tTask = gantt.getTask(link.target);
          if (!sTask || !tTask) return false;
          const sEnd = new Date(sTask.end_date);
          const tStart = new Date(tTask.start_date);
          if (sEnd > tStart) {
            const tmp = link.source;
            link.source = link.target;
            link.target = tmp;
          }
          link.type = 0; // finish->start
          return true;
        });
        gantt.attachEvent("onAfterLinkAdd", (id, link) => {
          onLinkAdded({ ...link, id });
          return true;
        });
        gantt.attachEvent("onAfterLinkDelete", (id, link) => {
          onLinkDeleted({ ...link, id });
          return true;
        });

        // -------------- Initialize + Parse --------------
        gantt.init(ganttContainer.current);
        gantt.parse(ganttData);

        inittedRef.current = true;
      } else {
        // already initted => just parse updated data
        gantt.clearAll();
        gantt.parse(ganttData);
      }
    }, [ganttData, blockedWeekdays, blockedDates]);

    return (
      <div style={{ width: "100%", overflowX: "auto" }}>
        {/* Example style to highlight "weekend" columns */}
        <style>{`
          .weekend {
            background: rgba(220, 0, 0, 0.1) !important;
          }
        `}</style>
        <div ref={ganttContainer} style={{ width: "2400px", height: "600px" }} />
      </div>
    );
  }

  // ---------- Rendering ----------
  if (loading) {
    return <div className="p-4">Loading tasks for Gantt...</div>;
  }
  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }

  return (
    <PageContainer className="max-w-full">
      <TasksHeaderNav orgId={orgId} projectId={projectId} subProjectId={subProjectId} />
      <h1 className="text-2xl font-bold mb-4">Gantt with Subtasks & Dependencies</h1>

      {/* Fade container */}
      <div
        className={`
          opacity-0 transition-all duration-500 ease-out delay-[100ms]
          ${showContent ? "opacity-100 translate-y-0" : "translate-y-4"}
        `}
      >
        <Card className="mb-4 space-y-4">
          <div className="flex gap-4">
            {/* Block weekday form */}
            <form onSubmit={handleAddBlockedWeekday}>
              <label className="block mb-1 text-sm">Block Weekday</label>
              <select
                className="border p-1 text-black text-sm"
                value={tempDow}
                onChange={(e) => setTempDow(Number(e.target.value))}
              >
                <option value={0}>Sunday</option>
                <option value={1}>Monday</option>
                <option value={2}>Tuesday</option>
                <option value={3}>Wednesday</option>
                <option value={4}>Thursday</option>
                <option value={5}>Friday</option>
                <option value={6}>Saturday</option>
              </select>
              <button
                type="submit"
                className="ml-2 bg-gray-600 text-white px-3 py-1 text-sm"
              >
                Add
              </button>
              <p className="text-xs mt-1">
                Currently blocked weekdays: {blockedWeekdays.join(", ")}
              </p>
            </form>

            {/* Block single date */}
            <form onSubmit={handleAddBlockedDate}>
              <label className="block mb-1 text-sm">Block Date</label>
              <input
                type="date"
                className="border p-1 text-black text-sm"
                value={tempDate}
                onChange={(e) => setTempDate(e.target.value)}
              />
              <button
                type="submit"
                className="ml-2 bg-gray-600 text-white px-3 py-1 text-sm"
              >
                Add
              </button>
              <p className="text-xs mt-1">Currently blocked: {blockedDates.join(", ")}</p>
            </form>
          </div>
          <p className="text-sm text-neutral-600">
            Weekends or blocked days will appear with the <code>.weekend</code> style.
          </p>
        </Card>

        {/* The Gantt Chart */}
        <Card className="relative overflow-hidden">
          <GanttComponent
            ganttData={ganttData}
            blockedWeekdays={blockedWeekdays}
            blockedDates={blockedDates}
            onTaskUpdated={handleTaskUpdated}
            onLinkAdded={handleLinkAdded}
            onLinkDeleted={handleLinkDeleted}
          />
        </Card>
      </div>
    </PageContainer>
  );
}
