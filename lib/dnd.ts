// D&D 5e ability score -> modifier: floor((score - 10) / 2)
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export const ABILITIES = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
] as const;

export type Ability = (typeof ABILITIES)[number];

export const ABILITY_LABEL: Record<Ability, string> = {
  strength: "Strength",
  dexterity: "Dexterity",
  constitution: "Constitution",
  intelligence: "Intelligence",
  wisdom: "Wisdom",
  charisma: "Charisma",
};

export const DEFAULT_SAVING_THROWS = [
  "Strength",
  "Dexterity",
  "Constitution",
  "Intelligence",
  "Wisdom",
  "Charisma",
];

export const COINS = ["platinum", "gold", "electrum", "silver", "copper"] as const;
export type Coin = (typeof COINS)[number];

export const COIN_ABBR: Record<Coin, string> = {
  platinum: "pp",
  gold: "gp",
  electrum: "ep",
  silver: "sp",
  copper: "cp",
};

export const COIN_LABEL: Record<Coin, string> = {
  platinum: "Platinum",
  gold: "Gold",
  electrum: "Electrum",
  silver: "Silver",
  copper: "Copper",
};

// value of each coin in copper pieces — the common denominator for conversion
export const COIN_VALUE_CP: Record<Coin, number> = {
  platinum: 1000,
  gold: 100,
  electrum: 50,
  silver: 10,
  copper: 1,
};

// how many `to` coins one `from` coin is worth, formatted like the standard rate chart
export function coinRate(from: Coin, to: Coin): string {
  const ratio = COIN_VALUE_CP[from] / COIN_VALUE_CP[to];
  return ratio >= 1 ? String(ratio) : `1/${Math.round(1 / ratio)}`;
}

export const SPELL_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export type SpellLevel = (typeof SPELL_LEVELS)[number];
export const SLOT_LEVELS = SPELL_LEVELS.filter((l) => l > 0);

export function spellLevelLabel(level: number): string {
  return level === 0 ? "Cantrip" : `Level ${level}`;
}

export const DEFAULT_SKILLS = [
  "Acrobatics",
  "Animal Handling",
  "Arcana",
  "Athletics",
  "Deception",
  "History",
  "Insight",
  "Intimidation",
  "Investigation",
  "Medicine",
  "Nature",
  "Perception",
  "Performance",
  "Persuasion",
  "Religion",
  "Sleight of Hand",
  "Stealth",
  "Survival",
];
