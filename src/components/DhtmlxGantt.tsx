"use client";

import React, { useRef, useEffect } from "react";
import "dhtmlx-gantt/codebase/dhtmlxgantt.css";
import gantt from "dhtmlx-gantt";

export interface DhtmlxTaskItem {
  id: string | number;
  text: string;
  start_date: string; // "YYYY-MM-DD HH:mm"
  end_date: string; // "YYYY-MM-DD HH:mm"
  parent?: string | number;
}

export interface DhtmlxLink {
  id: string | number;
  source: string | number;
  target: string | number;
  type: number; // e.g. 0 => finish-to-start
}

export interface DhtmlxGanttData {
  data: DhtmlxTaskItem[];
  links: DhtmlxLink[];
}

interface GanttProps {
  tasks: DhtmlxGanttData;
  blockedWeekdays?: number[]; // e.g. [0,6]
  blockedDates?: string[]; // e.g. ["2024-01-01","2024-01-15"]

  onTaskUpdated?: (task: any) => void;
  onLinkAdded?: (link: DhtmlxLink) => void;
  onLinkDeleted?: (link: DhtmlxLink) => void;
}

/** For subtask clamping: find parent's start/end from the data. */
function findParentRange(taskId: string | number, ganttData: DhtmlxGanttData) {
  const item = ganttData.data.find((d) => String(d.id) === String(taskId));
  if (!item) return null;
  if (String(item.parent) === "0") return null; // main => no clamp
  const parent = ganttData.data.find((d) => String(d.id) === String(item.parent));
  if (!parent) return null;
  return {
    start: new Date(parent.start_date),
    end: new Date(parent.end_date),
  };
}

/** find the min/max date to auto-adjust Gantt's start_date/end_date. */
function calcGanttRange(items: DhtmlxTaskItem[]): { minDate?: Date; maxDate?: Date } {
  let min: Date | undefined;
  let max: Date | undefined;
  for (const t of items) {
    const s = new Date(t.start_date);
    const e = new Date(t.end_date);
    if (!min || s < min) min = s;
    if (!max || e > max) max = e;
  }
  return { minDate: min, maxDate: max };
}

export default function DhtmlxGantt({
  tasks,
  blockedWeekdays = [],
  blockedDates = [],
  onTaskUpdated,
  onLinkAdded,
  onLinkDeleted,
}: GanttProps) {
  const ganttContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gantt.setSkin("dark");
    gantt.clearAll();

    // #1. Use the new "scales" approach
    gantt.config.scales = [
      {
        unit: "day",
        step: 1,
        format: "%d %M %Y", // e.g. "07 Aug 2024"
      },
      {
        unit: "day",
        step: 1,
        format: "%D", // e.g. "Wed"
      },
    ];

    // This replaces:
    // gantt.config.scale_unit = "day";
    // gantt.config.date_scale = "%d %M %Y";
    // gantt.config.subscales = [{ unit: "day", step: 1, date: "%D" }];

    gantt.config.xml_date = "%Y-%m-%d %H:%i"; // keep the same

    // We want a wide chart
    gantt.config.min_column_width = 50;
    gantt.config.work_time = true;

    // #2. Mark all days as working, then block custom
    gantt.setWorkTime({ day: [0, 1, 2, 3, 4, 5, 6], hours: "fulltime" });
    blockedWeekdays.forEach((dow) => {
      gantt.setWorkTime({ day: dow, hours: false });
    });
    blockedDates.forEach((iso) => {
      const [yyyy, mm, dd] = iso.split("-");
      const dt = new Date(+yyyy, +mm - 1, +dd);
      gantt.setWorkTime({ date: dt, hours: false });
    });

    // #3. columns
    gantt.config.columns = [
      { name: "text", label: "Task Name", width: 220, tree: true },
      { name: "start_date", label: "Start", align: "center", width: 90 },
      { name: "end_date", label: "End", align: "center", width: 90 },
    ];

    // #4. clamp subtask if user drags beyond parent's date range
    gantt.attachEvent("onTaskDrag", function (id, mode, task) {
      const parentRange = findParentRange(id, tasks);
      if (parentRange) {
        const st = new Date(task.start_date);
        const en = new Date(task.end_date);
        if (st < parentRange.start) {
          task.start_date = new Date(parentRange.start.getTime());
        }
        if (en > parentRange.end) {
          task.end_date = new Date(parentRange.end.getTime());
        }
      }
      return true;
    });

    // #5. onAfterTaskUpdate => pass to onTaskUpdated
    if (onTaskUpdated) {
      gantt.attachEvent("onAfterTaskUpdate", function (id, updatedTask) {
        onTaskUpdated({ ...updatedTask, id });
        return true;
      });
    }

    // #6. If user tries to create link from finish to start => we flip if reversed
    gantt.attachEvent("onBeforeLinkAdd", function (id, link) {
      const sourceTask = gantt.getTask(link.source);
      const targetTask = gantt.getTask(link.target);
      if (!sourceTask || !targetTask) return false;

      // If source end > target start => flip
      const sEnd = new Date(sourceTask.end_date);
      const tStart = new Date(targetTask.start_date);
      if (sEnd > tStart) {
        const temp = link.source;
        link.source = link.target;
        link.target = temp;
      }
      link.type = 0; // finish->start
      return true;
    });

    // #7. onAfterLinkAdd => onLinkAdded
    if (onLinkAdded) {
      gantt.attachEvent("onAfterLinkAdd", function (id, link) {
        onLinkAdded({ ...link, id });
        return true;
      });
    }

    // #8. onAfterLinkDelete => onLinkDeleted
    if (onLinkDeleted) {
      gantt.attachEvent("onAfterLinkDelete", function (id, link) {
        onLinkDeleted({ ...link, id });
        return true;
      });
    }

    // #9. auto range
    const { minDate, maxDate } = calcGanttRange(tasks.data);
    if (minDate) {
      const startPad = new Date(minDate.getTime() - 4 * 86400000);
      gantt.config.start_date = startPad;
    } else {
      gantt.config.start_date = new Date("2024-01-01");
    }
    if (maxDate) {
      const endPad = new Date(maxDate.getTime() + 4 * 86400000);
      gantt.config.end_date = endPad;
    } else {
      gantt.config.end_date = new Date("2024-12-31");
    }

    // #10. init and parse
    if (ganttContainer.current) {
      gantt.init(ganttContainer.current);
      gantt.parse(tasks);
    }

    return () => {
      gantt.clearAll();
    };
  }, [tasks, blockedWeekdays, blockedDates, onTaskUpdated, onLinkAdded, onLinkDeleted]);

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <div ref={ganttContainer} style={{ width: "2400px", height: "600px" }} />
    </div>
  );
}
