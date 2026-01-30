export type Allergy = "peanut" | "milk" | "sesame";

export type Child = {
  childId: string;
  childName: string;
  allergies: Allergy[];
};

export type Family = {
  familyId: string;
  familyName: string;
  parents: { name: string; phone: string }[];
  email: string;
  children: Child[];
};

export type ChoiceEntry = {
  childId: string;
  carb: string[];
  carbOther: string;
  spread: string[];
  spreadOther: string;
  protein: string[];
  proteinOther: string;
  veg: string[];
  vegOther: string;
  fruit: string[];
  fruitOther: string;
};

export type TodayChoices = {
  date: string;
  entries: Array<ChoiceEntry & { childName: string; filledAt?: string }>;
};
