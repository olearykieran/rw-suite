// src/app/dashboard/estimate-pdf/page.tsx
"use client";
import React from "react";
import {
  generateEstimatePDF,
  EstimatePDFData,
} from "@/lib/services/EstimatePDFGenerator"; // adjust the path as needed

export default function EstimateDownloadButton() {
  // Prepare your estimate data
  const estimateData: EstimatePDFData = {
    projectTitle: "GRIND HOUSE GYM FLATIRON - PROJECT ESTIMATE",
    projectAddress: "44 West 18th Street, New York, NY 10001",
    projectDate: "March 3 2025",
    trades: [
      {
        trade: "PROTECTION/TRADE LABOR/SECURITY",
        cost: "$26,360",
        items: [
          {
            description: "Protection of existing/new conditions - Air dust control",
            cost: "",
          },
          {
            description: "Provide trade labor for protection and cleaning",
            cost: "",
          },
          { description: "Temporary construction fence", cost: "" },
        ],
      },
      {
        trade: "DEMOLITION",
        cost: "$18,419",
        items: [
          { description: "Remove Existing Walls", cost: "" },
          { description: "Remove Single panel doors", cost: "" },
          { description: "Remove Double panel doors", cost: "" },
          { description: "Cap/Remove Plumbing fixtures", cost: "" },
          { description: "Remove Debris", cost: "" },
          { description: "Misc. Electric and mechanical demolition work", cost: "" },
        ],
      },
      {
        trade: "THERMAL & MOISTURE PROTECTION",
        cost: "$129,424",
        items: [
          { description: "Waterproofing", cost: "" },
          { description: "Rigid Insulation", cost: "" },
        ],
      },
      {
        trade: "DOORS/OPENINGS",
        cost: "$387,100",
        items: [
          { description: "Door Frames and Hardware", cost: "" },
          { description: "Cased Openings", cost: "" },
        ],
      },
      {
        trade: "FINISHES",
        cost: "$1,485,423",
        items: [
          { description: "Drywall assemblies", cost: "" },
          { description: "Drywalls and Framing", cost: "" },
          { description: "GWB Ceiling", cost: "" },
          { description: "Wood Ceiling", cost: "" },
          { description: "Metal Ceiling", cost: "" },
          { description: "Tile Work", cost: "" },
          { description: "Special Finishes", cost: "" },
          { description: "Wall Covering", cost: "" },
          { description: "Skim Coat", cost: "" },
          { description: "Paint", cost: "" },
          { description: "Rug Flooring", cost: "" },
          { description: "Wall Bases", cost: "" },
        ],
      },
      {
        trade: "SPRINKLER SYSTEM",
        cost: "$110,000",
        items: [
          {
            description: "Connections to existing FCVA's",
            cost: "",
          },
          {
            description:
              "Pipe and Finish the Sprinkler System connecting to existing system",
            cost: "",
          },
          {
            description: "New High temp rated sprinkler heads for saunas and steam rooms",
            cost: "",
          },
        ],
      },
      {
        trade: "PLUMBING",
        cost: "$400,000",
        items: [
          { description: "Standard underground piping", cost: "" },
          { description: "Toilets", cost: "" },
          { description: "Urinals", cost: "" },
          { description: "Lavatories", cost: "" },
          { description: "ADA Showers", cost: "" },
          { description: "Rain Showers for cold plunge rooms", cost: "" },
          { description: "CW connections for steam rooms", cost: "" },
          { description: "Washing machines", cost: "" },
          { description: "Drinking fountains", cost: "" },
          { description: "Mop sinks", cost: "" },
          { description: "CW connections for saunas", cost: "" },
          { description: "Floor drains", cost: "" },
          { description: "Standard Showers", cost: "" },
        ],
      },
      {
        trade: "MECHANICAL",
        cost: "$620,000",
        items: [
          { description: "Ductwork - Cellar", cost: "" },
          { description: "Ductwork - First Floor", cost: "" },
          { description: "Ductwork - Second Floor", cost: "" },
          { description: "Controls", cost: "" },
          { description: "Duct Heaters", cost: "" },
          { description: "Fan Equipment", cost: "" },
          { description: "Airflow Devices", cost: "" },
          { description: "Dampers", cost: "" },
          { description: "Humidifiers", cost: "" },
        ],
      },
      {
        trade: "METALS",
        cost: "$116,925",
        items: [{ description: "Stair Steel Work", cost: "" }],
      },
      {
        trade: "WOOD WORKS",
        cost: "$425,600",
        items: [
          { description: "Millworks", cost: "" },
          { description: "Wood Panels", cost: "" },
          { description: "Wood Veneer", cost: "" },
          { description: "Metal Finishes", cost: "" },
          { description: "Classroom Podium", cost: "" },
          { description: "Trims", cost: "" },
          { description: "Misc Items", cost: "" },
        ],
      },
      {
        trade: "ELECTRICAL",
        cost: "$1,350,000",
        items: [
          { description: "Power devices", cost: "" },
          { description: "Lighting fixtures", cost: "" },
          { description: "HVAC Hook Ups", cost: "" },
          { description: "Conduit and wiring", cost: "" },
          { description: "Lights and Switches", cost: "" },
          { description: "AV", cost: "" },
          { description: "Branch Circuits", cost: "" },
          { description: "Service and Panels", cost: "" },
          { description: "Fire alarm system", cost: "" },
        ],
      },
      {
        trade: "STOREFRONTS/GLASS",
        cost: "$186,423",
        items: [
          { description: "Classroom", cost: "" },
          { description: "Vestibule", cost: "" },
          { description: "Mixed Sauna", cost: "" },
          { description: "Spin Class Room", cost: "" },
        ],
      },
      {
        trade: "SPECIALTIES",
        cost: "$265,625",
        items: [
          { description: "Steam/Sauna Platforms", cost: "" },
          { description: "Toilet Accesories", cost: "" },
          { description: "Planters", cost: "" },
          { description: "Clear Mirrors", cost: "" },
          { description: "Lockers", cost: "" },
        ],
      },
    ],
    subtotal: "$5,521,298",
    generalConditions: "$386,490",
    generalConditionsPercentage: "7%",
    overhead: "$276,065",
    overheadPercentage: "5%",
    insurance: "$165,639",
    insurancePercentage: "3%",
    totalProjectCost: "$6,349,492",
    additionalClauses: [
      {
        title: "Price Adjustment Clause:",
        content:
          "The prices set forth in this agreement are based on current costs of goods, materials, and equipment. In the event of any increase in tariffs, duties, taxes, or material costs after the date of this contract but before the completion of the project, the Client agrees to pay the difference between the original quoted price and the adjusted cost of goods. Any such price adjustments will be documented and provided to the Client for review. Payment for increased costs shall be made in accordance with the payment terms outlined in this agreement.",
      },
      {
        title: "Tile Cost Note:",
        content:
          "This price allows for the purchase of tile up to $12 per sqft. If the tile costs more, any additional charges will be submitted to the owner before the job is completed.",
      },
    ],
    logoUrl:
      "https://firebasestorage.googleapis.com/v0/b/rw-project-management.firebasestorage.app/o/rw-logo-title.png?alt=media&token=03a42c6c-980c-4857-ae0d-f84c37baa2fe",
  };

  // This function will be called on button click to generate the PDF
  const handleDownloadPDF = () => {
    generateEstimatePDF(estimateData);
  };

  return (
    <div>
      <button
        onClick={handleDownloadPDF}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        Download Estimate PDF
      </button>
    </div>
  );
}
