import type { ChoiceEntry, Family } from "./types";
import { categories, itemsByCategory } from "./items";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function nowIsraelLabel(): { dateLabel: string; timeLabel: string } {
  const d = new Date();
  const dateLabel = `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
  const timeLabel = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  return { dateLabel, timeLabel };
}

type BuildOpts = {
  includeEmojis: boolean;
};

function catTitlePlain(key: string) {
  if (key === "carb") return "פחמימה";
  if (key === "spread") return "ממרח";
  if (key === "protein") return "חלבון";
  if (key === "veg") return "ירק";
  return "פרי";
}

function catTitleWithEmoji(key: string) {
  if (key === "carb") return "🍞 פחמימה";
  if (key === "spread") return "🥣 ממרח";
  if (key === "protein") return "🍳 חלבון";
  if (key === "veg") return "🥕 ירק";
  return "🍎 פרי";
}

export function buildMessage(
  family: Family,
  entries: Array<ChoiceEntry & { childName: string }>,
  filledAtLabel: string,
  opts: BuildOpts
) {
  const { dateLabel } = nowIsraelLabel();
  const header = `קופסת אוכל למחר | ${dateLabel} | מולא ב-${filledAtLabel}`;

  const lines: string[] = [header, ""];
  for (const en of entries) {
    lines.push(`*${en.childName}*:`);

    for (const cat of categories) {
      const selected = (en as any)[cat.key] as string[];
      const other = (en as any)[cat.key + "Other"] as string;

      const items = itemsByCategory[cat.key];
      const pretty: string[] = [];

      for (const id of selected || []) {
        const it = items.find((x) => x.id === id);
        if (it) {
          if (opts.includeEmojis) pretty.push(`${it.emoji} ${it.label}`);
          else pretty.push(`${it.label}`);
        }
      }
      if (other && other.trim()) {
        if (opts.includeEmojis) pretty.push(`✍️ ${other.trim()}`);
        else pretty.push(`${other.trim()}`);
      }

      if (pretty.length > 0) {
        const title = opts.includeEmojis ? catTitleWithEmoji(cat.key) : catTitlePlain(cat.key);
        if (opts.includeEmojis) {
          lines.push(`${title}: ${pretty.join(", ")}`);
        } else {
          lines.push(`${title}:`);
          pretty.forEach((p) => lines.push(`- ${p}`));
        }
      }
    }
    lines.push("");
  }

  lines.push("תודה");
  return lines.join("\n");
}

export function encodeForWhatsApp(text: string) {
  return encodeURIComponent(text);
}

export function gmailComposeUrl(to: string, subject: string, body: string) {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to,
    su: subject,
    body,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}
