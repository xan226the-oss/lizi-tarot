export const CHAT_MESSAGE_MIN_LENGTH = 2;
export const CHAT_MESSAGE_MAX_LENGTH = 600;
export const CHAT_HISTORY_MAX_ITEMS = 8;
export const CHAT_HISTORY_ITEM_MAX_LENGTH = 600;
export type ChatHistoryItem = { role: "user" | "assistant"; content: string };
export type ParsedChatMessageRequest = { message: string; history: ChatHistoryItem[]; ageConfirmed: true; aiDisclosureConfirmed: true };
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const boundedText = (value: unknown, min: number, max: number): string | null => { if (typeof value !== "string") return null; const trimmed = value.trim(); return trimmed.length >= min && trimmed.length <= max ? trimmed : null; };
export function parseChatCardId(value: unknown): number | null { if (typeof value !== "string" || !/^(?:[1-9]|1\d|2[0-2])$/.test(value)) return null; const id = Number(value); return id >= 1 && id <= 22 ? id : null; }
export function parseChatMessageRequest(value: unknown): ParsedChatMessageRequest | null {
  if (!isRecord(value) || value.ageConfirmed !== true || value.aiDisclosureConfirmed !== true || !Array.isArray(value.history) || value.history.length > CHAT_HISTORY_MAX_ITEMS) return null;
  const message = boundedText(value.message, CHAT_MESSAGE_MIN_LENGTH, CHAT_MESSAGE_MAX_LENGTH); if (!message) return null;
  const history: ChatHistoryItem[] = [];
  for (const item of value.history) { if (!isRecord(item) || (item.role !== "user" && item.role !== "assistant")) return null; const content = boundedText(item.content, CHAT_MESSAGE_MIN_LENGTH, CHAT_HISTORY_ITEM_MAX_LENGTH); if (!content) return null; history.push({ role: item.role, content }); }
  return { message, history, ageConfirmed: true, aiDisclosureConfirmed: true };
}
