export function parseLibraryCardId(raw: string) {
  if (!/^(?:[1-9]|[1-6][0-9]|7[0-8])$/.test(raw)) return null;
  return Number(raw);
}

export function getAdjacentLibraryCardIds(cardId: number) {
  if (!Number.isInteger(cardId) || cardId < 1 || cardId > 78) {
    return { previousCardId: null, nextCardId: null };
  }

  return {
    previousCardId: cardId === 1 ? null : cardId - 1,
    nextCardId: cardId === 78 ? null : cardId + 1
  };
}
