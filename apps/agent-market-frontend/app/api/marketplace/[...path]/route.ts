import { NextRequest } from "next/server";
import {
  IndexerHttpError,
  indexerAgentHealth,
  indexerAgentReputation,
  indexerOrigin,
  listIndexerAgents,
  marketplaceListFilters,
  resolveIndexerAgent,
} from "@/app/lib/indexer-bnb";
import { fetchAgentCardPreview } from "@/app/lib/agent-card";

export const maxDuration = 120;

type RouteCtx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  try {
    return await handle(path, req.nextUrl.search);
  } catch (err) {
    if (err instanceof IndexerHttpError) {
      return Response.json(
        { error: err.message, details: err.body },
        { status: err.status },
      );
    }
    return Response.json(
      {
        error: `Cannot reach indexer at ${indexerOrigin()}`,
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }
}

async function handle(path: string[], search: string): Promise<Response> {
  const filters = marketplaceListFilters(search);

  if (path.length === 1 && path[0] === "agents") {
    const result = await listIndexerAgents(filters);
    return Response.json(result);
  }

  if (path.length === 1 && path[0] === "featured") {
    const result = await listIndexerAgents({ ...filters, limit: 10, page: 1 });
    return Response.json(result.data);
  }

  if (path.length === 1 && path[0] === "stats") {
    const result = await listIndexerAgents({ ...filters, usable: false, limit: 1, page: 1 });
    return Response.json({
      agents: result.total,
      categories: 0,
      protocols: 0,
      verified: 0,
      studioAgents: 0,
      chains: 1,
      mainnetAgents: filters.isTestnet ? 0 : result.total,
      testnetAgents: filters.isTestnet ? result.total : 0,
    });
  }

  if (path.length === 1 && path[0] === "search") {
    const params = new URLSearchParams(
      search.startsWith("?") ? search.slice(1) : search,
    );
    const result = await listIndexerAgents({
      ...filters,
      search: params.get("q")?.trim() || filters.search,
    });
    return Response.json(result);
  }

  if (path[0] === "agents" && path[1]) {
    const id = path[1];
    if (path[2] === "card") {
      const card = await fetchAgentCardPreview(id);
      if (!card) {
        return Response.json(
          { error: "No Agent Card JSON found before payment" },
          { status: 404 },
        );
      }
      return Response.json(card);
    }
    if (path[2] === "a2a-health") {
      const health = await indexerAgentHealth(id);
      return Response.json(health);
    }
    if (path[2] === "reputation") {
      const reputation = await indexerAgentReputation(id);
      if (!reputation) {
        return Response.json({ error: "Agent not found" }, { status: 404 });
      }
      return Response.json(reputation);
    }
    if (!path[2]) {
      const agent = await resolveIndexerAgent(id);
      if (!agent) return Response.json({ error: "Agent not found" }, { status: 404 });
      return Response.json(agent);
    }
    if (path[2] === "activity" || path[2] === "feedback" || path[2] === "validations") {
      const agent = await resolveIndexerAgent(id);
      if (!agent) return Response.json({ error: "Agent not found" }, { status: 404 });
      const { status, json } = await fetch(
        `${indexerOrigin()}/api/v1/agents/${agent.id}/${path[2]}`,
        { cache: "no-store", headers: { Accept: "application/json" } },
      ).then(async (res) => ({
        status: res.status,
        json: await res.json().catch(() => null),
      }));
      return Response.json(json, { status });
    }
  }

  return Response.json(
    { error: `Provisional indexer API has no ${path.join("/")}` },
    { status: 404 },
  );
}
