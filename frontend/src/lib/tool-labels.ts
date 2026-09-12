import type { ToolCallType, ToolStatus } from "./types";

const TYPE_MAP: Record<string, ToolCallType> = {
  bash: "bash", shell: "bash", execute_command: "bash",
  read: "read_file", read_file: "read_file",
  write: "create_file", create_file: "create_file",
  edit: "edit_file", multi_edit: "edit_file", edit_file: "edit_file",
  browser_navigate: "browse", go_to_url: "browse", navigate: "browse", navigate_to_url: "browse",
  browser_click: "click", click_element: "click", click: "click",
  browser_type: "type", type_text: "type", input_text: "type",
  browser_scroll: "scroll", scroll: "scroll",
  web_search: "search", browser_search: "search", search: "search",
  browser_wait: "wait", wait: "wait", sleep: "wait",
  screenshot: "screenshot", take_screenshot: "screenshot", browser_screenshot: "screenshot",
  glob: "glob", grep: "grep",
};
const LABELS: Record<string, [string, string]> = {
  browse: ["Navigating", "Navigated"], click: ["Clicking", "Clicked"], type: ["Typing", "Typed"], scroll: ["Scrolling", "Scrolled"], search: ["Searching", "Searched"], wait: ["Waiting", "Waited"], screenshot: ["Taking screenshot", "Took screenshot"], read_file: ["Reading file", "Read file"], create_file: ["Creating file", "Created file"], edit_file: ["Editing file", "Edited file"], bash: ["Running command", "Ran command"], glob: ["Finding files", "Found files"], grep: ["Searching code", "Searched code"], integration: ["Running integration", "Ran integration"], unknown: ["Running", "Ran"],
};
export function getToolType(name?: string): ToolCallType { return name ? (TYPE_MAP[name] ?? "unknown") : "unknown"; }
export function getToolLabel(name?: string, status: ToolStatus = "pending"): string { const pair = LABELS[getToolType(name)] ?? LABELS.unknown; return status === "completed" || status === "error" ? pair[1] : pair[0]; }
export function getToolDisplayValue(name?: string, args?: Record<string, unknown>): string {
  if (!name || !args) return "";
  const type = getToolType(name);
  const value = type === "browse" ? args.url : type === "search" ? args.query : type === "type" ? args.text : type === "bash" ? (args.command ?? args.cmd) : (args.file_path ?? args.path ?? args.target);
  const s = value == null ? "" : String(value);
  return s.length > 60 ? s.slice(0, 60) + "…" : s;
}
export function isHiddenTool(name: string): boolean { return new Set(["browser_state", "done_autonomous", "todo_write"]).has(name); }
