import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { apiGetFamily, apiGetTodayChoices, apiSaveChoices } from "../app/api";
import type { Allergy, ChoiceEntry, Family } from "../app/types";
import { categories, itemsByCategory, isBlocked, type CategoryKey } from "../app/items";
import { buildMessage, encodeForWhatsApp, gmailComposeUrl, nowIsraelLabel } from "../app/utils";

type EntryState = ChoiceEntry;

function emptyEntry(childId: string): EntryState {
  return {
    childId,
    carb: [],
    carbOther: "",
    spread: [],
    spreadOther: "",
    protein: [],
    proteinOther: "",
    veg: [],
    vegOther: "",
    fruit: [],
    fruitOther: "",
  };
}

function prettyLine(categoryKey: CategoryKey, ids: string[], other: string) {
  const items = itemsByCategory[categoryKey];
  const parts: string[] = [];
  for (const id of ids || []) {
    const it = items.find((x) => x.id === id);
    if (it) parts.push(`${it.emoji} ${it.label}`);
  }
  if (other && other.trim()) parts.push(`✍️ ${other.trim()}`);
  return parts;
}

export default function FamilyPage() {
  const { token } = useParams();
  const [family, setFamily] = useState<Family | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [entries, setEntries] = useState<Record<string, EntryState>>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const allAllergiesByChild = useMemo(() => {
    const m: Record<string, Allergy[]> = {};
    if (!family) return m;
    for (const c of family.children) m[c.childId] = c.allergies || [];
    return m;
  }, [family]);

  useEffect(() => {
    let alive = true;
    async function load() {
      setErr(null);
      setLoading(true);
      try {
        const fam = await apiGetFamily(token || "");
        if (!alive) return;

        setFamily(fam);
        const base: Record<string, EntryState> = {};
        fam.children.forEach((c) => (base[c.childId] = emptyEntry(c.childId)));
        setEntries(base);
        setActiveChildId(fam.children[0]?.childId || null);

        try {
          const today = await apiGetTodayChoices(fam.familyId);
          const merged = { ...base };
          for (const e of today.entries) {
            merged[e.childId] = {
              childId: e.childId,
              carb: e.carb || [],
              carbOther: e.carbOther || "",
              spread: e.spread || [],
              spreadOther: e.spreadOther || "",
              protein: e.protein || [],
              proteinOther: e.proteinOther || "",
              veg: e.veg || [],
              vegOther: e.vegOther || "",
              fruit: e.fruit || [],
              fruitOther: e.fruitOther || "",
            };
          }
          setEntries(merged);
          const firstFilled = today.entries.find((x) => x.filledAt)?.filledAt;
          if (firstFilled) setSavedAt(firstFilled);
        } catch {
          // ignore
        }
      } catch (e: any) {
        setErr(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [token]);

  const activeChild = useMemo(() => {
    if (!family || !activeChildId) return null;
    return family.children.find((c) => c.childId === activeChildId) || null;
  }, [family, activeChildId]);

  const activeAllergies = useMemo(() => {
    if (!activeChildId) return [];
    return allAllergiesByChild[activeChildId] || [];
  }, [activeChildId, allAllergiesByChild]);

  function toggleItem(categoryKey: CategoryKey, itemId: string) {
    if (!activeChildId) return;
    setEntries((prev) => {
      const next = { ...prev };
      const cur = next[activeChildId] || emptyEntry(activeChildId);
      const arr = (cur as any)[categoryKey] as string[];
      const has = arr.includes(itemId);
      (cur as any)[categoryKey] = has ? arr.filter((x) => x !== itemId) : [...arr, itemId];
      next[activeChildId] = cur;
      return next;
    });
  }

  function setOther(categoryKey: CategoryKey, text: string) {
    if (!activeChildId) return;
    const key = (categoryKey + "Other") as keyof EntryState;
    setEntries((prev) => {
      const next = { ...prev };
      const cur = next[activeChildId] || emptyEntry(activeChildId);
      (cur as any)[key] = text;
      next[activeChildId] = cur;
      return next;
    });
  }

  function isItemDisabledForActiveChild(categoryKey: CategoryKey, itemId: string) {
    const item = itemsByCategory[categoryKey].find((x) => x.id === itemId);
    if (!item) return false;
    return isBlocked(item, activeAllergies);
  }

  function tileSelectedState(categoryKey: CategoryKey, itemId: string) {
    if (!activeChildId) return false;
    const e = entries[activeChildId];
    const arr = (e as any)?.[categoryKey] as string[] | undefined;
    return !!arr?.includes(itemId);
  }

  async function save() {
    if (!family) return;
    const ents = family.children.map((c) => entries[c.childId] || emptyEntry(c.childId));
    setErr(null);
    try {
      const r = await apiSaveChoices({ familyId: family.familyId, entries: ents });
      setSavedAt(r.filledAt);
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  const summaryEntries = useMemo(() => {
    if (!family) return [];
    return family.children.map((c) => ({
      childName: c.childName,
      ...(entries[c.childId] || emptyEntry(c.childId)),
    }));
  }, [family, entries]);

  function openWhatsapp(parentIndex: 0 | 1) {
    if (!family) return;
    const phone = family.parents[parentIndex]?.phone || "";
    if (!phone) return;
    const { timeLabel } = nowIsraelLabel();
    const msg = buildMessage(family, summaryEntries, timeLabel, { includeEmojis: false });
    const url = `https://wa.me/${phone}?text=${encodeForWhatsApp(msg)}`;
    window.open(url, "_blank");
  }

  function openGmail() {
    if (!family) return;
    const { timeLabel } = nowIsraelLabel();
    const msg = buildMessage(family, summaryEntries, timeLabel, { includeEmojis: true });
    const subject = "קופסת אוכל למחר";
    const url = gmailComposeUrl(family.email || "", subject, msg);
    window.open(url, "_blank");
  }

  if (loading) return <div className="card"><div className="h1">טוען...</div></div>;
  if (err) return <div className="card"><div className="h1">⚠️ שגיאה</div><div className="p">{err}</div></div>;
  if (!family) return <div className="card"><div className="h1">לא נמצאה משפחה</div></div>;

  const p1 = family.parents[0]?.name || "הורה 1";
  const p2 = family.parents[1]?.name || "הורה 2";

  return (
    <div className="card">
      <div className="h1">{family.familyName}</div>

      <div className="p" style={{ fontWeight: 800, fontSize: 22, marginTop: 6 }}>זמן לבחור! 🥪</div>
      <div className="p" style={{ marginTop: 6 }}>
        ילדים יקרים, סמנו את האוכל שאתם רוצים
        <br />
        לחצו על "שמור" ואל תשכחו לשלוח להורים!
      </div>

      {savedAt && <div className="notice" style={{ marginTop: 12 }}>✅ נשמר. אפשר לשלוח עכשיו.</div>}

      <hr className="sep" />

      <div className="h2">מי בוחר עכשיו?</div>
      <div className="biggrid">
        {family.children.map((c) => {
          const selected = c.childId === activeChildId;
          return (
            <div
              key={c.childId}
              className={"tile" + (selected ? " selected" : "")}
              onClick={() => setActiveChildId(c.childId)}
              role="button"
            >
              {c.childName}
              {c.allergies?.length ? <div className="small" style={{ marginTop: 6 }}>🚫 אלרגיות בכיתה</div> : <div className="small" style={{ marginTop: 6 }}> </div>}
            </div>
          );
        })}
      </div>

      <hr className="sep" />

      {activeChild ? (
        <div className="notice" style={{ marginBottom: 12 }}>
          עכשיו בוחרים עבור: <span style={{ fontWeight: 900 }}>{activeChild.childName}</span>
          {activeAllergies.length ? <div className="small" style={{ marginTop: 6 }}>פריטים מסוימים חסומים בגלל אלרגיות בכיתה.</div> : null}
        </div>
      ) : (
        <div className="notice" style={{ marginBottom: 12 }}>בחרו ילד כדי להתחיל.</div>
      )}

      {categories.map((cat) => (
        <div key={cat.key} style={{ marginBottom: 16 }}>
          <div className="h2">{cat.title}</div>

          <div className="biggrid">
            {itemsByCategory[cat.key].map((item) => {
              const disabled = !activeChildId || isItemDisabledForActiveChild(cat.key, item.id);
              const selected = tileSelectedState(cat.key, item.id);
              return (
                <div
                  key={item.id}
                  className={"tile" + (selected ? " selected" : "") + (disabled ? " disabled" : "")}
                  onClick={() => !disabled && toggleItem(cat.key, item.id)}
                  role="button"
                  aria-label={item.label}
                >
                  <div style={{ fontSize: 34 }}>{item.emoji}</div>
                  <div>{item.label}</div>
                </div>
              );
            })}
          </div>

          <label className="label" style={{ marginTop: 12 }}>אחר ✍️</label>
          <input
            className="input"
            value={(() => {
              if (!activeChildId) return "";
              const key = (cat.key + "Other") as any;
              return (entries[activeChildId] as any)?.[key] || "";
            })()}
            onChange={(e) => setOther(cat.key, e.target.value)}
            placeholder="אפשר לכתוב מה שרוצים"
            disabled={!activeChildId}
          />
        </div>
      ))}

      <hr className="sep" />

      <div className="h2">סיכום</div>
      {summaryEntries.map((en) => {
        const hasAnything =
          en.carb.length + en.spread.length + en.protein.length + en.veg.length + en.fruit.length > 0 ||
          !!en.carbOther || !!en.spreadOther || !!en.proteinOther || !!en.vegOther || !!en.fruitOther;

        const carb = prettyLine("carb", en.carb, en.carbOther);
        const spread = prettyLine("spread", en.spread, en.spreadOther);
        const protein = prettyLine("protein", en.protein, en.proteinOther);
        const veg = prettyLine("veg", en.veg, en.vegOther);
        const fruit = prettyLine("fruit", en.fruit, en.fruitOther);

        return (
          <div key={en.childId} className="card" style={{ background: "#fcfcfc", marginBottom: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{en.childName}</div>
            {!hasAnything ? (
              <div className="small" style={{ marginTop: 6 }}>עוד לא נבחר כלום</div>
            ) : (
              <div style={{ marginTop: 8 }}>
                {carb.length ? <div className="small"><b>פחמימה:</b> {carb.join(", ")}</div> : null}
                {spread.length ? <div className="small"><b>ממרח:</b> {spread.join(", ")}</div> : null}
                {protein.length ? <div className="small"><b>חלבון:</b> {protein.join(", ")}</div> : null}
                {veg.length ? <div className="small"><b>ירק:</b> {veg.join(", ")}</div> : null}
                {fruit.length ? <div className="small"><b>פרי:</b> {fruit.join(", ")}</div> : null}
              </div>
            )}
          </div>
        );
      })}

      <div className="row" style={{ justifyContent: "space-between", marginTop: 12 }}>
        <button className="btn" onClick={save} type="button">שמור</button>
        <button className="btn secondary" onClick={() => openWhatsapp(0)} type="button">שלחו ל-{p1} בוואטסאפ</button>
        <button className="btn secondary" onClick={() => openWhatsapp(1)} type="button">שלחו ל-{p2} בוואטסאפ</button>
        <button className="btn secondary" onClick={openGmail} type="button">שלחו את הבחירה במייל</button>
      </div>
    </div>
  );
}
