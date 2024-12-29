"use client";

import React, { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { firestore } from "@/lib/firebaseConfig";
import Timeline from "react-gantt-timeline";

export default function GanttPage() {
  const [data, setData] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const orgId = "..."; // from useParams
  const projectId = "...";

  useEffect(() => {
    const fetchTasks = async () => {
      const tasksRef = collection(
        firestore,
        "organizations",
        orgId,
        "projects",
        projectId,
        "tasks"
      );
      const snap = await getDocs(tasksRef);
      const tasks = snap.docs.map((d) => {
        const t = d.data();
        return {
          id: d.id,
          start: t.startDate.toDate(),
          end: t.endDate.toDate(),
          name: t.name,
          // ... other fields
        };
      });
      setData(tasks);
      // handle links/dependencies
    };
    fetchTasks();
  }, [orgId, projectId]);

  // Example of handling changes
  const onUpdateTask = async (task: any) => {
    // task has new start/end
    const ref = doc(
      firestore,
      "organizations",
      orgId,
      "projects",
      projectId,
      "tasks",
      task.id
    );
    await updateDoc(ref, {
      startDate: task.start,
      endDate: task.end,
    });
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold">Project Gantt</h1>
      <div className="mt-4" style={{ height: "600px" }}>
        <Timeline data={data} links={links} onUpdateTask={onUpdateTask} />
      </div>
    </div>
  );
}
