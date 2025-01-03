"use client";

import React from "react";

type AlertType = "error" | "info" | "success" | "warning";

interface MessageAlertProps {
  type?: AlertType;
  message: string;
}

export function MessageAlert({ type = "info", message }: MessageAlertProps) {
  // Simple style variants - adjust as desired
  let bgClass = "bg-neutral-100 dark:bg-neutral-800";
  let textClass = "text-neutral-700 dark:text-neutral-200";
  let borderClass = "border-neutral-200 dark:border-neutral-700";

  if (type === "error") {
    bgClass = "bg-red-50 dark:bg-red-900";
    textClass = "text-red-700 dark:text-red-200";
    borderClass = "border-red-200 dark:border-red-800";
  } else if (type === "success") {
    bgClass = "bg-green-50 dark:bg-green-900";
    textClass = "text-green-700 dark:text-green-200";
    borderClass = "border-green-200 dark:border-green-800";
  } else if (type === "warning") {
    bgClass = "bg-yellow-50 dark:bg-yellow-900";
    textClass = "text-yellow-700 dark:text-yellow-200";
    borderClass = "border-yellow-200 dark:border-yellow-800";
  }

  return (
    <div
      className={`border ${borderClass} ${bgClass} ${textClass} p-3 rounded transition`}
    >
      {message}
    </div>
  );
}
