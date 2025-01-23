// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/tasks/gantt/page.tsx

"use client";

import React, {
  useEffect,
  useState,
  useRef,
  FormEvent,
  WheelEvent,
  useCallback,
} from "react";
import { useParams } from "next/navigation";

import {
  TaskDoc,
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
  parent: string | number;
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

/**
 * safeDateString(val)
 *   Converts a task’s start/end Date => "YYYY-MM-DD HH:mm"
 *   We add +1 day to the end date so tasks show inclusively in the Gantt.
 */
function safeDateString(val: any, isEndDate = false): string {
  if (!val) return "2025-01-01 00:00";
  let d: Date;

  // Attempt to parse
  if (val instanceof Date) {
    d = val;
  } else if (typeof val === "string" && val.includes("T")) {
    d = new Date(val);
  } else if (val && typeof val === "object" && "seconds" in val) {
    // Firestore Timestamp => {seconds, ...}
    d = new Date(val.seconds * 1000);
  } else {
    d = new Date("2025-01-01T00:00:00");
  }

  if (isNaN(d.getTime())) {
    return "2025-01-01 00:00";
  }

  // If this is an end date, add +1 day so it displays inclusively in Gantt
  if (isEndDate) {
    d.setDate(d.getDate() + 1);
  }

  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd} 00:00`;
}

/**
 * buildGanttData => transforms TaskDoc[] into DHTMLX Gantt format.
 *   - For nesting, uses .parentId or "0" if no parent.
 *   - For dependencies => finish-to-start links.
 */
function buildGanttData(taskDocs: TaskDoc[]): DhtmlxGanttData {
  const data: DhtmlxTaskItem[] = [];
  const links: DhtmlxLink[] = [];

  for (const t of taskDocs) {
    const parentVal = t.parentId || "0";
    data.push({
      id: t.id,
      text: t.title,
      start_date: safeDateString(t.startDate, false),
      end_date: safeDateString(t.endDate, true),
      parent: parentVal,
    });

    // If it has predecessors => create finish-to-start links
    if (t.predecessors?.length) {
      for (const p of t.predecessors) {
        links.push({
          id: `${p}->${t.id}`,
          source: p,
          target: t.id,
          type: 0, // finish-to-start
        });
      }
    }
  }

  return { data, links };
}

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

  // For blocked days (weekends, etc.)
  const [blockedWeekdays, setBlockedWeekdays] = useState<number[]>([0, 6]);
  const [blockedDates, setBlockedDates] = useState<string[]>(["2024-01-01"]);

  // Zoom levels
  const [zoomLevel, setZoomLevel] = useState<
    "day" | "week" | "month" | "quarter" | "year"
  >("week");

  // Load tasks from Firestore
  useEffect(() => {
    if (!orgId || !projectId || !subProjectId) return;
    loadTasks();
  }, [orgId, projectId, subProjectId]);

  async function loadTasks() {
    try {
      setLoading(true);
      const tasks = await fetchAllTasks(orgId, projectId, subProjectId);

      // If for some reason multiple docs have the same ID, deduplicate:
      const uniqueTasks = Array.from(new Map(tasks.map((t) => [t.id, t])).values());

      // Sort them by orderIndex
      uniqueTasks.sort((a, b) => (a.orderIndex ?? 99999) - (b.orderIndex ?? 99999));

      setGanttData(buildGanttData(uniqueTasks));
    } catch (err: any) {
      console.error("Gantt fetch error:", err);
      setError(err.message || "Failed to load tasks for Gantt.");
    } finally {
      setLoading(false);
      setTimeout(() => setShowContent(true), 100);
    }
  }

  // ---------- GANTT EVENT HANDLERS ----------
  async function handleTaskUpdated(ganttTask: any) {
    try {
      // If user drags the bar => newStart/newEnd
      const newStart = new Date(ganttTask.start_date);
      const newEnd = new Date(ganttTask.end_date);
      // Subtract the +1 day we added for display
      newEnd.setDate(newEnd.getDate() - 1);

      await updateTask(orgId, projectId, subProjectId, String(ganttTask.id), {
        startDate: newStart,
        endDate: newEnd,
        title: ganttTask.text,
      });
      await loadTasks();
    } catch (err: any) {
      console.error("handleTaskUpdated error:", err);
      setError("Error updating => " + (err.message || ""));
    }
  }

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
   * linkAddOrRemoveDependency =>
   *   modifies .predecessors and .successors on the two tasks in Firestore
   */
  async function linkAddOrRemoveDependency(
    predecessorId: string,
    successorId: string,
    mode: "add" | "remove"
  ) {
    // update .successors in predecessor
    const predDoc = await fetchTask(orgId, projectId, subProjectId, predecessorId).catch(
      () => null
    );
    if (predDoc) {
      const newSucc = new Set(predDoc.successors || []);
      if (mode === "add") newSucc.add(successorId);
      else newSucc.delete(successorId);

      await updateTask(orgId, projectId, subProjectId, predecessorId, {
        successors: Array.from(newSucc),
      });
    }

    // update .predecessors in successor
    const succDoc = await fetchTask(orgId, projectId, subProjectId, successorId).catch(
      () => null
    );
    if (succDoc) {
      const newPred = new Set(succDoc.predecessors || []);
      if (mode === "add") newPred.add(predecessorId);
      else newPred.delete(predecessorId);

      await updateTask(orgId, projectId, subProjectId, successorId, {
        predecessors: Array.from(newPred),
      });
    }
  }

  // ---------- BLOCK DAYS FORM ----------
  const [tempDow, setTempDow] = useState(1);
  const [tempDate, setTempDate] = useState("");

  function handleAddBlockedWeekday(e: FormEvent) {
    e.preventDefault();
    if (!blockedWeekdays.includes(tempDow)) {
      setBlockedWeekdays((prev) => [...prev, tempDow]);
    }
  }
  function handleAddBlockedDate(e: FormEvent) {
    e.preventDefault();
    if (tempDate && !blockedDates.includes(tempDate)) {
      setBlockedDates((prev) => [...prev, tempDate]);
    }
  }

  // ============= GANTT COMPONENT =============
  function GanttComponent({
    ganttData,
    blockedWeekdays,
    blockedDates,
    zoomLevel,
    onTaskUpdated,
    onLinkAdded,
    onLinkDeleted,
  }: {
    ganttData: DhtmlxGanttData;
    blockedWeekdays: number[];
    blockedDates: string[];
    zoomLevel: "day" | "week" | "month" | "quarter" | "year";
    onTaskUpdated: (task: any) => void;
    onLinkAdded: (link: DhtmlxLink) => void;
    onLinkDeleted: (link: DhtmlxLink) => void;
  }) {
    const ganttContainer = useRef<HTMLDivElement>(null);
    const inittedRef = useRef(false);

    /**
     * applyZoomConfig => sets gantt.config.scales based on zoomLevel
     */
    const applyZoomConfig = useCallback(() => {
      const ganttAny = gantt as any;
      let newScales: any[] = [];

      switch (zoomLevel) {
        case "day":
          newScales = [
            {
              unit: "day",
              step: 1,
              format: (date: Date) => ganttAny.date.date_to_str("%D")(date),
            },
            {
              unit: "day",
              step: 1,
              format: (date: Date) => ganttAny.date.date_to_str("%j %M %Y")(date),
            },
          ];
          gantt.config.min_column_width = 40;
          break;

        case "week":
          newScales = [
            {
              unit: "week",
              step: 1,
              format: (date: Date) => {
                const onejan = new Date(date.getFullYear(), 0, 1);
                const weekNum = Math.ceil(
                  ((date.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) /
                    7
                );
                return `Wk ${weekNum}`;
              },
            },
            {
              unit: "day",
              step: 1,
              format: (date: Date) => ganttAny.date.date_to_str("%D")(date),
            },
          ];
          gantt.config.min_column_width = 50;
          break;

        case "month":
          newScales = [
            {
              unit: "month",
              step: 1,
              format: (date: Date) => ganttAny.date.date_to_str("%F %Y")(date),
            },
            {
              unit: "week",
              step: 1,
              format: (date: Date) => `Week #${ganttAny.date.getWeek(date)}`,
            },
          ];
          gantt.config.min_column_width = 70;
          break;

        case "quarter":
          newScales = [
            {
              unit: "month",
              step: 3,
              format: (date: Date) => {
                const month = date.getMonth();
                const quarter = Math.floor(month / 3) + 1;
                const year = date.getFullYear();
                return `Q${quarter} ${year}`;
              },
            },
            {
              unit: "month",
              step: 1,
              format: (date: Date) => ganttAny.date.date_to_str("%M")(date),
            },
          ];
          gantt.config.min_column_width = 90;
          break;

        case "year":
          newScales = [
            {
              unit: "year",
              step: 1,
              format: (date: Date) => ganttAny.date.date_to_str("%Y")(date),
            },
            {
              unit: "month",
              step: 1,
              format: (date: Date) => ganttAny.date.date_to_str("%M")(date),
            },
          ];
          gantt.config.min_column_width = 100;
          break;

        default:
          // fallback => "week"
          newScales = [
            {
              unit: "week",
              step: 1,
              format: (date: Date) => `Wk ${ganttAny.date.getWeek(date)}`,
            },
            {
              unit: "day",
              step: 1,
              format: (date: Date) => ganttAny.date.date_to_str("%D")(date),
            },
          ];
          gantt.config.min_column_width = 50;
          break;
      }

      gantt.config.scales = newScales;
    }, [zoomLevel]);

    /**
     * dayCss => returns "weekend" for blocked days
     * Only relevant if scale is day/week so we can see them clearly.
     */
    const dayCss = useCallback(
      (date: Date, scaleUnit: string) => {
        if (scaleUnit === "day" || scaleUnit === "week") {
          const dow = date.getDay();
          const iso = date.toISOString().slice(0, 10);
          if (blockedWeekdays.includes(dow) || blockedDates.includes(iso)) {
            return "weekend";
          }
        }
        return "";
      },
      [blockedWeekdays, blockedDates]
    );

    useEffect(() => {
      if (!ganttContainer.current) return;

      gantt.setSkin("dark");

      // Create & append a <style> tag to define our gradient-task class with CSS variables
      // (This approach follows the "updated CSS logic" snippet you provided.)
      if (!document.querySelector("#gantt-gradient-style")) {
        const style = document.createElement("style");
        style.id = "gantt-gradient-style";
        style.innerHTML = `
          .gradient-task {
            --dhx-gantt-task-background: linear-gradient(to bottom, #808080, #707070);
            --dhx-gantt-task-border: 1px solid #ccc;
            --dhx-gantt-task-color: #fff;
          }
            
        `;
        document.head.appendChild(style);
      }

      // Assign the custom class to tasks
      (gantt as any).templates.task_class = function () {
        return "gradient-task";
      };

      // Apply zoom settings
      applyZoomConfig();

      // Overwrite scale css with dayCss => highlights blocked days
      if (gantt.config.scales) {
        for (let i = 0; i < gantt.config.scales.length; i++) {
          const s = gantt.config.scales[i] as any;
          const originalCss = s.css;
          const scaleUnit = s.unit;
          s.css = (date: Date) => {
            let existing = "";
            if (typeof originalCss === "function") {
              existing = originalCss(date);
            } else if (typeof originalCss === "string") {
              existing = originalCss;
            }
            const fromNew = dayCss(date, scaleUnit);
            return (existing + " " + fromNew).trim();
          };
        }
      }

      gantt.config.columns = [
        { name: "text", label: "Task Name", width: 220, tree: true },
        { name: "start_date", label: "Start", align: "center", width: 90 },
        { name: "end_date", label: "End", align: "center", width: 90 },
      ];

      gantt.config.xml_date = "%Y-%m-%d %H:%i";

      // Make the container tall
      if (ganttContainer.current) {
        ganttContainer.current.style.height = "1500px";
      }

      // Initialize/refresh Gantt
      if (!inittedRef.current) {
        // Attach events once
        gantt.attachEvent("onAfterTaskUpdate", (id, updatedTask) => {
          onTaskUpdated({ ...updatedTask, id });
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

        gantt.init(ganttContainer.current);
        gantt.parse(ganttData);
        inittedRef.current = true;
      } else {
        gantt.clearAll();
        gantt.parse(ganttData);
      }
    }, [
      ganttData,
      zoomLevel,
      blockedWeekdays,
      blockedDates,
      applyZoomConfig,
      dayCss,
      onTaskUpdated,
      onLinkAdded,
      onLinkDeleted,
    ]);

    return (
      <div style={{ width: "100%", position: "relative" }}>
        <style>{`
          /* highlight blocked days in red-ish */
          .weekend {
            background: rgba(220, 0, 0, 0.1) !important;
          }
        `}</style>

        {/* Gantt container */}
        <div
          ref={ganttContainer}
          style={{
            width: "100%",
            overflow: "auto",
          }}
        />
      </div>
    );
  }

  // ---------- pinch/zoom logic ----------
  useEffect(() => {
    function handleWheel(e: WheelEvent) {
      // If user holds ctrl or meta (cmd on Mac), treat it as zoom
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const direction = e.deltaY > 0 ? 1 : -1;
      const levels: Array<"day" | "week" | "month" | "quarter" | "year"> = [
        "day",
        "week",
        "month",
        "quarter",
        "year",
      ];
      const curIndex = levels.indexOf(zoomLevel);
      let newIndex = curIndex + direction;
      if (newIndex < 0) newIndex = 0;
      if (newIndex >= levels.length) newIndex = levels.length - 1;
      setZoomLevel(levels[newIndex]);
    }

    window.addEventListener("wheel", handleWheel as any, { passive: false });
    return () => {
      window.removeEventListener("wheel", handleWheel as any);
    };
  }, [zoomLevel]);

  // ---------- rendering ----------
  if (loading) {
    return <div className="p-4">Loading tasks for Gantt...</div>;
  }
  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }

  return (
    <PageContainer className="max-w-full">
      <TasksHeaderNav orgId={orgId} projectId={projectId} subProjectId={subProjectId} />
      <h1 className="text-2xl font-bold mb-4">
        Gantt Chart (Gradient Bars + Black Text)
      </h1>

      <div
        className={`
          opacity-0 transition-all duration-500 ease-out delay-[100ms]
          ${showContent ? "opacity-100 translate-y-0" : "translate-y-4"}
        `}
      >
        {/* Zoom selector */}
        <Card className="mb-4 p-4">
          <label className="block font-bold mb-2">Zoom Level</label>
          <select
            className="border p-1 bg-neutral-900 text-white rounded"
            value={zoomLevel}
            onChange={(e) => setZoomLevel(e.target.value as any)}
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="quarter">Quarter</option>
            <option value="year">Year</option>
          </select>
          <p className="mt-2 text-sm text-neutral-400">
            You can also pinch on a trackpad or hold Ctrl/Meta + mouse wheel to zoom.
          </p>
        </Card>

        {/* Block days form */}
        <Card className="mb-4 p-4 space-y-4">
          <div className="flex gap-4">
            {/* block weekday */}
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
                Blocked weekdays: {blockedWeekdays.join(", ")}
              </p>
            </form>

            {/* block specific date */}
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

          <p className="text-xs text-neutral-400">
            Only day/week scales highlight blocked days in red.
          </p>
        </Card>

        {/* The Gantt Chart */}
        <Card className="relative overflow-hidden">
          <GanttComponent
            ganttData={ganttData}
            zoomLevel={zoomLevel}
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
