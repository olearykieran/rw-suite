This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

Vendors logic is hardcoded, need to fix that.

Left off on:
Need to fix z-index of top doropdown on gannt page

I want you to extract information from this Twitter/X post URL: [PASTE_URL_HERE]

DO NOT suggest using the Twitter API. Instead, please look at the content of the post and return ONLY a JSON object with the following structure, filled with the actual data from the post:

[
{
"title": "Sauna culture in NYC is exploding. Went to @othership_us…",
"url": "https://x.com/c_gro/status/1893710132816560311",
"type": "twitter",
"source": "c_gro",
"author": "Connor Gross",
"date": "2025-02-24",
"tags": [
"Sauna",
"NYC",
"Wellness",
"Health"
],
"summary": "Sauna culture in NYC is exploding. Went to @othership_us yesterday and it was a packed house. Friends in their 20's choosing a 75-minute sauna session over a night out.",
"image": "",
"likes": 123,
"shares": 45,
"comments": 67
}
]

Return ONLY the JSON object with no additional explanation or suggestions.

I need to extract information from this Instagram post URL: [PASTE_URL_HERE]

Please analyze the post and return the data in the following JSON format:

{
"title": "First 50-60 characters of the caption...",
"url": "The full URL of the post",
"type": "instagram",
"source": "username without the @ symbol",
"author": "Full name of the account owner",
"date": "YYYY-MM-DD (post date in ISO format)",
"tags": ["relevant", "hashtags", "from", "post", "or", "topics"],
"summary": "Full caption of the post",
"image": "URL to the main image in the post (if available)",
"likes": 123,
"comments": 67
}

## Working Examples

### Twitter/X Example

```json
[
  {
    "title": "Sauna culture in NYC is exploding. Went to @othership_us…",
    "url": "https://x.com/c_gro/status/1893710132816560311",
    "type": "twitter",
    "source": "c_gro",
    "author": "Connor Gross",
    "date": "2025-02-24",
    "tags": ["Sauna", "NYC", "Wellness", "Health"],
    "summary": "Sauna culture in NYC is exploding. Went to @othership_us yesterday and it was a packed house. Friends in their 20's choosing a 75-minute sauna session over a night out.",
    "image": "https://pbs.twimg.com/media/F9kLm2XXsAA7TBD?format=jpg",
    "likes": 123,
    "shares": 45,
    "comments": 67
  }
]
```

### Publication Example

```json
[
  {
    "title": "How Businesses Can Tap Into Gen Z's Passion for Fitness and Health",
    "url": "https://www.entrepreneur.com/eu/growing-a-business/how-businesses-can-tap-into-gen-zs-passion-for-fitness-and/486711",
    "type": "Article",
    "source": "Entrepreneur",
    "author": "Entrepreneur Staff (Exact author unknown)",
    "date": "2023-09-15",
    "tags": ["Gen Z", "Fitness Industry", "Business Strategy"],
    "summary": "This article explores how companies can engage Gen Z consumers by focusing on authentic fitness, wellness, and community experiences, ultimately driving growth and loyalty.",
    "notes": "Highlights the importance of social media, genuine brand values, and inclusive wellness initiatives to capture Gen Z's attention."
  }
]
```

## Publication Format

I need to extract information from this publication URL: [PASTE_URL_HERE]

Please return ONLY a JSON object with the following structure, filled with the actual data from the article:

```json
[
  {
    "title": "Full title of the article",
    "url": "[PASTE_URL_HERE]",
    "type": "Article",
    "source": "Publication name (e.g., Entrepreneur, New York Times)",
    "author": "Author's name (or publication if no specific author)",
    "date": "YYYY-MM-DD (publication date in ISO format)",
    "tags": ["relevant", "keywords", "from", "article"],
    "summary": "Brief summary of the article's main points",
    "notes": "Optional personal notes or key takeaways from the article"
  }
]
```

Return ONLY the JSON object with no additional explanation or suggestions.
