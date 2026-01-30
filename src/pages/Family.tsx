import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { apiGetFamily, apiGetTodayChoices, apiSaveChoices } from "../app/api";
import type { Allergy, ChoiceEntry, Family } from "../app/types";
import { categories, itemsByCategory, isBlocked } from "../app/items";
import { buildMessage, encodeForMailto, encodeForWhatsApp, nowIsraelLabel } from "../app/utils";

type EntryState = ChoiceEntry;

function emptyEntry(childId: string): EntryState {
  return {
    childId,
    carb: [], carbOther: "",
    spread: [], spreadOther: "",
    protein: [], proteinOther: "",
    veg: [], vegOther: "",
    fruit: [], fruitOther: ""
  };
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export default function FamilyPage() {
  const { token } = useParams();
  const [family, setFamily] = useState<Family | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
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
        setSelectedChildIds(fam.children.map(c => c.childId));
        const base: Record<string, EntryState> = {};
        fam.children.forEach(c => (base[c.childId] = emptyEntry(c.childId)));
        setEntries(base);

        // Try load today's choices (optional)
        try {
          const today = await apiGetTodayChoices(fam.familyId);
          const merged = { ...base };
          for (const e of today.entries) {
            merged[e.childId] = {
              childId: e.childId,
              carb: e.carb || [], carbOther: e.carbOther || "",
              spread: e.spread || [], spreadOther: e.spreadOther || "",
              protein: e.protein || [], proteinOther: e.proteinOther || "",
              veg: e.veg || [], vegOther: e.vegOther || "",
              fruit: e.fruit || [], fruitOther: e.fruitOther || ""
            };
          }
          setEntries(merged);
          const firstFilled = today.entries.find(x => x.filledAt)?.filledAt;
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
    return () => { alive = false; };
  }, [token]);

  const selectedChildren = useMemo(() => {
    if (!family) return [];
    return family.children.filter(c => selectedChildIds.includes(c.childId));
  }, [family, selectedChildIds]);

  function toggleChild(id: string) {
    setSelectedChildIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function selectAll() {
    if (!family) return;
    setSelectedChildIds(family.children.map(c => c.childId));
  }

  function clearSelection() {
    setSelectedChildIds([]);
  }

  function toggleItem(categoryKey: import("../app/items").CategoryKey, itemId: string) {
    setEntries(prev => {
      const next = { ...prev };
      for (const childId of selectedChildIds) {
        const cur = next[childId] || emptyEntry(childId);
        const arr = (cur as any)[categoryKey] as string[];
        const has = arr.includes(itemId);
        (cur as any)[categoryKey] = has ? arr.filter(x => x !== itemId) : [...arr, itemId];
        next[childId] = cur;
      }
      return next;
    });
  }

  function setOther(categoryKey: import("../app/items").CategoryKey, text: string) {
    const key = (categoryKey + "Other") as keyof EntryState;
    setEntries(prev => {
      const next = { ...prev };
      for (const childId of selectedChildIds) {
        const cur = next[childId] || emptyEntry(childId);
        (cur as any)[key] = text;
        next[childId] = cur;
      }
      return next;
    });
  }

  function isItemDisabledForSelectedChildren(categoryKey: import("../app/items").CategoryKey, itemId: string) {
    const item = itemsByCategory[categoryKey].find((x) => x.id === itemId);
    if (!item) return false;
    // If at least one selected child blocks it, disable
    for (const childId of selectedChildIds) {
      const allergies = allAllergiesByChild[childId] || [];
      if (isBlocked(item, allergies)) return true;
    }
    return false;
  }

  function tileSelectedState(categoryKey: import("../app/items").CategoryKey, itemId: string) {
    // show selected if ALL selected children have it
    if (selectedChildIds.length === 0) return false;
    for (const childId of selectedChildIds) {
      const e = entries[childId];
      const arr = (e as any)?.[categoryKey] as string[] | undefined;
      if (!arr || !arr.includes(itemId)) return false;
    }
    return true;
  }

  async function save() {
    if (!family) return;
    if (family.children.length === 0) return;

    const ents = family.children.map(c => entries[c.childId] || emptyEntry(c.childId));
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
    return family.children.map(c => ({
      childName: c.childName,
      ...(entries[c.childId] || emptyEntry(c.childId)),
    }));
  }, [family, entries]);

  function openWhatsapp(parentIndex: 0 | 1) {
    if (!family) return;
    const phone = family.parents[parentIndex]?.phone || "";
    if (!phone) return;
    const { timeLabel } = nowIsraelLabel();
    const msg = buildMessage(family, summaryEntries, timeLabel);
    const url = `https://wa.me/${phone}?text=${encodeForWhatsApp(msg)}`;
    window.open(url, "_blank");
  }

  function openEmail() {
    if (!family) return;
    const { timeLabel } = nowIsraelLabel();
    const msg = buildMessage(family, summaryEntries, timeLabel);
    const subject = encodeURIComponent("קופסת אוכל למחר");
    const body = encodeForMailto(msg);
    const url = `mailto:${encodeURIComponent(family.email || "")}?subject=${subject}&body=${body}`;
    window.location.href = url;
  }

  if (loading) return <div className="card"><div className="h1">טוען...</div></div>;
  if (err) return <div className="card"><div className="h1">⚠️ שגיאה</div><div className="p">{err}</div></div>;
  if (!family) return <div className="card"><div className="h1">לא נמצאה משפחה</div></div>;

  return (
    <div className="card">
      <div className="h1">{family.familyName}</div>
      <div className="p">בחרו ילדים, סמנו אוכל, ואז שמרו ושלחו.</div>

      {savedAt && <div className="notice" style={{ marginTop: 12 }}>✅ נשמר. אפשר לשלוח עכשיו.</div>}
      {selectedChildIds.length === 0 && <div className="notice" style={{ marginTop: 12 }}>בחרו לפחות ילד אחד כדי לסמן אוכל.</div>}

      <hr className="sep" />

      <div className="h2">מי בוחר היום?</div>
      <div className="row" style={{ marginBottom: 10 }}>
        <button className="btn secondary" onClick={selectAll} type="button">בחרו כולם</button>
        <button className="btn secondary" onClick={clearSelection} type="button">נקה בחירה</button>
      </div>

      <div className="biggrid">
        {family.children.map(c => {
          const selected = selectedChildIds.includes(c.childId);
          return (
            <div
              key={c.childId}
              className={"tile" + (selected ? " selected" : "")}
              onClick={() => toggleChild(c.childId)}
              role="button"
            >
              {c.childName}
              {c.allergies?.length ? <div className="small" style={{ marginTop: 6 }}>🚫 אלרגיות בכיתה</div> : <div className="small" style={{ marginTop: 6 }}> </div>}
            </div>
          );
        })}
      </div>

      <hr className="sep" />

      {categories.map(cat => (
        <div key={cat.key} style={{ marginBottom: 16 }}>
          <div className="h2">{cat.title}</div>

          <div className="biggrid">
            {itemsByCategory[cat.key].map(item => {
              const disabled = selectedChildIds.length === 0 ? true : isItemDisabledForSelectedChildren(cat.key, item.id);
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
              // show if all selected children have same other text, else blank
              if (selectedChildIds.length === 0) return "";
              const key = (cat.key + "Other") as any;
              const vals = selectedChildIds.map(id => (entries[id] as any)?.[key] || "");
              const u = uniq(vals);
              return u.length === 1 ? u[0] : "";
            })()}
            onChange={e => setOther(cat.key, e.target.value)}
            placeholder="אפשר לכתוב מה שרוצים"
            disabled={selectedChildIds.length === 0}
          />
        </div>
      ))}

      <hr className="sep" />

      <div className="h2">סיכום</div>
      {summaryEntries.map(en => (
        <div key={en.childId} className="card" style={{ background: "#fcfcfc", marginBottom: 10 }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{en.childName}</div>
          <div className="small" style={{ marginTop: 6 }}>
            {(en.carb.length + en.spread.length + en.protein.length + en.veg.length + en.fruit.length === 0 &&
              !en.carbOther && !en.spreadOther && !en.proteinOther && !en.vegOther && !en.fruitOther)
              ? "עוד לא נבחר כלום"
              : "נבחר"}
          </div>
        </div>
      ))}

      <div className="row" style={{ justifyContent: "space-between", marginTop: 12 }}>
        <button className="btn" onClick={save} type="button">שמור</button>
        <button className="btn secondary" onClick={() => openWhatsapp(0)} type="button">וואטסאפ להורה 1</button>
        <button className="btn secondary" onClick={() => openWhatsapp(1)} type="button">וואטסאפ להורה 2</button>
        <button className="btn secondary" onClick={openEmail} type="button">מייל</button>
      </div>

      <div className="small" style={{ marginTop: 10 }}>
        טיפ: אם מופיע כפתור אפור, זה כי אחד הילדים שנבחרו מסומן עם אלרגיות בכיתה שמונעות את הפריט.
      </div>
    </div>
  );
}
