// src/app/api/preview-image/route.ts
import { NextRequest, NextResponse } from "next/server";
import { JSDOM } from "jsdom";
// Restore node-fetch import since we've installed a compatible version
import fetch from "node-fetch";

// Simple in-memory cache
const cache: Record<string, { url: string; timestamp: number }> = {};
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const FETCH_TIMEOUT = 10000; // 10 seconds timeout

// Helper function to check if a domain is problematic
const isProblematicDomain = (url: string): boolean => {
  const problematicDomains = ["instagram.com", "facebook.com", "twitter.com", "x.com"];

  try {
    const hostname = new URL(url).hostname;
    return problematicDomains.some((domain) => hostname.includes(domain));
  } catch {
    return false;
  }
};

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
    // Cast the signal to the expected type for node-fetch
    const response = await fetch(url, {
      ...options,
      signal: controller.signal as any,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
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
  console.log("Preview Image API called");
  const searchParams = new URL(req.url).searchParams;
  const url = searchParams.get("url");
  const isInstagram = searchParams.get("instagram") === "true";

  if (!url) {
    console.log("Preview Image API: No URL provided");
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  console.log("Preview Image API: Fetching for URL", url);

  try {
    // Handle Instagram separately if requested
    if (isInstagram && url.includes("instagram.com")) {
      console.log("Preview Image API: Instagram URL detected, not handling");
      return NextResponse.json(
        { error: "Instagram handled client-side" },
        { status: 404 }
      );
    }

    // Skip other problematic domains
    if (isProblematicDomain(url)) {
      console.log("Preview Image API: Problematic domain detected", url);
      return NextResponse.json({ error: "Domain not supported" }, { status: 404 });
    }

    // Check cache first
    const cached = cache[url];
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log("Preview Image API: Returning cached result", cached.url);
      return NextResponse.json({ imageUrl: cached.url });
    }

    console.log("Preview Image API: Fetching URL", url);

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
    console.log("Preview Image API: Finding OG image");
    const imageUrl = await findOGImage(html, url);

    if (imageUrl) {
      console.log("Preview Image API: Found image URL", imageUrl);
      // Update cache
      cache[url] = {
        url: imageUrl,
        timestamp: Date.now(),
      };

      return NextResponse.json({ imageUrl });
    }

    console.log("Preview Image API: No image found");
    return NextResponse.json({ error: "No image found" }, { status: 404 });
  } catch (error) {
    console.error(`Error fetching preview for ${url}:`, error);
    return NextResponse.json({ error: "Failed to fetch preview" }, { status: 500 });
  }
}
