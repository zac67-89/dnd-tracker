import Link from "next/link";
import { Fragment, type ReactNode } from "react";

export type ParsedToken = { type: "CHARACTER" | "PLACE" | "ITEM"; name: string };

// [[character]]  (( place ))  {{ item }}
const TOKEN_RE = /\[\[([^\]]+)\]\]|\(\(([^)]+)\)\)|\{\{([^}]+)\}\}/g;

function tokenAt(m: RegExpMatchArray): ParsedToken | null {
  let type: ParsedToken["type"];
  let raw: string;
  if (m[1] !== undefined) [type, raw] = ["CHARACTER", m[1]];
  else if (m[2] !== undefined) [type, raw] = ["PLACE", m[2]];
  else [type, raw] = ["ITEM", m[3]];
  const name = raw.trim();
  return name ? { type, name } : null;
}

// Unique list of entities mentioned in the text.
export function extractTokens(body: string): ParsedToken[] {
  const seen = new Set<string>();
  const out: ParsedToken[] = [];
  for (const m of body.matchAll(TOKEN_RE)) {
    const t = tokenAt(m);
    if (!t) continue;
    const key = `${t.type}::${t.name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

const CHIP: Record<ParsedToken["type"], string> = {
  CHARACTER: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  PLACE: "border-sky-500/40 bg-sky-500/15 text-sky-300",
  ITEM: "border-amber-500/40 bg-amber-500/15 text-amber-300",
};

// Render note body with tokens turned into clickable chips.
// entityMap: `${TYPE}::${lowercaseName}` -> entityId
export function RenderNote({
  body,
  campaignId,
  entityMap,
}: {
  body: string;
  campaignId: string;
  entityMap: Record<string, string>;
}) {
  const parts: ReactNode[] = [];
  let last = 0;
  let i = 0;

  for (const m of body.matchAll(TOKEN_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) parts.push(<Fragment key={i++}>{body.slice(last, idx)}</Fragment>);

    const t = tokenAt(m);
    if (t) {
      const cls = `mx-0.5 inline-block rounded border px-1.5 py-0.5 text-sm font-medium ${CHIP[t.type]}`;
      const id = entityMap[`${t.type}::${t.name.toLowerCase()}`];
      parts.push(
        id ? (
          <Link key={i++} href={`/campaign/${campaignId}/entity/${id}`} className={`${cls} hover:brightness-125`}>
            {t.name}
          </Link>
        ) : (
          <span key={i++} className={cls}>
            {t.name}
          </span>
        )
      );
    } else {
      parts.push(<Fragment key={i++}>{m[0]}</Fragment>);
    }
    last = idx + m[0].length;
  }
  if (last < body.length) parts.push(<Fragment key={i++}>{body.slice(last)}</Fragment>);

  return <div className="whitespace-pre-wrap leading-relaxed text-neutral-200">{parts}</div>;
}
