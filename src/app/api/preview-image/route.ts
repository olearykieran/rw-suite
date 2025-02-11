// src/app/api/preview-image/route.ts
import { NextRequest, NextResponse } from "next/server";
import { JSDOM } from "jsdom";
import fetch from "node-fetch";

// Simple in-memory cache
const cache: Record<string, { url: string; timestamp: number }> = {};
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

async function findOGImage(html: string): Promise<string | null> {
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // Check Open Graph image
  const ogImage = doc.querySelector('meta[property="og:image"]');
  if (ogImage?.getAttribute("content")) {
    return ogImage.getAttribute("content");
  }

  // Check Twitter image
  const twitterImage = doc.querySelector('meta[name="twitter:image"]');
  if (twitterImage?.getAttribute("content")) {
    return twitterImage.getAttribute("content");
  }

  // Fallback to first image
  const firstImage = doc.querySelector("img");
  return firstImage?.getAttribute("src") || null;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url).searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    // Check cache first
    const cached = cache[url];
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json({ imageUrl: cached.url });
    }

    // Fetch the URL
    const response = await fetch(url);
    const html = await response.text();

    // Find image URL
    const imageUrl = await findOGImage(html);

    if (imageUrl) {
      // Update cache
      cache[url] = {
        url: imageUrl,
        timestamp: Date.now(),
      };

      return NextResponse.json({ imageUrl });
    }

    return NextResponse.json({ error: "No image found" }, { status: 404 });
  } catch (error) {
    console.error("Error fetching preview:", error);
    return NextResponse.json({ error: "Failed to fetch preview" }, { status: 500 });
  }
}
