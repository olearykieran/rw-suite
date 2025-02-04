import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

/**
 * POST handler for the PDF parsing API endpoint.
 *
 * This endpoint accepts form data containing a PDF file, writes it to a temporary file,
 * spawns a Python process to parse the PDF, and returns the extracted text or an error.
 *
 * @param req - The incoming Request object with form data
 * @returns A Response object in JSON format
 */
export async function POST(req: Request): Promise<Response> {
  try {
    // Extract form data from the request
    const formData = await req.formData();
    const file = formData.get("file");

    // Validate that a file was provided and that it's a Blob instance
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert the Blob into a Buffer for file operations
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Define paths for the project root, temporary directory, and Python script
    const projectRoot = process.cwd();
    const tempDir = path.join(projectRoot, "tmp");
    const scriptPath = path.join(projectRoot, "parse_pdf.py");

    // Ensure the temporary directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Create a unique temporary file path for the uploaded PDF
    const tempFilePath = path.join(tempDir, `uploaded-${Date.now()}.pdf`);
    fs.writeFileSync(tempFilePath, fileBuffer);
    console.log("[PDF Parser] File written:", tempFilePath);

    // Return a promise that resolves when the Python process completes.
    // The promise is explicitly typed as Promise<Response> to match Next.js requirements.
    return new Promise<Response>((resolve) => {
      console.log("[PDF Parser] Starting Python process...");
      const pythonProcess = spawn("python", [scriptPath, tempFilePath], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      let output = "";
      let errorOutput = "";

      // Listen to standard output from the Python process
      pythonProcess.stdout.on("data", (data) => {
        const chunk = data.toString();
        console.log("[PDF Parser] Python output:", chunk);
        output += chunk;
      });

      // Listen to standard error from the Python process
      pythonProcess.stderr.on("data", (data) => {
        const error = data.toString();
        console.error("[PDF Parser] Python stderr:", error);
        errorOutput += error;
      });

      // Listen for errors on the Python process
      pythonProcess.on("error", (error) => {
        console.error("[PDF Parser] Python process error:", error);
        cleanup();
        resolve(
          NextResponse.json({
            success: false,
            error: error.message,
          })
        );
      });

      // When the Python process closes, finalize the response and cleanup
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

      // Cleanup function to remove the temporary file after processing
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
