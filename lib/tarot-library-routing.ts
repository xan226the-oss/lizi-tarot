export function parseLibraryCardId(raw: string) {
  if (!/^(?:[1-9]|[1-6][0-9]|7[0-8])$/.test(raw)) return null;
  return Number(raw);
}

export function getAdjacentLibraryCardIds(cardId: number) {
  return {
    previousCardId: cardId > 1 && cardId <= 78 ? cardId - 1 : null,
    nextCardId: cardId >= 1 && cardId < 78 ? cardId + 1 : null
  };
}
