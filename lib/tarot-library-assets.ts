import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

export function getAvailableTarotCardIds(rootDir = process.cwd()) {
  return Array.from({ length: 78 }, (_, index) => index + 1).filter((cardId) => {
    const cardPath = join(rootDir, "public", "images", "tarot", "cards", `${cardId}.webp`);
    return existsSync(cardPath) && statSync(cardPath).isFile();
  });
}
