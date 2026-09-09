import { NextResponse } from "next/server";
import { HEALTH_SKILLS } from "@/app/lib/gemini/skills";
import { getHealthCard } from "@/app/lib/health/snapshot";

export const dynamic = "force-dynamic";

export async function GET() {
  const card = await getHealthCard();
  return NextResponse.json(
    {
      ...card,
      skills: HEALTH_SKILLS.map(({ id, name, description, tags }) => ({
        id,
        name,
        description,
        tags,
      })),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=45, stale-while-revalidate=30",
      },
    },
  );
}
