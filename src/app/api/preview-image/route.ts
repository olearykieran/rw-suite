// src/app/api/preview-image/route.ts
import { NextRequest, NextResponse } from "next/server";
import { JSDOM } from "jsdom";
import fetch from "node-fetch";

// Simple in-memory cache
const cache: Record<string, { url: string; timestamp: number }> = {};
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const FETCH_TIMEOUT = 5000; // 5 seconds timeout

async function findOGImage(html: string, baseUrl: string): Promise<string | null> {
  try {
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Check Open Graph image
    const ogImage = doc.querySelector('meta[property="og:image"]');
    if (ogImage?.getAttribute("content")) {
      const imageUrl = ogImage.getAttribute("content");
      // Handle relative URLs
      if (imageUrl && imageUrl.startsWith("/")) {
        const url = new URL(baseUrl);
        return `${url.origin}${imageUrl}`;
      }
      return imageUrl;
    }

    // Check Twitter image
    const twitterImage = doc.querySelector('meta[name="twitter:image"]');
    if (twitterImage?.getAttribute("content")) {
      const imageUrl = twitterImage.getAttribute("content");
      // Handle relative URLs
      if (imageUrl && imageUrl.startsWith("/")) {
        const url = new URL(baseUrl);
        return `${url.origin}${imageUrl}`;
      }
      return imageUrl;
    }

    // Fallback to first image with reasonable dimensions
    const images = Array.from(doc.querySelectorAll("img"));
    for (const img of images) {
      const src = img.getAttribute("src");
      const width = img.getAttribute("width");
      const height = img.getAttribute("height");

      // Skip tiny images, icons, or images without src
      if (
        !src ||
        (width && parseInt(width) < 100) ||
        (height && parseInt(height) < 100) ||
        src.includes("icon") ||
        src.includes("logo")
      ) {
        continue;
      }

      // Handle relative URLs
      if (src.startsWith("/")) {
        const url = new URL(baseUrl);
        return `${url.origin}${src}`;
      }

      return src;
    }
  } catch (error) {
    console.error("Error parsing HTML:", error);
  }

  return null;
}

// Helper function to fetch with timeout
const fetchWithTimeout = async (url: string, options = {}, timeout = FETCH_TIMEOUT) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

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

    // Fetch the URL with timeout
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      console.warn(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.status}` },
        { status: 404 }
      );
    }

    const html = await response.text();

    // Find image URL
    const imageUrl = await findOGImage(html, url);

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
    console.error(`Error fetching preview for ${url}:`, error);
    return NextResponse.json({ error: "Failed to fetch preview" }, { status: 500 });
  }
}
