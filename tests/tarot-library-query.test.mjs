import assert from "node:assert/strict";
import test from "node:test";

import {
  createLibraryIntentController,
  filterLibraryCards,
  getTarotArtworkTone,
  readLibraryFilters,
  toLibrarySearchParams
} from "../lib/tarot-library-query.ts";
import { tarotCards } from "../lib/tarot-cards.ts";
import { getTarotLibraryEntry } from "../lib/tarot-library.ts";

const records = tarotCards.map((card) => ({
  card,
  library: getTarotLibraryEntry(card.id)
}));

function params(value) {
  return new URLSearchParams(value);
}

function libraryHref(filters) {
  const searchParams = toLibrarySearchParams(filters).toString();
  return searchParams ? `/library?${searchParams}` : "/library";
}

function filtersFromHref(href) {
  return readLibraryFilters(new URL(href, "https://library.test").searchParams);
}

function createDelayedRouter(controller) {
  const submissions = [];

  return {
    submissions,
    push(filters) {
      submissions.push({ method: "push", href: libraryHref(filters) });
    },
    replace(filters) {
      submissions.push({ method: "replace", href: libraryHref(filters) });
    },
    commit(index) {
      controller.observe(filtersFromHref(submissions[index].href));
    },
    observe(href) {
      controller.observe(filtersFromHref(href));
    }
  };
}

test("searches Chinese name, English name, keyword and both meanings", () => {
  for (const query of ["愚者", "the fool", "冒险", "新的道路", "确认边界"]) {
    const result = filterLibraryCards(records, { q: query, arcana: "all", suit: "all" });
    assert.equal(result[0].card.id, 1, query);
  }
});

test("sorts empty and filtered results numerically without mutating input order", () => {
  const reversedRecords = [...records].reverse();
  const inputIds = reversedRecords.map(({ card }) => card.id);

  const all = filterLibraryCards(reversedRecords, { q: "", arcana: "all", suit: "all" });
  assert.deepEqual(
    all.map(({ card }) => card.id),
    Array.from({ length: 78 }, (_, i) => i + 1)
  );

  const cups = filterLibraryCards(reversedRecords, {
    q: "",
    arcana: "minor",
    suit: "cups"
  });
  assert.equal(cups.length, 14);
  assert.deepEqual(cups.map(({ card }) => card.id), Array.from({ length: 14 }, (_, i) => i + 37));
  assert.deepEqual(
    filterLibraryCards(reversedRecords, { q: "", arcana: "major", suit: "cups" }),
    []
  );
  assert.deepEqual(reversedRecords.map(({ card }) => card.id), inputIds);
});

test("invalid URL values fall back safely", () => {
  assert.deepEqual(readLibraryFilters(params("q=%20Fool%20&arcana=broken&suit=coins")), {
    q: "Fool",
    arcana: "all",
    suit: "all"
  });
});

test("serialization omits defaults and round-trips non-default state", () => {
  assert.equal(toLibrarySearchParams({ q: "", arcana: "all", suit: "all" }).toString(), "");
  const state = { q: "  希望 & + hope  ", arcana: "minor", suit: "cups" };
  const searchParams = toLibrarySearchParams(state);
  assert.equal(
    searchParams.toString(),
    "q=%E5%B8%8C%E6%9C%9B+%26+%2B+hope&arcana=minor&suit=cups"
  );
  assert.deepEqual(
    readLibraryFilters(searchParams),
    { q: "希望 & + hope", arcana: "minor", suit: "cups" }
  );
});

test("maps the loose canonical suit string to a safe artwork tone", () => {
  assert.equal(getTarotArtworkTone(tarotCards[0]), "major");
  assert.equal(getTarotArtworkTone(tarotCards[22]), "wands");
  assert.equal(getTarotArtworkTone(tarotCards[36]), "cups");
  assert.equal(getTarotArtworkTone(tarotCards[50]), "swords");
  assert.equal(getTarotArtworkTone(tarotCards[64]), "pentacles");
  assert.equal(getTarotArtworkTone({ ...tarotCards[22], suit: "unexpected" }), "major");
});

test("latest non-same-href intent survives delayed commits and resyncs after matching", () => {
  const controller = createLibraryIntentController({
    q: "",
    arcana: "all",
    suit: "all"
  });
  const delayedRouter = createDelayedRouter(controller);

  delayedRouter.push(controller.patch({ arcana: "major" }));
  delayedRouter.push(controller.patch({ suit: "cups" }));
  delayedRouter.replace(controller.patch({ q: "星" }));
  delayedRouter.replace(controller.patch({ q: "星星" }));

  assert.deepEqual(delayedRouter.submissions, [
    { method: "push", href: "/library?arcana=major" },
    { method: "push", href: "/library?arcana=major&suit=cups" },
    {
      method: "replace",
      href: "/library?q=%E6%98%9F&arcana=major&suit=cups"
    },
    {
      method: "replace",
      href: "/library?q=%E6%98%9F%E6%98%9F&arcana=major&suit=cups"
    }
  ]);
  assert.deepEqual(controller.getSnapshot(), {
    q: "星星",
    arcana: "major",
    suit: "cups"
  });

  delayedRouter.commit(0);
  assert.deepEqual(controller.getSnapshot(), {
    q: "星星",
    arcana: "major",
    suit: "cups"
  });

  delayedRouter.commit(delayedRouter.submissions.length - 1);
  controller.observe(filtersFromHref("/library?arcana=major"));
  assert.deepEqual(controller.getSnapshot(), {
    q: "",
    arcana: "major",
    suit: "all"
  });
});

test("same-href clear settles without a new observation and leaves back navigation unblocked", () => {
  const controller = createLibraryIntentController({
    q: "",
    arcana: "all",
    suit: "all"
  });
  const delayedRouter = createDelayedRouter(controller);
  const empty = { q: "", arcana: "all", suit: "all" };

  delayedRouter.push(controller.patch({ arcana: "major" }));
  delayedRouter.push(controller.patch({ suit: "cups" }));
  delayedRouter.push(controller.replace(empty));

  assert.deepEqual(controller.getSnapshot(), empty);
  delayedRouter.observe("/library?arcana=minor");
  assert.deepEqual(controller.getSnapshot(), {
    q: "",
    arcana: "minor",
    suit: "all"
  });
});

test("idle same-href navigation does not block a later back observation", () => {
  const controller = createLibraryIntentController({
    q: "",
    arcana: "major",
    suit: "all"
  });
  const delayedRouter = createDelayedRouter(controller);

  delayedRouter.push(controller.patch({ arcana: "major" }));
  delayedRouter.observe("/library");

  assert.deepEqual(controller.getSnapshot(), {
    q: "",
    arcana: "all",
    suit: "all"
  });
});

test("repeating the latest pending href ignores older different commits and then settles", () => {
  const controller = createLibraryIntentController({
    q: "",
    arcana: "all",
    suit: "all"
  });
  const delayedRouter = createDelayedRouter(controller);
  const cups = { q: "", arcana: "major", suit: "cups" };

  delayedRouter.push(controller.patch({ arcana: "major" }));
  delayedRouter.push(controller.patch({ suit: "cups" }));
  delayedRouter.push(controller.patch({ suit: "cups" }));

  delayedRouter.commit(0);
  assert.deepEqual(controller.getSnapshot(), cups);
  delayedRouter.commit(1);
  delayedRouter.observe("/library");
  assert.deepEqual(controller.getSnapshot(), {
    q: "",
    arcana: "all",
    suit: "all"
  });
});

test("authoritative restore cancels pending intent and leaves later commits functional", () => {
  const controller = createLibraryIntentController({
    q: "",
    arcana: "all",
    suit: "all"
  });
  let notifications = 0;
  const unsubscribe = controller.subscribe(() => {
    notifications += 1;
  });

  controller.patch({ arcana: "major" });
  controller.patch({ suit: "cups" });
  assert.equal(typeof controller.restore, "function");

  controller.restore(filtersFromHref("/library?arcana=minor"));
  assert.deepEqual(controller.getSnapshot(), {
    q: "",
    arcana: "minor",
    suit: "all"
  });

  const notificationsAfterRestore = notifications;
  const restoredSnapshot = controller.getSnapshot();
  controller.observe(filtersFromHref("/library?arcana=minor"));
  assert.strictEqual(controller.getSnapshot(), restoredSnapshot);
  assert.equal(notifications, notificationsAfterRestore);

  const nextIntent = controller.patch({ suit: "wands" });
  controller.observe(filtersFromHref(libraryHref(nextIntent)));
  assert.deepEqual(controller.getSnapshot(), {
    q: "",
    arcana: "minor",
    suit: "wands"
  });

  unsubscribe();
});
