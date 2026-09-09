import { NextResponse } from "next/server";
import { GRID_SKILLS } from "@/app/lib/gemini/skills";
import { getGridCard } from "@/app/lib/grid/snapshot";

export const dynamic = "force-dynamic";

export async function GET() {
  const card = await getGridCard();
  return NextResponse.json(
    {
      ...card,
      skills: GRID_SKILLS.map(({ id, name, description, tags }) => ({
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
