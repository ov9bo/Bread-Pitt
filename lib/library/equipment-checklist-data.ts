export type EquipmentChecklistRow = {
  id: string;
  label: string;
};

/** Stable ids for localStorage; labels mirror sourdough_complete_guide.md bullets. */
export const EQUIPMENT_CHECKLIST_ITEMS: EquipmentChecklistRow[] = [
  {
    id: "jar-large-clear",
    label:
      "1 large, tall, clear glass jar with a loose-fitting lid (must hold 3× the volume of starter)",
  },
  { id: "jar-second", label: "1 second identical jar (you'll need it from Day 2 onward)" },
  { id: "jar-levain", label: "1 small resealable glass jar (for the levain)" },
  {
    id: "scale-grams",
    label: "Digital kitchen scale (grams) — non-negotiable; this recipe is gram-precise",
  },
  { id: "whisk-mini", label: "Mini whisk" },
  { id: "spatula-rubber", label: "Rubber spatula" },
  { id: "spoon-wooden", label: "Wooden spoon" },
  { id: "bowls-mixing", label: "4–5 mixing bowls (medium and large)" },
  { id: "bench-scraper", label: "Bench scraper (plastic preferred)" },
  { id: "banneton", label: "Banneton / proofing basket (≈ 9-inch round)" },
  { id: "towel-banneton", label: "Clean tea towel or linen liner for the banneton" },
  { id: "plastic-cover", label: "Plastic wrap (or a reusable cover)" },
  { id: "bag-large", label: "Large plastic bag (kitchen bin liner works)" },
  { id: "dutch-oven", label: "Dutch oven with lid (cast iron, holds 500°F)" },
  { id: "parchment", label: "Parchment paper" },
  { id: "lame", label: "Lame, razor blade, or very sharp paring knife" },
  {
    id: "stand-mixer",
    label:
      "Stand mixer with whisk attachment (only for the butter — skip if you're not making butter)",
  },
  { id: "rubber-band", label: "Rubber band (for marking starter growth)" },
  {
    id: "rice-flour-white",
    label: "White rice flour (for dusting the banneton — does not burn, won't stick)",
  },
];

/** Matches `{docSlug}--equipment-checklist` from parseGuide (GitHub slugger). */
export function isEquipmentChecklistSlug(slug: string): boolean {
  return slug.endsWith("--equipment-checklist");
}

/**
 * Removes the first top-level `<ul>…</ul>` from rendered guide HTML. Used when the DB
 * still holds a pre-interactive equipment bullet list after markdown was trimmed; avoids
 * duplicating the interactive checklist.
 */
export function stripEquipmentChecklistStaticList(html: string): string {
  return html.replace(/<ul\b[^>]*>[\s\S]*?<\/ul>/i, "").trim();
}
