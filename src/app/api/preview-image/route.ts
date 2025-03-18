// src/app/api/preview-image/route.ts
import { NextRequest } from "next/server";

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
      `[EDGE] Error extracting image: ${
        error instanceof Error ? error.message : String(error)
      }`
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
  console.log("[EDGE] Preview Image API called");

  // Parse URL from the request
  const url = new URL(req.url).searchParams.get("url");

  if (!url) {
    console.log("[EDGE] No URL provided");
    return new Response(JSON.stringify({ error: "URL is required" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  console.log(`[EDGE] Fetching preview for: ${url}`);

  // Check if the domain is excluded
  if (isExcludedDomain(url)) {
    console.log(`[EDGE] Domain excluded: ${url}`);
    return new Response(JSON.stringify({ error: "Domain not supported" }), {
      status: 404,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  // Check cache
  if (cache[url] && Date.now() - cache[url].timestamp < CACHE_DURATION) {
    console.log(`[EDGE] Returning cached image for: ${url}`);
    return new Response(JSON.stringify({ imageUrl: cache[url].url }), {
      headers: {
        "Content-Type": "application/json",
      },
    });
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
      console.error(
        `[EDGE] Failed to fetch URL: ${response.status} ${response.statusText}`
      );
      return new Response(
        JSON.stringify({ error: `Failed to fetch URL: ${response.status}` }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Get the HTML content
    const html = await response.text();

    // Extract the image URL using regex
    const imageUrl = extractImageUrl(html, url);

    if (imageUrl) {
      console.log(`[EDGE] Found image URL: ${imageUrl}`);

      // Update cache
      cache[url] = {
        url: imageUrl,
        timestamp: Date.now(),
      };

      return new Response(JSON.stringify({ imageUrl }), {
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    console.log("[EDGE] No image found");
    return new Response(JSON.stringify({ error: "No image found" }), {
      status: 404,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error(
      `[EDGE] Error fetching preview: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return new Response(JSON.stringify({ error: "Failed to fetch preview" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
