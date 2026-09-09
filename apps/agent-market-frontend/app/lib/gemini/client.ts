import "server-only";

const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
] as const;

export function geminiApiKey(): string {
  return process.env.GEMINI_API_KEY?.trim() || "";
}

export function isGeminiConfigured(): boolean {
  return geminiApiKey().length > 0;
}

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string };
};

function extractText(body: GeminiResponse): string {
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error(body.error?.message || "Gemini returned empty text");
  }
  return text.trim();
}

function parseJsonObject(text: string): Record<string, unknown> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced?.[1] ?? text).trim();
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Gemini JSON was not an object");
  }
  return parsed as Record<string, unknown>;
}

export async function geminiJson(prompt: string): Promise<Record<string, unknown>> {
  const key = geminiApiKey();
  if (!key) {
    throw new Error("GEMINI_API_KEY missing — server only, never NEXT_PUBLIC_.");
  }

  let lastError: Error | null = null;
  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              responseMimeType: "application/json",
            },
          }),
        },
      );
      const body = (await res.json()) as GeminiResponse;
      if (!res.ok) {
        lastError = new Error(
          body.error?.message || `Gemini ${model} HTTP ${res.status}`,
        );
        continue;
      }
      return parseJsonObject(extractText(body));
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastError ?? new Error("Gemini failed");
}
