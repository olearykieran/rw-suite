// src/components/ImageAnnotatorWithZoom.tsx
"use client";

import React, { MouseEvent, useState, WheelEvent } from "react";
import type { BlueprintAnnotation } from "@/lib/services/BlueprintService";

/**
 * We do a "scale" approach for images, so the user can zoom in/out.
 * The container has (width, height) = (naturalWidth * scale, naturalHeight * scale).
 * We store raw pin positions. When we scale, we must place pins accordingly.
 */
interface ImageAnnotatorProps {
  fileUrl: string;
  pins: BlueprintAnnotation[];
  onAddPin?: (pin: BlueprintAnnotation) => void;
  onUpdatePin?: (pin: BlueprintAnnotation) => void;
  onDeletePin?: (pinId: string) => void;
}

export default function ImageAnnotatorWithZoom({
  fileUrl,
  pins,
  onAddPin,
  onUpdatePin,
  onDeletePin,
}: ImageAnnotatorProps) {
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [scale, setScale] = useState(1.0);

  // new pin
  const [tempPin, setTempPin] = useState<{ x: number; y: number } | null>(null);
  const [newPopupPos, setNewPopupPos] = useState<{ x: number; y: number } | null>(null);

  // new pin fields
  const [newPinColor, setNewPinColor] = useState("red");
  const [newPinType, setNewPinType] = useState("dot");
  const [newDocType, setNewDocType] = useState("");
  const [newDocId, setNewDocId] = useState("");
  const [newNotes, setNewNotes] = useState("");

  // editing
  const [editPin, setEditPin] = useState<BlueprintAnnotation | null>(null);
  const [editPopupPos, setEditPopupPos] = useState<{ x: number; y: number } | null>(null);

  // measure image
  function handleImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth, naturalHeight } = e.currentTarget as HTMLImageElement;
    setNaturalSize({ w: naturalWidth, h: naturalHeight });
  }

  // user clicks => create new pin
  function handleClick(e: MouseEvent<HTMLDivElement>) {
    if (!naturalSize || !onAddPin) return;

    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // x,y in scaled coords. We want to store "unscaled" positions so pins remain consistent.
    // unscaledX = x / scale, unscaledY = y / scale
    const unscaledX = x / scale;
    const unscaledY = y / scale;

    setTempPin({ x: unscaledX, y: unscaledY });
    setNewPopupPos({ x: e.clientX, y: e.clientY });

    setNewPinColor("red");
    setNewPinType("dot");
    setNewDocType("");
    setNewDocId("");
    setNewNotes("");
  }

  function handleCreatePin() {
    if (!tempPin || !onAddPin) return;
    // store unscaled x,y as the pin coords
    const newPin: BlueprintAnnotation = {
      id: "pin-" + Date.now(),
      x: tempPin.x,
      y: tempPin.y,
      pinColor: newPinColor,
      pinType: newPinType,
      docType: newDocType,
      docId: newDocId,
      notes: newNotes,
    };
    onAddPin(newPin);

    setTempPin(null);
    setNewPopupPos(null);
  }
  function handleCancelNewPin() {
    setTempPin(null);
    setNewPopupPos(null);
  }

  // user clicked existing pin
  function handlePinClick(e: MouseEvent<HTMLDivElement>, pin: BlueprintAnnotation) {
    e.stopPropagation();
    setEditPin({ ...pin });
    setEditPopupPos({ x: e.clientX, y: e.clientY });
  }

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
  function handleDeletePin() {
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
  function zoomIn() {
    setScale((s) => Math.min(s + 0.2, 4.0));
  }
  function zoomOut() {
    setScale((s) => Math.max(s - 0.2, 0.3));
  }

  // Optional ctrl+wheel
  function handleWheel(e: WheelEvent<HTMLDivElement>) {
    if (e.ctrlKey) {
      e.preventDefault();
      if (e.deltaY < 0) zoomIn();
      else zoomOut();
    }
  }

  // compute scaled container size
  let containerWidth = 0;
  let containerHeight = 0;
  if (naturalSize) {
    containerWidth = naturalSize.w * scale;
    containerHeight = naturalSize.h * scale;
  }

  return (
    <div onWheel={handleWheel}>
      {/* Zoom Controls */}
      <div className="mb-2 flex gap-2">
        <button
          onClick={zoomOut}
          className="bg-gray-300 px-3 py-1 rounded hover:bg-gray-400 text-sm"
        >
          -
        </button>
        <span className="text-sm px-1">Zoom: {(scale * 100).toFixed(0)}%</span>
        <button
          onClick={zoomIn}
          className="bg-gray-300 px-3 py-1 rounded hover:bg-gray-400 text-sm"
        >
          +
        </button>
      </div>

      <div
        style={{
          position: "relative",
          width: containerWidth || "auto",
          height: containerHeight || "auto",
          overflow: "hidden", // so if it's bigger than the container, we could also do scroll
          border: "1px solid #ccc",
          display: "inline-block",
        }}
        onClick={handleClick}
      >
        {/* The image itself at scaled size */}
        <img
          src={fileUrl}
          alt="Blueprint or image"
          onLoad={handleImageLoad}
          style={{
            width: containerWidth || "auto",
            height: containerHeight || "auto",
            pointerEvents: "none",
            display: "block",
          }}
        />

        {/* The pins => we must scale them so top=pin.y * scale, left=pin.x * scale */}
        {naturalSize &&
          pins
            .filter((p) => p.x !== undefined && p.y !== undefined)
            .map((pin) => {
              const color = pin.pinColor || "red";
              // pinned location on scaled
              const left = pin.x! * scale;
              const top = pin.y! * scale;

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

      {/* new pin popup */}
      {tempPin && newPopupPos && (
        <div
          style={{
            position: "fixed",
            left: newPopupPos.x + 10,
            top: newPopupPos.y + 10,
            background: "#fff",
            border: "1px solid #ccc",
            padding: "1rem",
            zIndex: 9999,
            width: 220,
          }}
        >
          <h4 className="font-medium text-sm mb-2">New Pin</h4>
          <label className="block text-xs">Pin Color</label>
          <select
            className="border p-1 mb-2 w-full text-sm"
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
            className="border p-1 mb-2 w-full text-sm"
            value={newPinType}
            onChange={(e) => setNewPinType(e.target.value)}
          >
            <option value="dot">Dot</option>
            <option value="triangle">Triangle</option>
            <option value="star">Star</option>
          </select>

          <label className="block text-xs">Document Type</label>
          <select
            className="border p-1 mb-2 w-full text-sm"
            value={newDocType}
            onChange={(e) => setNewDocType(e.target.value)}
          >
            <option value="">(None)</option>
            <option value="rfi">RFI</option>
            <option value="submittal">Submittal</option>
          </select>

          <label className="block text-xs">Document ID</label>
          <input
            className="border p-1 mb-2 w-full text-sm"
            value={newDocId}
            onChange={(e) => setNewDocId(e.target.value)}
          />

          <label className="block text-xs">Notes</label>
          <textarea
            className="border p-1 mb-2 w-full text-sm"
            rows={2}
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
          />

          <div className="flex gap-2">
            <button
              className="bg-blue-600 text-white px-2 py-1 rounded text-sm"
              onClick={handleCreatePin}
            >
              Add Pin
            </button>
            <button
              className="bg-gray-200 px-2 py-1 rounded text-sm"
              onClick={handleCancelNewPin}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* edit pin popup */}
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
          <h4 className="font-medium text-sm mb-2">Edit Pin</h4>
          <label className="block text-xs">Pin Color</label>
          <select
            className="border p-1 mb-2 w-full text-sm"
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
            className="border p-1 mb-2 w-full text-sm"
            value={editPin.pinType || "dot"}
            onChange={(e) => setEditPin({ ...editPin, pinType: e.target.value })}
          >
            <option value="dot">Dot</option>
            <option value="triangle">Triangle</option>
            <option value="star">Star</option>
          </select>

          <label className="block text-xs">Document Type</label>
          <select
            className="border p-1 mb-2 w-full text-sm"
            value={editPin.docType || ""}
            onChange={(e) => setEditPin({ ...editPin, docType: e.target.value })}
          >
            <option value="">(None)</option>
            <option value="rfi">RFI</option>
            <option value="submittal">Submittal</option>
          </select>

          <label className="block text-xs">Document ID</label>
          <input
            className="border p-1 mb-2 w-full text-sm"
            value={editPin.docId || ""}
            onChange={(e) => setEditPin({ ...editPin, docId: e.target.value })}
          />

          <label className="block text-xs">Notes</label>
          <textarea
            className="border p-1 mb-2 w-full text-sm"
            rows={2}
            value={editPin.notes || ""}
            onChange={(e) => setEditPin({ ...editPin, notes: e.target.value })}
          />

          <div className="flex gap-2">
            <button
              className="bg-blue-600 text-white px-2 py-1 rounded text-sm"
              onClick={handleSaveEditPin}
            >
              Save
            </button>
            <button
              className="bg-gray-200 px-2 py-1 rounded text-sm"
              onClick={handleCancelEditPin}
            >
              Cancel
            </button>
            <button
              className="bg-red-600 text-white px-2 py-1 rounded text-sm"
              onClick={handleDeletePin}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
