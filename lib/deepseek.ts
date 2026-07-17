import type { NormalizedInterpretationRequest } from "./interpretation-request.ts";

export type DeepSeekMessage = {
  role: "system" | "user";
  content: string;
};

export type DeepSeekReadingResponse = {
  interpretation: string;
};

export type DeepSeekContentErrorCode =
  | "empty-content"
  | "invalid-json"
  | "missing-interpretation"
  | "interpretation-too-long";

export class DeepSeekContentError extends Error {
  readonly code: DeepSeekContentErrorCode;

  constructor(
    code: DeepSeekContentErrorCode,
    message: string
  ) {
    super(message);
    this.name = "DeepSeekContentError";
    this.code = code;
  }
}

export type InterpretationLengthProfile = {
  minCharacters: number;
  maxCharacters: number;
  maxTokens: 900 | 1200 | 1600 | 2200;
};

export type DeepSeekPromptInput = NormalizedInterpretationRequest;

function orientationLabel(orientation: "upright" | "reversed") {
  return orientation === "upright" ? "正位" : "逆位";
}

export function getInterpretationLengthProfile(
  cardCount: number
): InterpretationLengthProfile {
  if (!Number.isInteger(cardCount) || cardCount < 1 || cardCount > 12) {
    throw new Error("Unsupported interpretation card count");
  }
  if (cardCount <= 3) {
    return { minCharacters: 300, maxCharacters: 450, maxTokens: 900 };
  }
  if (cardCount <= 6) {
    return { minCharacters: 450, maxCharacters: 650, maxTokens: 1200 };
  }
  if (cardCount <= 9) {
    return { minCharacters: 650, maxCharacters: 900, maxTokens: 1600 };
  }
  return { minCharacters: 900, maxCharacters: 1200, maxTokens: 2200 };
}

export function buildDeepSeekMessages(
  input: DeepSeekPromptInput
): DeepSeekMessage[] {
  const length = getInterpretationLengthProfile(input.cards.length);
  const spreadPurpose = input.spreadPurpose
    ? `适用方向：${input.spreadPurpose}\n`
    : "";
  const cardContext = input.cards
    .map((card, index) => {
      const slotDescription = card.slotDescription
        ? `\n   牌位说明：${card.slotDescription}`
        : "";
      return (
        `${index + 1}. 牌位「${card.slotLabel}」${slotDescription}\n` +
        `   牌面：${card.cardName}（${orientationLabel(card.orientation)}）\n` +
        `   基础牌意：${card.meaning}\n` +
        `   关键词：${card.keywords.join("、")}`
      );
    })
    .join("\n\n");

  return [
    {
      role: "system",
      content:
        "你是一位克制、清晰、富有同理心的塔罗解读者。你必须把整个牌阵视为一个相互关联的答案，不得使用宿命论、恐吓、医疗诊断、法律结论或财务保证。把建议写成可执行的观察与行动。输出必须是合法 JSON，且只包含 interpretation 字段。"
    },
    {
      role: "user",
      content:
        `请为下面的「${input.spreadTitle}」生成一次综合解读。\n` +
        spreadPurpose +
        `用户问题：${input.question}\n\n` +
        `完整牌阵（按权威牌位顺序）：\n${cardContext}\n\n` +
        `输出一篇 ${length.minCharacters} 至 ${length.maxCharacters} 个中文字符的连续文章，不使用小标题、列表或 Markdown。` +
        "不要按“第一张、第二张”逐张复述，而要串联牌位之间的变化、张力、资源与方向。" +
        "在末段自然融入 2 至 3 个可执行建议，但不要把建议格式化为列表。\n\n" +
        '只返回以下 JSON 对象：{"interpretation":"综合解读正文"}'
    }
  ];
}

export function parseDeepSeekContent(content: string): DeepSeekReadingResponse {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new DeepSeekContentError(
      "empty-content",
      "DeepSeek returned empty content"
    );
  }

  const codeFenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const jsonContent = codeFenceMatch ? codeFenceMatch[1].trim() : trimmed;

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonContent);
  } catch {
    throw new DeepSeekContentError(
      "invalid-json",
      "DeepSeek returned invalid JSON"
    );
  }

  if (!parsed || typeof parsed !== "object") {
    throw new DeepSeekContentError(
      "missing-interpretation",
      "DeepSeek JSON did not contain an interpretation"
    );
  }

  const interpretation = (parsed as { interpretation?: unknown }).interpretation;
  if (typeof interpretation !== "string" || interpretation.trim().length === 0) {
    throw new DeepSeekContentError(
      "missing-interpretation",
      "DeepSeek JSON did not contain an interpretation"
    );
  }

  const normalized = interpretation.trim();
  if (normalized.length > 4000) {
    throw new DeepSeekContentError(
      "interpretation-too-long",
      "DeepSeek interpretation exceeded maximum length"
    );
  }

  return { interpretation: normalized };
}
