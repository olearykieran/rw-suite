// src/app/public/about/page.tsx (adjust path if needed)

"use client";

import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";

export default function AboutPage() {
  return (
    <PageContainer>
      <h1 className="text-2xl font-bold flex flex-col items-center text-center mt-16 space-y-4">
        About
      </h1>
      {/* Center the content inside a max-width container */}
      <Card className="flex flex-col items-center text-center mt-16 space-y-4">
        <p className="font-medium">
          RW Suite is a modern construction management software
        </p>
      </Card>
    </PageContainer>
  );
}
