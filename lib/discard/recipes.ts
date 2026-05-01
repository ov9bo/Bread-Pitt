export type DiscardEffort = "survive" | "weekend" | "project";

export type DiscardRecipe = {
  key: string;
  name: string;
  blurb: string;
  effort: DiscardEffort;
  grams: number; // typical use
  emoji: string; // small visual marker for cards
};

export const DISCARD_RECIPES: DiscardRecipe[] = [
  // 🟢 Just survive
  {
    key: "pancakes",
    name: "Discard Pancakes",
    blurb: "Tangy, fluffy, addictive. The single most popular use.",
    effort: "survive",
    grams: 175,
    emoji: "🥞",
  },
  {
    key: "waffles",
    name: "Discard Waffles",
    blurb: "Same batter idea, slightly thinner. Begs for maple syrup.",
    effort: "survive",
    grams: 175,
    emoji: "🧇",
  },
  {
    key: "crackers",
    name: "Sourdough Crackers",
    blurb: "Spread thin, salt and herbs, bake until shattering crisp.",
    effort: "survive",
    grams: 200,
    emoji: "🍘",
  },
  {
    key: "flatbread",
    name: "Discard Flatbread",
    blurb: "Skillet, two minutes per side, hummus on standby.",
    effort: "survive",
    grams: 200,
    emoji: "🫓",
  },

  // 🟡 Weekend baker
  {
    key: "pizza",
    name: "Discard Pizza Dough",
    blurb: "Beats most takeout. One hour rest, then a hot oven.",
    effort: "weekend",
    grams: 150,
    emoji: "🍕",
  },
  {
    key: "biscuits",
    name: "Discard Biscuits",
    blurb: "Flaky, tangy, perfect with eggs and runny yolk.",
    effort: "weekend",
    grams: 150,
    emoji: "🥯",
  },
  {
    key: "banana_bread",
    name: "Discard Banana Bread",
    blurb: "100g of depth and quiet tang. Same trick works for zucchini.",
    effort: "weekend",
    grams: 100,
    emoji: "🍌",
  },
  {
    key: "muffins",
    name: "Discard Blueberry Muffins",
    blurb: "Subtle tang that makes a standard batter taste bakery-grade.",
    effort: "weekend",
    grams: 100,
    emoji: "🫐",
  },

  // 🔴 Project mode
  {
    key: "cinnamon_rolls",
    name: "Discard Cinnamon Rolls",
    blurb: "Overnight versions where the discard does the leavening.",
    effort: "project",
    grams: 200,
    emoji: "🌀",
  },
  {
    key: "english_muffins",
    name: "Discard English Muffins",
    blurb: "Griddled, not baked. Classic nooks and crannies.",
    effort: "project",
    grams: 200,
    emoji: "🫓",
  },
  {
    key: "cookies",
    name: "Discard Chocolate Chip Cookies",
    blurb: "Acidity sharpens the chocolate. Surprisingly excellent.",
    effort: "project",
    grams: 100,
    emoji: "🍪",
  },
  {
    key: "brownies",
    name: "Discard Brownies",
    blurb: "Fudgier, deeper chocolate. Replaces some of the flour.",
    effort: "project",
    grams: 100,
    emoji: "🟫",
  },
  {
    key: "pasta",
    name: "Discard Fresh Pasta",
    blurb: "Knead, rest, roll thin. Makes silky fettuccine.",
    effort: "project",
    grams: 150,
    emoji: "🍝",
  },
];

export const EFFORT_META: Record<DiscardEffort, { label: string; sub: string; tone: string }> = {
  survive: {
    label: "Just survive",
    sub: "5–10 minutes, no planning",
    tone: "var(--color-levain)",
  },
  weekend: {
    label: "Weekend baker",
    sub: "30–60 minutes",
    tone: "var(--color-butter)",
  },
  project: {
    label: "Project mode",
    sub: "Multiple hours, worth it",
    tone: "var(--color-crust)",
  },
};

export function getRecipe(key: string): DiscardRecipe | null {
  return DISCARD_RECIPES.find((r) => r.key === key) ?? null;
}
