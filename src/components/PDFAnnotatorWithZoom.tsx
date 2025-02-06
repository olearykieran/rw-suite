// src/components/PDFAnnotatorWithZoom.tsx
"use client";

import React, { MouseEvent, useState, useCallback, useEffect, WheelEvent } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import type { BlueprintAnnotation } from "@/lib/services/BlueprintService";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// Load the local PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface PDFAnnotatorProps {
  fileUrl: string;
  pins: BlueprintAnnotation[];
  onAddPin?: (pin: BlueprintAnnotation) => void;
  onUpdatePin?: (pin: BlueprintAnnotation) => void;
  onDeletePin?: (pinId: string) => void;
}

/**
 * A robust PDF annotator with:
 * - Centered PDF pages
 * - Zoom in/out
 * - An overlay for placing pins
 * - "pointer-events" logic so you can click precisely
 */
export default function PDFAnnotatorWithZoom({
  fileUrl,
  pins,
  onAddPin,
  onUpdatePin,
  onDeletePin,
}: PDFAnnotatorProps) {
  const [numPages, setNumPages] = useState(0);
  // For each pageNumber => scaled page { width, height }
  const [pageDims, setPageDims] = useState<{
    [pageNum: number]: { width: number; height: number };
  }>({});

  // Zoom scale factor
  const [scale, setScale] = useState(1.0);

  // Temporary new pin data
  const [tempPin, setTempPin] = useState<{
    pageNumber: number;
    xPx: number;
    yPx: number;
  } | null>(null);
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(null);

  // Fields for the new pin
  const [newPinColor, setNewPinColor] = useState("red");
  const [newPinType, setNewPinType] = useState("dot");
  const [newDocType, setNewDocType] = useState("");
  const [newDocId, setNewDocId] = useState("");
  const [newNotes, setNewNotes] = useState("");

  // Editing an existing pin
  const [editPin, setEditPin] = useState<BlueprintAnnotation | null>(null);
  const [editPopupPos, setEditPopupPos] = useState<{ x: number; y: number } | null>(null);

  // Called after PDF is loaded
  function onDocumentLoadSuccess(pdf: any) {
    setNumPages(pdf.numPages);
    console.log("[PDFAnnotator] Loaded PDF with numPages =", pdf.numPages);
  }

  // When each page finishes rendering, we get the scaled dimension
  const onPageRenderSuccess = useCallback((pageObj: any) => {
    const { pageNumber, width, height } = pageObj;
    setPageDims((prev) => ({
      ...prev,
      [pageNumber]: { width, height },
    }));
    console.log(
      `[PDFAnnotator] Page ${pageNumber} rendered: width=${width}, height=${height}`
    );
  }, []);

  /**
   * handlePageClick => The big one. We'll create a new pin if onAddPin is defined.
   */
  const handlePageClick = useCallback(
    (e: MouseEvent<HTMLDivElement>, pageNum: number) => {
      if (!onAddPin) return;
      if (!pageDims[pageNum]) return;

      // bounding rect for the overlay
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const xPx = e.clientX - rect.left;
      const yPx = e.clientY - rect.top;

      console.log(
        "[PDFAnnotator] handlePageClick => pageNum:",
        pageNum,
        " rect:",
        rect,
        " xPx:",
        xPx,
        " yPx:",
        yPx
      );

      setTempPin({ pageNumber: pageNum, xPx, yPx });
      setPopupPos({ x: e.clientX, y: e.clientY });

      // Reset form fields
      setNewPinColor("red");
      setNewPinType("dot");
      setNewDocType("");
      setNewDocId("");
      setNewNotes("");
    },
    [onAddPin, pageDims]
  );

  /** finalize new pin => convert xPx,yPx -> xPct,yPct */
  function handleCreatePin() {
    if (!tempPin || !onAddPin) return;

    const { pageNumber, xPx, yPx } = tempPin;
    const dim = pageDims[pageNumber];
    if (!dim) {
      console.warn("[PDFAnnotator] No dims for page:", pageNumber);
      return;
    }

    // Convert to percentages
    const xPct = (xPx / dim.width) * 100;
    const yPct = (yPx / dim.height) * 100;

    const newPin: BlueprintAnnotation = {
      id: "pin-" + Date.now(),
      pageNumber,
      xPct,
      yPct,
      pinColor: newPinColor,
      pinType: newPinType,
      docType: newDocType,
      docId: newDocId,
      notes: newNotes,
    };
    console.log("[PDFAnnotator] Creating pin =>", newPin);
    onAddPin(newPin);

    // close
    setTempPin(null);
    setPopupPos(null);
  }
  function handleCancelNewPin() {
    setTempPin(null);
    setPopupPos(null);
  }

  // user clicked an existing pin
  function handlePinClick(e: MouseEvent<HTMLDivElement>, pin: BlueprintAnnotation) {
    e.stopPropagation();
    setEditPin({ ...pin });
    setEditPopupPos({ x: e.clientX, y: e.clientY });
  }

  // Save changes to an existing pin
  function handleSaveEditPin() {
    if (!editPin || !onUpdatePin) return;
    onUpdatePin(editPin);
    setEditPin(null);
    setEditPopupPos(null);
  }
  function handleCancelEditPin() {
    setEditPin(null);
    setEditPopupPos(null);
  }
  function handleDeletePinClick() {
    if (!editPin) return;
    if (onDeletePin) {
      onDeletePin(editPin.id);
    } else if (onUpdatePin) {
      onUpdatePin({ ...editPin, pinType: "DELETED" });
    }
    setEditPin(null);
    setEditPopupPos(null);
  }

  // Zoom
  function handleZoomIn() {
    setScale((s) => Math.min(s + 0.2, 4.0));
  }
  function handleZoomOut() {
    setScale((s) => Math.max(s - 0.2, 0.3));
  }
  // optional ctrl+scroll => zoom
  function handleWheel(e: WheelEvent<HTMLDivElement>) {
    if (e.ctrlKey) {
      e.preventDefault();
      if (e.deltaY < 0) handleZoomIn();
      else handleZoomOut();
    }
  }

  return (
    <div
      style={{ position: "relative", padding: "1rem" }}
      onWheel={handleWheel}
      className="pdf-annotator"
    >
      {/* Zoom Controls */}
      <div className="mb-2 flex gap-2">
        <button onClick={handleZoomOut} className=" px-3 py-1 rounded hover:bg-gray-400 ">
          -
        </button>
        <span className=" px-1">Zoom: {(scale * 100).toFixed(0)}%</span>
        <button onClick={handleZoomIn} className=" px-3 py-1 rounded hover:bg-gray-400 ">
          +
        </button>
      </div>

      <Document
        file={fileUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        className="flex flex-col items-center" // center all pages
      >
        {Array.from({ length: numPages }, (_, i) => {
          const pageNum = i + 1;
          const dims = pageDims[pageNum];

          return (
            <div key={pageNum} style={{ position: "relative", margin: "1rem auto" }}>
              {/*
                "renderMode='canvas'" => the PDF page becomes a <canvas> element
                We want pointerEvents=none on that canvas,
                and an absolutely positioned overlay on top with pointerEvents=auto
              */}
              <Page
                pageNumber={pageNum}
                scale={scale}
                onRenderSuccess={onPageRenderSuccess}
                renderMode="canvas"
                // We'll do pointerEvents none to ensure the canvas doesn't eat clicks
                customTextRenderer={() => ""} // optional, if you want no text selection
              />

              {/* overlay on top of the rendered canvas */}
              {dims && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: dims.width,
                    height: dims.height,
                    pointerEvents: "auto", // crucial for clicks
                    zIndex: 10,
                  }}
                  onClick={(e) => handlePageClick(e, pageNum)}
                >
                  {/* pins for this page */}
                  {pins
                    .filter((p) => p.pageNumber === pageNum)
                    .map((pin) => {
                      // Convert xPct,yPct => px
                      const left = (pin.xPct || 0) * 0.01 * dims.width;
                      const top = (pin.yPct || 0) * 0.01 * dims.height;
                      const color = pin.pinColor || "red";

                      let shapeStyle: React.CSSProperties = {
                        position: "absolute",
                        left,
                        top,
                        width: 20,
                        height: 20,
                        transform: "translate(-50%, -50%)",
                        backgroundColor: color,
                        cursor: "pointer",
                      };
                      if (pin.pinType === "triangle") {
                        shapeStyle = {
                          ...shapeStyle,
                          width: 0,
                          height: 0,
                          borderLeft: "10px solid transparent",
                          borderRight: "10px solid transparent",
                          borderBottom: `20px solid ${color}`,
                        };
                      } else if (pin.pinType === "star") {
                        shapeStyle.borderRadius = "50%";
                      } else {
                        shapeStyle.borderRadius = "50%";
                      }

                      return (
                        <div
                          key={pin.id}
                          style={shapeStyle}
                          onClick={(evt) => {
                            evt.stopPropagation();
                            handlePinClick(evt, pin);
                          }}
                          title={pin.notes}
                        />
                      );
                    })}
                </div>
              )}

              <p className=" mt-1 text-center">
                Page {pageNum} of {numPages}
              </p>
            </div>
          );
        })}
      </Document>

      {/* =========== Popup for new pin =========== */}
      {tempPin && popupPos && (
        <div
          style={{
            position: "fixed",
            left: popupPos.x + 10,
            top: popupPos.y + 10,
            background: "#fff",
            border: "1px solid #ccc",
            padding: "1rem",
            zIndex: 9999,
            width: 220,
          }}
        >
          <h4 className="font-medium  mb-2">New Pin</h4>
          <label className="block text-xs">Pin Color</label>
          <select
            className="border p-1 mb-2 w-full "
            value={newPinColor}
            onChange={(e) => setNewPinColor(e.target.value)}
          >
            <option value="red">Red</option>
            <option value="blue">Blue</option>
            <option value="orange">Orange</option>
            <option value="green">Green</option>
          </select>

          <label className="block text-xs">Pin Type</label>
          <select
            className="border p-1 mb-2 w-full "
            value={newPinType}
            onChange={(e) => setNewPinType(e.target.value)}
          >
            <option value="dot">Dot</option>
            <option value="triangle">Triangle</option>
            <option value="star">Star</option>
          </select>

          <label className="block text-xs">Document Type</label>
          <select
            className="border p-1 mb-2 w-full "
            value={newDocType}
            onChange={(e) => setNewDocType(e.target.value)}
          >
            <option value="">(None)</option>
            <option value="rfi">RFI</option>
            <option value="submittal">Submittal</option>
          </select>

          <label className="block text-xs">Document ID</label>
          <input
            className="border p-1 mb-2 w-full "
            value={newDocId}
            onChange={(e) => setNewDocId(e.target.value)}
          />

          <label className="block text-xs">Notes</label>
          <textarea
            className="border p-1 mb-2 w-full "
            rows={2}
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
          />

          <div className="flex gap-2">
            <button
              className="bg-blue-600 text-white px-2 py-1 rounded "
              onClick={handleCreatePin}
            >
              Add Pin
            </button>
            <button className=" px-2 py-1 rounded " onClick={handleCancelNewPin}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* =========== Popup for editing pin =========== */}
      {editPin && editPopupPos && (
        <div
          style={{
            position: "fixed",
            left: editPopupPos.x + 10,
            top: editPopupPos.y + 10,
            background: "#fff",
            border: "1px solid #ccc",
            padding: "1rem",
            zIndex: 9999,
            width: 220,
          }}
        >
          <h4 className="font-medium  mb-2">Edit Pin</h4>
          <label className="block text-xs">Pin Color</label>
          <select
            className="border p-1 mb-2 w-full "
            value={editPin.pinColor || "red"}
            onChange={(e) => setEditPin({ ...editPin, pinColor: e.target.value })}
          >
            <option value="red">Red</option>
            <option value="blue">Blue</option>
            <option value="orange">Orange</option>
            <option value="green">Green</option>
          </select>

          <label className="block text-xs">Pin Type</label>
          <select
            className="border p-1 mb-2 w-full "
            value={editPin.pinType || "dot"}
            onChange={(e) => setEditPin({ ...editPin, pinType: e.target.value })}
          >
            <option value="dot">Dot</option>
            <option value="triangle">Triangle</option>
            <option value="star">Star</option>
          </select>

          <label className="block text-xs">Document Type</label>
          <select
            className="border p-1 mb-2 w-full "
            value={editPin.docType || ""}
            onChange={(e) => setEditPin({ ...editPin, docType: e.target.value })}
          >
            <option value="">(None)</option>
            <option value="rfi">RFI</option>
            <option value="submittal">Submittal</option>
          </select>

          <label className="block text-xs">Document ID</label>
          <input
            className="border p-1 mb-2 w-full "
            value={editPin.docId || ""}
            onChange={(e) => setEditPin({ ...editPin, docId: e.target.value })}
          />

          <label className="block text-xs">Notes</label>
          <textarea
            className="border p-1 mb-2 w-full "
            rows={2}
            value={editPin.notes || ""}
            onChange={(e) => setEditPin({ ...editPin, notes: e.target.value })}
          />

          <div className="flex gap-2">
            <button
              className="bg-blue-600 text-white px-2 py-1 rounded "
              onClick={handleSaveEditPin}
            >
              Save
            </button>
            <button className=" px-2 py-1 rounded " onClick={handleCancelEditPin}>
              Cancel
            </button>
            <button
              className="bg-red-600 text-white px-2 py-1 rounded "
              onClick={handleDeletePinClick}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
