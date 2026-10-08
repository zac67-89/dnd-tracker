// Maps URL slug (plural) <-> Entity.type (enum-ish string).
export const KINDS = {
  characters: "CHARACTER",
  places: "PLACE",
  items: "ITEM",
} as const;

export type Kind = keyof typeof KINDS; // "characters" | "places" | "items"
export type EntityType = (typeof KINDS)[Kind]; // "CHARACTER" | ...

export const KIND_LABEL: Record<Kind, string> = {
  characters: "Characters",
  places: "Places",
  items: "Items",
};

// syntax hint shown to the user per kind
export const KIND_SYNTAX: Record<Kind, string> = {
  characters: "[[name]]",
  places: "((name))",
  items: "{{name}}",
};

export function isKind(x: string): x is Kind {
  return x === "characters" || x === "places" || x === "items";
}

export function typeToKind(type: string): Kind {
  if (type === "PLACE") return "places";
  if (type === "ITEM") return "items";
  return "characters";
}
