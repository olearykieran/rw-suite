"use client";

import React from "react";

/**
 * ShimmerCard provides a skeleton placeholder that replicates the Sub‑Project Overview page layout.
 * It consists of:
 *   - A header section with a back button and sub‑project header placeholders.
 *   - A features section with a grid of feature card placeholders.
 *
 * This updated version uses a custom CSS shimmer effect rather than the default Tailwind animate-pulse.
 * The shimmer effect is implemented by overlaying a moving gradient on each placeholder.
 *
 * If you need the shimmer to more closely match the page’s background colors,
 * adjust the background-color and gradient colors in the CSS below.
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
  ];

  return (
    <>
      {/* Container for the shimmer card */}
      <div className="w-full max-w-5xl mx-auto px-4 py-6 space-y-8 relative">
        {/* Section 1: Header Placeholder */}
        <div>
          {/* Back button placeholder */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="h-10 sm:h-12 w-28 sm:w-32 rounded-xl shimmer-bg"></div>
          </div>
          {/* Sub‑Project Header Card Placeholder */}
          <div className="border rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-6 border-gray-300 dark:border-gray-600">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              {/* Title placeholder */}
              <div className="h-8 sm:h-10 w-1/2 rounded shimmer-bg"></div>
              {/* Deselect button placeholder */}
              <div className="h-10 sm:h-12 w-28 sm:w-32 rounded-xl shimmer-bg"></div>
            </div>
            {/* Status placeholder */}
            <div className="h-4 sm:h-5 w-1/3 rounded shimmer-bg"></div>
          </div>
        </div>

        {/* Section 2: Features Placeholder */}
        <div>
          <div className="border rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-6 border-gray-300 dark:border-gray-600">
            {/* Features header placeholder */}
            <div className="h-8 sm:h-10 w-1/3 rounded mb-4 sm:mb-6 shimmer-bg"></div>
            {/* Grid of feature card placeholders */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {features.map((_, index) => (
                <div key={index} className="h-52 rounded-xl shimmer-bg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Custom CSS for the shimmer effect */}
      <style jsx>{`
        /* 
         * The shimmer-bg class applies a shimmering gradient background 
         * that sweeps across the element to simulate a loading placeholder.
         */
        .shimmer-bg {
          position: relative;
          overflow: hidden;
          /* Base background color; update these values to match your page if needed */
          background-color: #f6f7f8;
        }
        /* Adjust the base color for dark mode */
        @media (prefers-color-scheme: dark) {
          .shimmer-bg {
            background-color: #2a2a2a;
          }
        }
        /* The ::after pseudo-element creates the moving gradient overlay */
        .shimmer-bg::after {
          content: "";
          position: absolute;
          top: 0;
          left: -150%;
          width: 150%;
          height: 100%;
          background-image: linear-gradient(
            90deg,
            rgba(246, 247, 248, 0) 0%,
            rgba(246, 247, 248, 0.8) 50%,
            rgba(246, 247, 248, 0) 100%
          );
          animation: shimmer 1.5s linear infinite;
        }
        @keyframes shimmer {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </>
  );
}
