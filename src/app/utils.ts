import type { ChoiceEntry, Family } from "./types";
import { categories, itemsByCategory } from "./items";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function nowIsraelLabel(): { dateLabel: string; timeLabel: string } {
  const d = new Date();
  // This will be local time on device; that's fine for message display.
  const dateLabel = `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
  const timeLabel = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  return { dateLabel, timeLabel };
}

export function buildMessage(family: Family, entries: Array<ChoiceEntry & { childName: string }>, filledAtLabel: string) {
  const { dateLabel } = nowIsraelLabel();
  const header = `🥪 קופסת אוכל למחר | ${dateLabel} | מולא ב-${filledAtLabel}`;

  const lines: string[] = [header, ""];
  for (const en of entries) {
    // WhatsApp bold is with * *
    lines.push(`*${en.childName}*:`);

    for (const cat of categories) {
      const selected = (en as any)[cat.key] as string[];
      const other = (en as any)[cat.key + "Other"] as string;

      const items = itemsByCategory[cat.key];
      const pretty: string[] = [];
      for (const id of selected || []) {
        const it = items.find(x => x.id === id);
        if (it) pretty.push(`${it.emoji} ${it.label}`);
      }
      if (other && other.trim()) pretty.push(`✍️ ${other.trim()}`);

      if (pretty.length > 0) {
        const catTitle =
          cat.key === "carb" ? "🍞 פחמימה" :
          cat.key === "spread" ? "🥣 ממרח" :
          cat.key === "protein" ? "🍳 חלבון" :
          cat.key === "veg" ? "🥕 ירק" :
          "🍎 פרי";
        lines.push(`${catTitle}: ${pretty.join(", ")}`);
      }
    }
    lines.push("");
  }

  lines.push("תודה 😄");
  return lines.join("\n");
}

export function encodeForWhatsApp(text: string) {
  return encodeURIComponent(text);
}

export function encodeForMailto(text: string) {
  // mailto prefers %0A line breaks
  return encodeURIComponent(text);
}
