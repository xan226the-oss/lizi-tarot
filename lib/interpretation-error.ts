const DEFAULT_INTERPRETATION_ERROR =
  "综合解读暂时未能生成，完整牌阵与单张牌意仍可正常查看。";

const TRANSIENT_ERROR_PATTERN = /请求较多|稍等|超时|重新尝试|再试/;

export function getPublicInterpretationError(message?: string) {
  const normalized = message?.trim();

  if (normalized && TRANSIENT_ERROR_PATTERN.test(normalized)) {
    return "综合解读暂时未能生成，请稍后重新尝试；完整牌阵与单张牌意仍可正常查看。";
  }

  return DEFAULT_INTERPRETATION_ERROR;
}
