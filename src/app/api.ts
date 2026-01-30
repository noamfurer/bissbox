import type { Family, TodayChoices } from "./types";

const BASE = "/.netlify/functions/lunchbox";

type ApiOk<T> = { ok: true; data: T };
type ApiErr = { ok: false; error: string };

export async function apiGetFamily(token: string): Promise<Family> {
  const url = `${BASE}?action=getFamily&familyToken=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  const json = (await res.json()) as ApiOk<Family> | ApiErr;
  if (!json.ok) throw new Error(json.error || "שגיאה");
  return json.data;
}

export async function apiRegisterFamily(payload: any): Promise<{ familyId: string; familyToken: string }> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "registerFamily", ...payload }),
  });
  const json = (await res.json()) as ApiOk<{ familyId: string; familyToken: string }> | ApiErr;
  if (!json.ok) throw new Error(json.error || "שגיאה");
  return json.data;
}

export async function apiSaveChoices(payload: any): Promise<{ date: string; filledAt: string }> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "saveChoices", ...payload }),
  });
  const json = (await res.json()) as ApiOk<{ date: string; filledAt: string }> | ApiErr;
  if (!json.ok) throw new Error(json.error || "שגיאה");
  return json.data;
}

export async function apiGetTodayChoices(familyId: string): Promise<TodayChoices> {
  const url = `${BASE}?action=getTodayChoices&familyId=${encodeURIComponent(familyId)}`;
  const res = await fetch(url);
  const json = (await res.json()) as ApiOk<TodayChoices> | ApiErr;
  if (!json.ok) throw new Error(json.error || "שגיאה");
  return json.data;
}
