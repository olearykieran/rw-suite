// src/app/api/preview-image/route.ts
import { NextRequest, NextResponse } from "next/server";

// Configure Edge runtime
export const runtime = "edge";

// Simple in-memory cache
const cache: Record<string, { url: string; timestamp: number }> = {};
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const FETCH_TIMEOUT = 10000; // 10 seconds timeout

// Helper to extract image URL from HTML using regex
function extractImageUrl(html: string, baseUrl: string): string | null {
  try {
    // Try to extract OpenGraph image
    const ogImageMatch = html.match(
      /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i
    );
    if (ogImageMatch && ogImageMatch[1]) {
      const imageUrl = ogImageMatch[1];
      if (imageUrl.startsWith("/")) {
        const url = new URL(baseUrl);
        return `${url.origin}${imageUrl}`;
      }
      return imageUrl;
    }

    // Try to extract Twitter image
    const twitterImageMatch = html.match(
      /<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*>/i
    );
    if (twitterImageMatch && twitterImageMatch[1]) {
      const imageUrl = twitterImageMatch[1];
      if (imageUrl.startsWith("/")) {
        const url = new URL(baseUrl);
        return `${url.origin}${imageUrl}`;
      }
      return imageUrl;
    }

    // Try to find first substantial img tag
    const imgMatch = html.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi);
    if (imgMatch) {
      for (const img of imgMatch) {
        // Skip small images, icons, and logos
        if (img.includes("icon") || img.includes("logo")) {
          continue;
        }

        const srcMatch = img.match(/src=["']([^"']+)["']/i);
        if (srcMatch && srcMatch[1]) {
          const src = srcMatch[1];
          if (src.startsWith("/")) {
            const url = new URL(baseUrl);
            return `${url.origin}${src}`;
          }
          return src;
        }
      }
    }
  } catch (error) {
    console.error(
      `Error extracting image: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  return null;
}

// Check if a domain should be excluded
function isExcludedDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return ["instagram.com", "facebook.com", "twitter.com", "x.com"].some((domain) =>
      hostname.includes(domain)
    );
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  console.log("Preview Image API called");

  // Parse URL from the request
  const url = new URL(req.url).searchParams.get("url");

  if (!url) {
    console.log("No URL provided");
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  console.log(`Fetching preview for: ${url}`);

  // Check if the domain is excluded
  if (isExcludedDomain(url)) {
    console.log(`Domain excluded: ${url}`);
    return NextResponse.json({ error: "Domain not supported" }, { status: 404 });
  }

  // Check cache
  if (cache[url] && Date.now() - cache[url].timestamp < CACHE_DURATION) {
    console.log(`Returning cached image for: ${url}`);
    return NextResponse.json({ imageUrl: cache[url].url });
  }

  try {
    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    // Fetch the page
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.status}` },
        { status: 404 }
      );
    }

    // Get the HTML content
    const html = await response.text();

    // Extract the image URL using regex
    const imageUrl = extractImageUrl(html, url);

    if (imageUrl) {
      console.log(`Found image URL: ${imageUrl}`);

      // Update cache
      cache[url] = {
        url: imageUrl,
        timestamp: Date.now(),
      };

      return NextResponse.json({ imageUrl });
    }

    console.log("No image found");
    return NextResponse.json({ error: "No image found" }, { status: 404 });
  } catch (error) {
    console.error(
      `Error fetching preview: ${error instanceof Error ? error.message : String(error)}`
    );
    return NextResponse.json({ error: "Failed to fetch preview" }, { status: 500 });
  }
}
