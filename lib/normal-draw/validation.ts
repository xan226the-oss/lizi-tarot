export function validateNormalQuestion(question: string) {
  const trimmed = question.trim();
  const compact = trimmed.replace(/\s/g, "");

  if (trimmed.length > 240) return "问题请控制在 240 个字符以内";
  if (compact.length < 8) return "请写下至少 8 个字符的完整问题";
  if (!/[A-Za-z\u4e00-\u9fff]/.test(compact) || /^\d+$/.test(compact)) {
    return "请用文字描述你想询问的事";
  }

  const uniqueCharacters = new Set(Array.from(compact)).size;
  if (
    uniqueCharacters === 1 ||
    (compact.length >= 8 && uniqueCharacters / compact.length < 0.28)
  ) {
    return "请让问题更具体一些";
  }

  return null;
}
