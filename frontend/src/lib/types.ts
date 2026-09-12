export interface MessageResponse { id: string; role: "user" | "assistant" | "tool"; data: string; createdAt: string; hidden?: boolean; }
export interface ParsedMessageData { content?: string | ContentPart[] | null; tool_calls?: OpenAIToolCall[]; tool_call_id?: string; }
export interface ContentPart { type: "text" | "image_url"; text?: string; image_url?: { url: string }; }
export interface OpenAIToolCall { id: string; type: "function"; function: { name: string; arguments: string }; }
export interface ModelPreset { value: string; label: string; }
export interface BrowserSettings {
  browserBinaryPath: string;
  browserUserDataDir: string;
  useOwnBrowser: boolean;
  keepBrowserOpen: boolean;
  headless: boolean;
  disableSecurity: boolean;
  cdpUrl: string;
  windowWidth: number;
  windowHeight: number;
  saveRecordingPath: string;
  tracePath: string;
  saveDownloadPath: string;
  saveAgentHistoryPath: string;
}
export interface AgentSettings {
  maxSteps: number;
  maxActionsPerStep: number;
  useVision: boolean;
  generateGif: boolean;
  enablePlanning: boolean;
  planningReplanOnStall: number;
  planningExplorationLimit: number;
}
export interface UIMessage { id: string; role: "user" | "assistant"; content: string; toolCalls?: UIToolCall[]; createdAt: string; }
export interface UIToolCall { id: string; name: string; displayName: string; displayValue: string; args: Record<string, unknown>; status: ToolStatus; result?: string; isError?: boolean; type: ToolCallType; }
export type ToolStatus = "pending" | "running" | "completed" | "error";
export type ToolCallType = "browse" | "click" | "type" | "scroll" | "search" | "wait" | "screenshot" | "read_file" | "create_file" | "edit_file" | "bash" | "glob" | "grep" | "integration" | "unknown";
export interface TaskStep { id: string; title: string; status: "in_progress" | "completed" | "error"; toolCalls: UIToolCall[]; }
export interface ConversationTurn { id: string; userMessage: UIMessage; steps: TaskStep[]; finalContent: string; isComplete: boolean; }
