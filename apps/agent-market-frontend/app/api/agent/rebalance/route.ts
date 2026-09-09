import { NextResponse } from "next/server";
import { REBALANCE_SKILLS } from "@/app/lib/gemini/skills";
import { getRebalanceCard } from "@/app/lib/rebalance/snapshot";

export const dynamic = "force-dynamic";

export async function GET() {
  const card = await getRebalanceCard();
  return NextResponse.json(
    {
      ...card,
      skills: REBALANCE_SKILLS.map(({ id, name, description, tags }) => ({
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
