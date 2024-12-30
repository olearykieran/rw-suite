// src/components/DhtmlxGantt.tsx
"use client";

import React, { useRef, useEffect } from "react";
import "dhtmlx-gantt/codebase/dhtmlxgantt.css";
import gantt from "dhtmlx-gantt";

interface DhtmlxGanttProps {
  tasks: any; // { data: any[]; links: any[] }
  onTaskUpdated?: (task: any) => void;
}

/**
 * A basic React wrapper around dhtmlx-gantt.
 *
 * Usage:
 *  <DhtmlxGantt tasks={...} />
 */
export default function DhtmlxGantt({ tasks, onTaskUpdated }: DhtmlxGanttProps) {
  const ganttContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1) Clear & init gantt
    gantt.clearAll();

    // 2) Some basic configuration (can add more)
    gantt.config.date_format = "%Y-%m-%d %H:%i";
    // or if your data is only date, maybe: gantt.config.date_format = "%Y-%m-%d";

    // Basic columns
    gantt.config.columns = [
      { name: "text", label: "Task name", width: "*", tree: true },
      { name: "start_date", label: "Start time", align: "center" },
      { name: "end_date", label: "End time", align: "center" },
    ];

    // 3) Attach events if you want to listen for updates
    if (onTaskUpdated) {
      gantt.attachEvent("onAfterTaskUpdate", function (id, task) {
        onTaskUpdated(task);
      });
    }

    // 4) Initialize gantt in the container
    if (ganttContainer.current) {
      gantt.init(ganttContainer.current);
    }

    // 5) Parse the data
    gantt.parse(tasks);

    // Cleanup if needed
    return () => {
      gantt.clearAll();
    };
  }, [tasks, onTaskUpdated]);

  return <div ref={ganttContainer} style={{ width: "100%", height: "600px" }} />;
}
