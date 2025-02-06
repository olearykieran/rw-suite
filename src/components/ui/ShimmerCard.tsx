"use client";

import React from "react";

/**
 * ShimmerCard provides a skeleton placeholder that replicates the Sub‑Project Overview page layout.
 * It consists of:
 *   - A header section with a back button and sub‑project header placeholders.
 *   - A features section with a grid of feature card placeholders.
 *
 * The animate-pulse utility from Tailwind CSS is used to create the shimmer effect.
 */
export function ShimmerCard() {
  // Define the features array so that the number of feature placeholders matches the actual UI.
  const features = [
    {
      route: "rfis",
      collectionName: "rfis",
      label: "RFIs",
      description: "Create, distribute, and track Requests for Information.",
    },
    {
      route: "submittals",
      collectionName: "submittals",
      label: "Submittals",
      description: "Create, distribute, and track Submittals.",
    },
    {
      route: "blueprints",
      collectionName: "blueprints",
      label: "Blueprints",
      description: "Create, distribute, and track Blueprints.",
    },
    {
      route: "tasks",
      collectionName: "tasks",
      label: "Tasks & Scheduling",
      description: "Create, distribute, and track Tasks.",
    },
    {
      route: "finances",
      collectionName: "finances",
      label: "Finances",
      description: "Create, distribute, and track Finances.",
    },
    {
      route: "change-orders",
      collectionName: "change-orders",
      label: "Change Orders",
      description: "Track changes to scope, costs, or schedule.",
    },
    {
      route: "daily-reports",
      collectionName: "daily-reports",
      label: "Daily Reports",
      description: "Log site conditions, progress, and any incidents daily.",
    },
    {
      route: "meeting-minutes",
      collectionName: "meeting-minutes",
      label: "Meeting Minutes",
      description: "Document discussions, decisions, and next steps from meetings.",
    },
    {
      route: "punch-lists",
      collectionName: "punch-lists",
      label: "Punch Lists",
      description:
        "Track final tasks or issues that must be resolved before project close‑out.",
    },
    {
      route: "site-visits",
      collectionName: "siteVisits",
      label: "Site Visits",
      description:
        "Record details, upload/annotate photos, and attach voice notes from site visits.",
    },
    {
      route: "master-takeoff",
      collectionName: "master-takeoff",
      label: "Master Takeoff",
      description: "Import or create a master list of items to compare against bids.",
    },
    {
      route: "bid-leveler",
      collectionName: "bids",
      label: "Bid Leveler",
      description: "Compare contractor bids and identify scope gaps.",
    },
    {
      route: "lighting-schedule",
      collectionName: "lighting-schedule",
      label: "Lighting Schedule",
      description: "Estimate lighting costs and schedule installation.",
    },
    {
      route: "bid-management",
      collectionName: "bidSubmissions",
      label: "Bid Management",
      description: "Manage bid submissions and guidelines.",
    },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 space-y-8 relative animate-pulse">
      {/* Section 1: Header Placeholder */}
      <div>
        {/* Back button placeholder */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="bg-gray-300 dark:bg-gray-700 h-10 sm:h-12 w-28 sm:w-32 rounded-xl"></div>
        </div>
        {/* Sub‑Project Header Card Placeholder */}
        <div className="bg-gray-200 dark:bg-gray-800 border border-black dark:border-gray-600 rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            {/* Title placeholder */}
            <div className="bg-gray-400 h-8 sm:h-10 w-1/2 rounded"></div>
            {/* Deselect button placeholder */}
            <div className="bg-gray-400 h-10 sm:h-12 w-28 sm:w-32 rounded-xl"></div>
          </div>
          {/* Status placeholder */}
          <div className="bg-gray-400 h-4 sm:h-5 w-1/3 rounded"></div>
        </div>
      </div>

      {/* Section 2: Features Placeholder */}
      <div>
        <div className="bg-gray-200 dark:bg-gray-800 border border-black dark:border-gray-600 rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Features header placeholder */}
          <div className="bg-gray-400 h-8 sm:h-10 w-1/3 rounded mb-4 sm:mb-6"></div>
          {/* Grid of feature card placeholders */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {features.map((_, index) => (
              <div key={index} className="bg-gray-400 h-24 sm:h-32 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
