import type { MessageResponse, ParsedMessageData, ContentPart, UIMessage, UIToolCall, ConversationTurn, TaskStep } from "./types";
import { getToolType, getToolLabel, getToolDisplayValue, isHiddenTool } from "./tool-labels";

export function convertMessages(raw: MessageResponse[]): UIMessage[] {
  const visible = raw.filter((m) => !m.hidden);
  const parsed = visible.map((m) => ({ ...m, parsed: safeParseData(m.data) }));
  const toolResults = new Map<string, string>();
  for (const msg of parsed) if (msg.role === "tool" && msg.parsed.tool_call_id) toolResults.set(msg.parsed.tool_call_id, extractTextContent(msg.parsed.content));
  const result: UIMessage[] = [];
  for (const msg of parsed) {
    if (msg.role === "tool") continue;
    if (msg.role === "user") {
      const content = extractTextContent(msg.parsed.content).trim();
      if (content) result.push({ id: msg.id, role: "user", content, createdAt: msg.createdAt });
      continue;
    }
    const content = extractTextContent(msg.parsed.content);
    const toolCalls: UIToolCall[] = [];
    for (const tc of msg.parsed.tool_calls ?? []) {
      if (!tc?.function || isHiddenTool(tc.function.name)) continue;
      let args: Record<string, unknown> = {};
      try { args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {}; } catch {}
      const hasResult = toolResults.has(tc.id);
      toolCalls.push({ id: tc.id, name: tc.function.name, displayName: getToolLabel(tc.function.name, hasResult ? "completed" : "running"), displayValue: getToolDisplayValue(tc.function.name, args), args, status: hasResult ? "completed" : "running", result: toolResults.get(tc.id), type: getToolType(tc.function.name) });
    }
    if (content || toolCalls.length) result.push({ id: msg.id, role: "assistant", content, toolCalls: toolCalls.length ? toolCalls : undefined, createdAt: msg.createdAt });
  }
  return result;
}

export function groupIntoTurns(messages: UIMessage[]): ConversationTurn[] {
  const turns: ConversationTurn[] = [];
  let i = 0;
  while (i < messages.length) {
    const msg = messages[i];
    if (msg.role !== "user") { i++; continue; }
    const userMsg = msg;
    const assistantMsgs: UIMessage[] = [];
    i++;
    while (i < messages.length && messages[i].role === "assistant") assistantMsgs.push(messages[i++]);
    const steps: TaskStep[] = [];
    let finalContent = "";
    let stepCounter = 0;
    for (const aMsg of assistantMsgs) {
      if (aMsg.toolCalls?.length) {
        stepCounter++;
        const allDone = aMsg.toolCalls.every((tc) => tc.status === "completed" || tc.status === "error");
        steps.push({ id: `step-${userMsg.id}-${stepCounter}`, title: extractStepTitle(aMsg.content) || `Step ${stepCounter}`, status: allDone ? "completed" : "in_progress", toolCalls: aMsg.toolCalls });
      }
      if (aMsg.content && !aMsg.toolCalls?.length) finalContent = aMsg.content;
    }
    turns.push({ id: `turn-${userMsg.id}`, userMessage: userMsg, steps, finalContent, isComplete: !!finalContent });
  }
  return turns;
}

function safeParseData(data: string): ParsedMessageData { try { return JSON.parse(data); } catch { return { content: data }; } }
function extractTextContent(content: string | ContentPart[] | null | undefined): string { if (!content) return ""; if (typeof content === "string") return content; return content.filter((p) => p.type === "text" && !!p.text).map((p) => p.text).join("\n"); }
function extractStepTitle(content: string): string | null { const first = content?.split("\n")[0]?.trim() ?? ""; return first.length > 2 && first.length < 120 ? first : null; }
