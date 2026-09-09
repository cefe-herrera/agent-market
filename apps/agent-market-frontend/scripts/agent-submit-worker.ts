#!/usr/bin/env npx tsx
/**
 * Polls FUNDED 8183 jobs for AGENT_SAFE_ADDRESS and submits a stub
 * via the session key (POST NEXT_PUBLIC_AGENT_8183_SUBMIT_API).
 *
 *   npx tsx scripts/agent-submit-worker.ts
 *
 * Needs the Next app running. Secrets stay in .env.local (never NEXT_PUBLIC_).
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const BASE = (process.env.AGENT_WORKER_URL ?? "").replace(/\/$/, "");
if (!BASE) {
  throw new Error("Missing AGENT_WORKER_URL in env");
}
const SUBMIT = process.env.NEXT_PUBLIC_AGENT_8183_SUBMIT_API?.trim();
if (!SUBMIT) {
  throw new Error("Missing NEXT_PUBLIC_AGENT_8183_SUBMIT_API in env");
}
const SECRET = process.env.AGENT_WORKER_SECRET ?? "";
const INTERVAL_MS = Number(process.env.AGENT_WORKER_INTERVAL_MS ?? 15_000);

async function tick() {
  const res = await fetch(`${BASE}${SUBMIT.startsWith("/") ? SUBMIT : `/${SUBMIT}`}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(SECRET ? { "x-worker-secret": SECRET } : {}),
    },
    body: "{}",
  });
  const body = await res.json().catch(() => ({}));
  const stamp = new Date().toISOString();
  if (!res.ok) {
    console.error(`[${stamp}] submit failed ${res.status}`, body);
    return;
  }
  if (body.submitted) {
    console.info(`[${stamp}] submitted job #${body.jobId} tx=${body.tx}`);
  } else {
    console.info(`[${stamp}] idle pending=${(body.pending ?? []).length}`);
  }
}

async function main() {
  console.info(`8183 submit worker → ${BASE} every ${INTERVAL_MS}ms`);
  for (;;) {
    try {
      await tick();
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
    }
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }
}

void main();
