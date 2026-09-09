import { NextResponse } from "next/server";
import { YIELD_SKILLS } from "@/app/lib/gemini/skills";
import { getYieldCard } from "@/app/lib/yield/snapshot";

export const dynamic = "force-dynamic";

export async function GET() {
  const card = await getYieldCard();
  return NextResponse.json(
    {
      ...card,
      skills: YIELD_SKILLS.map(({ id, name, description, tags }) => ({
        id,
        name,
        description,
        tags,
      })),
    },
    {
      headers: { "Cache-Control": "public, s-maxage=45, stale-while-revalidate=30" },
    },
  );
}
