import { useMemo, useState } from "react";
import { apiRegisterFamily } from "../app/api";
import { allergyLabels, type Allergy } from "../app/items";

type KidForm = { name: string; allergies: Allergy[] };

function PhoneHint() {
  return <div className="small">טלפון בפורמט 9725XXXXXXXX (רק ספרות)</div>;
}

export default function Register() {
  const [familyName, setFamilyName] = useState("");
  const [parent1Name, setParent1Name] = useState("הורה 1");
  const [parent1Phone, setParent1Phone] = useState("");
  const [parent2Name, setParent2Name] = useState("הורה 2");
  const [parent2Phone, setParent2Phone] = useState("");
  const [email, setEmail] = useState("");
  const [kids, setKids] = useState<KidForm[]>([{ name: "", allergies: [] }]);

  const [loading, setLoading] = useState(false);
  const [resultLink, setResultLink] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const canAddKid = kids.length < 5;

  const addKid = () => {
    if (!canAddKid) return;
    setKids([...kids, { name: "", allergies: [] }]);
  };

  const removeKid = (idx: number) => {
    setKids(kids.filter((_, i) => i !== idx));
  };

  const setKidName = (idx: number, v: string) => {
    setKids(kids.map((k, i) => (i === idx ? { ...k, name: v } : k)));
  };

  const toggleKidAllergy = (idx: number, a: Allergy) => {
    setKids(kids.map((k, i) => {
      if (i !== idx) return k;
      const has = k.allergies.includes(a);
      return { ...k, allergies: has ? k.allergies.filter(x => x !== a) : [...k.allergies, a] };
    }));
  };

  const valid = useMemo(() => {
    if (!familyName.trim()) return false;
    if (!parent1Phone.trim() && !parent2Phone.trim()) return false;
    if (!email.trim()) return false;
    const named = kids.filter(k => k.name.trim());
    if (named.length < 1) return false;
    return true;
  }, [familyName, parent1Phone, parent2Phone, email, kids]);

  async function submit() {
    setErr(null);
    setResultLink(null);
    if (!valid) {
      setErr("נא למלא: שם משפחה, לפחות טלפון אחד, אימייל, ולפחות ילד אחד");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        familyName,
        parent1Name,
        parent1Phone,
        parent2Name,
        parent2Phone,
        email,
        children: kids.filter(k => k.name.trim()).slice(0, 5).map(k => ({ name: k.name.trim(), allergies: k.allergies })),
      };
      const r = await apiRegisterFamily(payload);
      const link = `${window.location.origin}/f/${r.familyToken}`;
      setResultLink(link);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div className="h1">הרשמה למשפחה</div>
      <div className="p">בסוף תקבלו לינק משפחתי לילדים.</div>

      {err && <div className="notice" style={{ marginTop: 12 }}>⚠️ {err}</div>}

      <label className="label">שם משפחה</label>
      <input className="input" value={familyName} onChange={e => setFamilyName(e.target.value)} placeholder="לדוגמה: משפחת פורר" />

      <div className="row">
        <div className="col">
          <label className="label">שם הורה 1</label>
          <input className="input" value={parent1Name} onChange={e => setParent1Name(e.target.value)} />
          <label className="label">טלפון הורה 1</label>
          <input className="input" value={parent1Phone} onChange={e => setParent1Phone(e.target.value)} placeholder="9725..." />
          <PhoneHint />
        </div>

        <div className="col">
          <label className="label">שם הורה 2</label>
          <input className="input" value={parent2Name} onChange={e => setParent2Name(e.target.value)} />
          <label className="label">טלפון הורה 2</label>
          <input className="input" value={parent2Phone} onChange={e => setParent2Phone(e.target.value)} placeholder="9725..." />
          <PhoneHint />
        </div>
      </div>

      <label className="label">אימייל</label>
      <input className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" />

      <hr className="sep" />
      <div className="h2">ילדים (עד 5)</div>

      {kids.map((k, idx) => (
        <div key={idx} className="card" style={{ padding: 14, marginBottom: 12, background: "#fcfcfc" }}>
          <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontWeight: 800, fontSize: 20 }}>ילד {idx + 1}</div>
            {kids.length > 1 && (
              <button className="btn secondary" onClick={() => removeKid(idx)} type="button">
                להסיר
              </button>
            )}
          </div>

          <label className="label">שם הילד</label>
          <input className="input" value={k.name} onChange={e => setKidName(idx, e.target.value)} placeholder="לדוגמה: שחר" />

          <label className="label">אלרגיות בכיתה</label>
          <div className="pillrow">
            {(Object.keys(allergyLabels) as Array<keyof typeof allergyLabels>).map(a => (
              <div
                key={a}
                className={"pill" + (k.allergies.includes(a) ? " selected" : "")}
                onClick={() => toggleKidAllergy(idx, a)}
                role="button"
                aria-label={allergyLabels[a]}
              >
                {allergyLabels[a]}
              </div>
            ))}
            <div
              className={"pill" + (k.allergies.length === 0 ? " selected" : "")}
              onClick={() => setKids(kids.map((kk, i) => i === idx ? { ...kk, allergies: [] } : kk))}
              role="button"
            >
              אין אלרגיות
            </div>
          </div>
        </div>
      ))}

      <div className="row" style={{ justifyContent: "space-between", marginTop: 8 }}>
        <button className="btn secondary" onClick={addKid} type="button" disabled={!canAddKid}>
          + להוסיף ילד
        </button>

        <button className="btn" onClick={submit} type="button" disabled={!valid || loading}>
          {loading ? "שולח..." : "צור לינק משפחתי"}
        </button>
      </div>

      {resultLink && (
        <div style={{ marginTop: 14 }} className="notice">
          ✅ נוצר לינק משפחתי:<br />
          <div style={{ fontWeight: 800, fontSize: 18, marginTop: 6, direction: "ltr" }}>{resultLink}</div>
          <div className="small" style={{ marginTop: 6 }}>אפשר לשמור במסך הבית של הטאבלט.</div>
        </div>
      )}
    </div>
  );
}
