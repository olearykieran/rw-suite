"use client";
import React, { useState, FormEvent } from "react";
import { SubTask, TaskDoc } from "@/lib/services/TaskService";

/**
 * If you store blocked weekdays/dates globally or per subProject,
 * you can pass them in as props.
 * For demonstration, we hardcode them here.
 */
const BLOCKED_WEEKDAYS = [0, 6]; // Sunday(0), Saturday(6)
const BLOCKED_DATES = ["2024-01-01"];

/** Safely ensure something is a real Date, else return null. */
function ensureDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  // Possibly an ISO string
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
    return new Date(val);
  }
  // Possibly a Firestore Timestamp
  if (val.seconds) {
    return new Date(val.seconds * 1000);
  }
  return null;
}

/**
 * Count how many working days in [start, end], skipping BLOCKED_WEEKDAYS & BLOCKED_DATES.
 */
function computeWorkingDaysCount(start: Date, end: Date): number {
  let count = 0;
  const cur = new Date(start.getTime());
  while (cur <= end) {
    const dow = cur.getDay();
    const iso = cur.toISOString().slice(0, 10);
    if (!BLOCKED_WEEKDAYS.includes(dow) && !BLOCKED_DATES.includes(iso)) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/** Convert offsetDay (1-based) to a real Date within [mainStart, mainEnd], skipping blocked days. */
function offsetToDate(mainStart: Date, mainEnd: Date, offsetDay: number): Date {
  const out = new Date(mainStart.getTime()); // start at mainStart
  let count = 1; // day 1 is mainStart
  while (count < offsetDay && out <= mainEnd) {
    out.setDate(out.getDate() + 1);
    const dow = out.getDay();
    const iso = out.toISOString().slice(0, 10);
    if (!BLOCKED_WEEKDAYS.includes(dow) && !BLOCKED_DATES.includes(iso)) {
      count++;
    }
  }
  return out > mainEnd ? new Date(mainEnd.getTime()) : out;
}

/**
 * AddSubtaskModal
 * A reusable modal for adding a subtask to a "mainTask,"
 * with the user specifying offsetStart + durationDays.
 */
export function AddSubtaskModal({
  visible,
  onClose,
  mainTask,
  onSubtaskCreated,
}: {
  visible: boolean;
  onClose: () => void;
  mainTask: TaskDoc | null;
  onSubtaskCreated: (sub: SubTask) => void;
}) {
  const [title, setTitle] = useState("");
  const [offsetStart, setOffsetStart] = useState(1);
  const [duration, setDuration] = useState(1);

  if (!visible) return null; // not visible => do nothing

  // Ensure mainTask has valid start/end
  const mainStart = ensureDate(mainTask?.startDate);
  const mainEnd = ensureDate(mainTask?.endDate);

  // If the main task date is invalid, user can’t create a subtask
  if (!mainTask || !mainStart || !mainEnd) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
        <div className="bg-white p-4 rounded w-full max-w-md space-y-3">
          <h2 className="text-xl font-bold">Invalid Main Task</h2>
          <p>
            The main task does not have a valid start or end date. Subtask creation cannot
            proceed.
          </p>
          <div className="flex justify-end">
            <button onClick={onClose} className="px-3 py-1 border rounded">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 1) compute how many working days in main
  const totalDays = computeWorkingDaysCount(mainStart, mainEnd);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // If offsetStart > totalDays => clamp
    if (offsetStart > totalDays) {
      alert(`Offset start cannot exceed ${totalDays} total days in main task range.`);
      return;
    }
    // If offsetStart + duration - 1 > totalDays => clamp
    if (offsetStart + duration - 1 > totalDays) {
      alert(
        `Offset start + duration cannot exceed ${totalDays} total working days in main.`
      );
      return;
    }

    // Convert offsetStart => real Date
    const subStart = offsetToDate(mainStart, mainEnd, offsetStart);

    // Move forward skipping blocked days for “duration - 1”
    let remain = duration - 1;
    const subEnd = new Date(subStart.getTime());
    while (remain > 0 && subEnd < mainEnd) {
      subEnd.setDate(subEnd.getDate() + 1);
      const dow = subEnd.getDay();
      const iso = subEnd.toISOString().slice(0, 10);
      if (!BLOCKED_WEEKDAYS.includes(dow) && !BLOCKED_DATES.includes(iso)) {
        remain--;
      }
    }
    // clamp if subEnd went beyond mainEnd
    if (subEnd > mainEnd) {
      subEnd.setTime(mainEnd.getTime());
    }

    const newSub: SubTask = {
      id: "sub-" + Date.now(),
      title: title.trim() || "Untitled Subtask",
      status: "notStarted",
      startDate: subStart,
      endDate: subEnd,
      durationDays: duration,
    };

    onSubtaskCreated(newSub);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-4 rounded w-full max-w-md space-y-4">
        <h2 className="text-xl font-bold">Add Subtask to {mainTask.title}</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Title */}
          <div>
            <label className="block font-medium text-sm mb-1">Subtask Title</label>
            <input
              className="border p-2 w-full rounded"
              placeholder="Enter subtask name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Start offset */}
          <div>
            <label className="block font-medium text-sm mb-1">
              Start Offset (1 to {totalDays})
            </label>
            <input
              type="number"
              min={1}
              max={totalDays}
              className="border p-2 w-full rounded"
              value={offsetStart}
              onChange={(e) => setOffsetStart(Number(e.target.value))}
            />
            <p className="text-xs text-neutral-600">
              1 = same day as main task start; {totalDays} = last working day of main
              task.
            </p>
          </div>

          {/* Duration */}
          <div>
            <label className="block font-medium text-sm mb-1">Duration (days)</label>
            <input
              type="number"
              min={1}
              className="border p-2 w-full rounded"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3">
            <button onClick={onClose} type="button" className="px-3 py-1 border rounded">
              Cancel
            </button>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
              Add Subtask
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
