import type { Allergy } from "./types";

export type Item = { id: string; label: string; emoji: string; blocks?: Allergy[] };

export type CategoryKey = "carb" | "spread" | "protein" | "veg" | "fruit";

export const categories: Array<{ key: CategoryKey; title: string; otherLabel: string }> = [
  { key: "carb", title: "פחמימה", otherLabel: "אחר (פחמימה)" },
  { key: "spread", title: "ממרח", otherLabel: "אחר (ממרח)" },
  { key: "protein", title: "חלבון", otherLabel: "אחר (חלבון)" },
  { key: "veg", title: "ירק", otherLabel: "אחר (ירק)" },
  { key: "fruit", title: "פרי", otherLabel: "אחר (פרי)" },
];

export const allergyLabels: Record<Allergy, string> = {
  peanut: "אלרגיה לבוטנים",
  milk: "אלרגיה לחלב",
  sesame: "אלרגיה לשומשום",
};

export const itemsByCategory: Record<CategoryKey, Item[]> = {
  carb: [
    { id: "white_bread", label: "לחם לבן", emoji: "🍞" },
    { id: "brown_bread", label: "לחם חום", emoji: "🍞" },
    { id: "roll", label: "לחמניה", emoji: "🥖" },
    { id: "pita", label: "פיתה", emoji: "🫓" },
    { id: "toast", label: "טוסט", emoji: "🥪" },
    { id: "tortilla", label: "טורטיה", emoji: "🌯" },
  ],
  spread: [
    { id: "tahini", label: "טחינה", emoji: "🥣", blocks: ["sesame"] },
    { id: "hummus", label: "חומוס", emoji: "🫘", blocks: ["sesame"] },
    { id: "white_cheese", label: "גבינה לבנה", emoji: "🍶", blocks: ["milk"] },
    { id: "yellow_cheese", label: "גבינה צהובה", emoji: "🧀", blocks: ["milk"] },
    { id: "mayo", label: "מיונז", emoji: "🥚" },
    { id: "peanut_butter", label: "חמאת בוטנים", emoji: "🥜", blocks: ["peanut"] },
    { id: "honey", label: "דבש", emoji: "🍯" },
    { id: "chocolate", label: "שוקולד", emoji: "🍫" },
    { id: "jam", label: "ריבה", emoji: "🍓" },
    { id: "avocado", label: "אבוקדו", emoji: "🥑" },
  ],
  protein: [
    { id: "tuna", label: "טונה", emoji: "🐟" },
    { id: "fried_egg", label: "ביצת עין", emoji: "🍳" },
    { id: "omelet", label: "חביתה", emoji: "🥘" },
  ],
  veg: [
    { id: "cucumber", label: "מלפפון", emoji: "🥒" },
    { id: "pepper", label: "גמבה", emoji: "🫑" },
    { id: "cherry_tomatoes", label: "עגבניות שרי", emoji: "🍅" },
    { id: "lettuce", label: "חסה", emoji: "🥬" },
    { id: "carrot", label: "גזר", emoji: "🥕" },
    { id: "corn", label: "תירס", emoji: "🌽" },
  ],
  fruit: [
    { id: "red_apple", label: "תפוח אדום", emoji: "🍎" },
    { id: "green_apple", label: "תפוח ירוק", emoji: "🍏" },
    { id: "banana", label: "בננה", emoji: "🍌" },
    { id: "grapefruit", label: "אשכולית", emoji: "🍋" },
    { id: "clementine", label: "קלמנטינה", emoji: "🍊" },
    { id: "orange", label: "תפוז", emoji: "🍊" },
  ],
};

export function isBlocked(item: Item, allergies: Allergy[]): boolean {
  if (!item.blocks || item.blocks.length === 0) return false;
  return item.blocks.some(a => allergies.includes(a));
}
