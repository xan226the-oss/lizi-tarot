export type ChatRisk = "crisis" | "underage" | "adult" | "manipulation" | "prediction" | "professional" | null;
const patterns: readonly [Exclude<ChatRisk, null>, RegExp][] = [
  ["crisis", /不想活|想自杀|结束生命|伤害自己/], ["underage", /未成年|十[二三四五六七]岁|初中生/], ["adult", /性爱|裸聊|色情|约炮/], ["manipulation", /让.{0,8}(离不开|爱上|听我的)|操控.{0,8}(他|她)/], ["prediction", /股票.*(涨|跌)|一定.{0,16}(复合|发财|涨|跌)|预测.*未来|吉凶/], ["professional", /诊断|处方|法律.*结论|投资建议/]
];
export function classifyChatRisk(input: string): ChatRisk { return patterns.find(([, pattern]) => pattern.test(input))?.[0] ?? null; }
const fallback: Record<Exclude<ChatRisk, null>, string> = {
  crisis: "听起来你现在可能正处在危险或非常难熬的时刻。请立刻联系你信任的人陪在身边，并联系当地紧急服务、危机干预热线或专业支持；此刻先把安全放在第一位。",
  underage: "这里是仅限成年人的体验，不能继续这类 AI 对话。请转向可信赖的成年人、学校支持或适合你年龄的专业资源。",
  adult: "我不能参与成人性内容。若你想讨论现实关系中的边界、尊重或安全，可以用非露骨的方式描述处境。",
  manipulation: "我不能帮助操控、让他人依赖或失去自主。我们可以改为聊如何清楚表达需要、尊重同意，并保护彼此边界。",
  prediction: "我不能预测未来、判断吉凶或保证结果。我们可以一起看已知信息、你的选择和一个可验证的小步骤。",
  professional: "我不能替代医疗、法律、财务或其他专业意见，也不能给确定结论。请咨询合格专业人士；这里可以帮你整理想问的问题和现实选项。"
};
export function getSafetyFallback(risk: Exclude<ChatRisk, null>): string { return fallback[risk]; }
export function guardChatReply(input: { inputRisk: ChatRisk; reply: string }): { content: string; replaced: boolean; reason: string } {
  if (input.inputRisk) return { content: getSafetyFallback(input.inputRisk), replaced: true, reason: "input-risk" };
  const reply = input.reply.trim(); const outputRisk = !reply || reply.length > 1600 ? "professional" : classifyChatRisk(reply);
  const romanceOrViolence = /我(爱你|只属于你|会永远陪着你)|去(伤害|报复)|杀了/;
  if (outputRisk || romanceOrViolence.test(reply)) return { content: getSafetyFallback(outputRisk ?? "manipulation"), replaced: true, reason: outputRisk ?? "unsafe-output" };
  return { content: reply, replaced: false, reason: "safe" };
}
