import { NextResponse } from "next/server";
import {
  buildDeepSeekMessages,
  getInterpretationLengthProfile,
  parseDeepSeekContent
} from "@/lib/deepseek";
import { normalizeInterpretationRequest } from "@/lib/interpretation-request";

export const runtime = "nodejs";

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const GENERIC_ERROR =
  "综合解读服务暂时不可用，完整牌阵与单张牌意仍可正常查看。";

function upstreamErrorMessage(status: number) {
  if (status === 429) return "解读请求较多，请稍等片刻再试。";
  return GENERIC_ERROR;
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "请求内容不是有效 JSON。" }, { status: 400 });
  }

  const normalized = normalizeInterpretationRequest(payload);
  if (!normalized) {
    return NextResponse.json(
      { error: "牌阵数据不完整或不匹配。" },
      { status: 400 }
    );
  }

  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 503 });
  }

  const lengthProfile = getInterpretationLengthProfile(normalized.cards.length);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 28000);

  try {
    const upstream = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL?.trim() || "deepseek-v4-flash",
        messages: buildDeepSeekMessages(normalized),
        response_format: { type: "json_object" },
        thinking: { type: "disabled" },
        temperature: 0.72,
        max_tokens: lengthProfile.maxTokens,
        stream: false
      }),
      cache: "no-store",
      signal: controller.signal
    });

    if (!upstream.ok) {
      console.error("Interpretation upstream request failed", {
        category: "upstream-http",
        status: upstream.status
      });
      return NextResponse.json(
        { error: upstreamErrorMessage(upstream.status) },
        { status: upstream.status === 429 ? 429 : 502 }
      );
    }

    const data = (await upstream.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    return NextResponse.json(parseDeepSeekContent(content));
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "AbortError";
    console.error("Interpretation upstream request failed", {
      category: timedOut ? "timeout" : "invalid-upstream-response"
    });
    return NextResponse.json(
      {
        error: timedOut
          ? "综合解读等待超时，请重新尝试。"
          : GENERIC_ERROR
      },
      { status: 503 }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
