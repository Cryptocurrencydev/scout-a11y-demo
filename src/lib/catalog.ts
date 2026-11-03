export const SPECIALTIES = [
  { id: "wheelchair", label: "Wheelchair access" },
  { id: "low-vision", label: "Low vision" },
  { id: "deaf-hoh", label: "Deaf / hard of hearing" },
  { id: "step-free", label: "Step-free routes" },
  { id: "sensory", label: "Sensory-friendly" },
] as const;

export type SpecialtyId = (typeof SPECIALTIES)[number]["id"];

export const specialtyLabel = (id: string) =>
  SPECIALTIES.find((s) => s.id === id)?.label ?? id;

export const LANGUAGES = [
  "English",
  "Spanish",
  "Portuguese",
  "French",
  "Japanese",
  "German",
  "ASL",
  "BSL",
  "LSE",
] as const;

export const languageLabel = (l: string) =>
  ({ ASL: "American Sign Language", BSL: "British Sign Language", LSE: "Spanish Sign Language" })[l] ??
  l;

export const PRICE_OPTIONS = [
  { value: "", label: "Any price" },
  { value: "10", label: "Up to $10" },
  { value: "25", label: "Up to $25" },
  { value: "40", label: "Up to $40" },
  { value: "60", label: "Up to $60" },
];

export const RATING_OPTIONS = [
  { value: "", label: "Any rating" },
  { value: "4", label: "4 stars and up" },
  { value: "4.5", label: "4.5 stars and up" },
];
