// src/app/api/parse-pdf/route.ts
import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const { pdfUrl } = await req.json();
    if (!pdfUrl) return NextResponse.json({ error: "PDF URL required" }, { status: 400 });

    console.log("[PDF Parser] Starting with URL:", pdfUrl);

    // Check URL access
    try {
      const headResponse = await fetch(pdfUrl, { method: "HEAD" });
      console.log("[PDF Parser] URL check:", {
        status: headResponse.status,
        contentType: headResponse.headers.get("content-type"),
        contentLength: headResponse.headers.get("content-length"),
      });
    } catch (e) {
      console.error("[PDF Parser] URL check failed:", e);
      return NextResponse.json({ success: false, error: "URL access failed" });
    }

    const projectRoot = process.cwd();
    const tempDir = path.join(projectRoot, "tmp");
    const scriptPath = path.join(projectRoot, "parse_pdf.py");

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFilePath = path.join(tempDir, `uploaded-${Date.now()}.pdf`);

    // Download with progress log
    console.log("[PDF Parser] Starting download...");
    const downloadResponse = await fetch(pdfUrl);
    if (!downloadResponse.ok) {
      throw new Error(
        `Failed to download PDF: ${downloadResponse.status} ${downloadResponse.statusText}`
      );
    }

    const pdfBuffer = Buffer.from(await downloadResponse.arrayBuffer());
    fs.writeFileSync(tempFilePath, pdfBuffer);

    console.log("[PDF Parser] Download complete:", {
      size: pdfBuffer.length,
      path: tempFilePath,
      exists: fs.existsSync(tempFilePath),
    });

    // Test PDF file
    try {
      const fileStats = fs.statSync(tempFilePath);
      console.log("[PDF Parser] File check:", {
        size: fileStats.size,
        permissions: fileStats.mode,
      });
    } catch (e) {
      console.error("[PDF Parser] File check failed:", e);
      return NextResponse.json({ success: false, error: "File validation failed" });
    }

    return new Promise((resolve) => {
      console.log("[PDF Parser] Starting Python process...");
      const pythonProcess = spawn("python", [scriptPath, tempFilePath], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      let output = "";
      let errorOutput = "";

      pythonProcess.stdout.on("data", (data) => {
        const chunk = data.toString();
        console.log("[PDF Parser] Python output:", chunk);
        output += chunk;
      });

      pythonProcess.stderr.on("data", (data) => {
        const error = data.toString();
        console.error("[PDF Parser] Python stderr:", error);
        errorOutput += error;
      });

      pythonProcess.on("close", (code) => {
        console.log("[PDF Parser] Process complete:", {
          code,
          hasOutput: Boolean(output),
        });
        cleanup();

        if (code === 0 && output.trim()) {
          resolve(NextResponse.json({ success: true, text: output.trim() }));
        } else {
          resolve(
            NextResponse.json({
              success: false,
              error: errorOutput || "No text extracted",
              code,
            })
          );
        }
      });

      function cleanup() {
        try {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        } catch (e) {
          console.error("[PDF Parser] Cleanup error:", e);
        }
      }
    });
  } catch (error: any) {
    console.error("[PDF Parser] Handler error:", error);
    return NextResponse.json({ success: false, error: error.message });
  }
}
