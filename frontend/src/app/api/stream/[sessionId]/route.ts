const API = process.env.LOCAL_AGENT_API ?? "http://127.0.0.1:8000";
export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const body = await request.text();
  const upstream = await fetch(`${API}/sessions/${sessionId}/run`, { method: "POST", headers: { "Content-Type": "application/json" }, body, cache: "no-store" });
  if (!upstream.ok || !upstream.body) return new Response(await upstream.text(), { status: upstream.status });
  return new Response(upstream.body, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
}
