import type { TarotOrientation } from "../tarot-cards.ts";

export function shuffleNormalDeck(
  cardIds: readonly number[],
  random: () => number = Math.random
) {
  const deck = [...cardIds];

  for (let index = deck.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [deck[index], deck[target]] = [deck[target], deck[index]];
  }

  return deck;
}

export function randomNormalOrientation(
  random: () => number = Math.random
): TarotOrientation {
  return random() < 0.5 ? "upright" : "reversed";
}
