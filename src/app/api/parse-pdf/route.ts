// src/app/api/parse-pdf/route.ts

import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    // Get the form data from the request
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert the Blob into a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const projectRoot = process.cwd();
    const tempDir = path.join(projectRoot, "tmp");
    const scriptPath = path.join(projectRoot, "parse_pdf.py");

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFilePath = path.join(tempDir, `uploaded-${Date.now()}.pdf`);
    fs.writeFileSync(tempFilePath, fileBuffer);
    console.log("[PDF Parser] File written:", tempFilePath);

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
