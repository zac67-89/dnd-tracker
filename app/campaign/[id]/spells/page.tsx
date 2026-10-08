import { notFound } from "next/navigation";
import {
  getOrCreateCharacter,
  updateSpellcasting,
  addSpell,
  updateSpell,
  deleteSpell,
  updateSpellSlots,
  resetSpellSlots,
  addSpellFromTemplate,
  deleteSpellTemplate,
} from "@/lib/actions";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ABILITIES, ABILITY_LABEL, SPELL_LEVELS, SLOT_LEVELS, spellLevelLabel } from "@/lib/dnd";
import { AutoSaveForm } from "@/components/AutoSaveForm";

export const dynamic = "force-dynamic";

function textareaRows(text: string | null | undefined, minRows: number) {
  if (!text) return minRows;
  const charsPerLine = 60;
  const lines = text.split("\n").reduce((total, line) => total + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
  return Math.max(minRows, lines + 1);
}

export default async function SpellsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) notFound();

  const user = await requireUser();
  const character = await getOrCreateCharacter(id, user.id);
  const slotsByLevel = new Map(character.spellSlots.map((s) => [s.level, s]));

  const templates = await prisma.spellTemplate.findMany({
    where: { campaignId: id },
    orderBy: [{ level: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Spells</h2>

      {/* spellcasting stats */}
      <AutoSaveForm action={updateSpellcasting.bind(null, character.id, id)} className="card grid gap-3 p-4 sm:grid-cols-3">
        <label className="text-sm">
          <span className="text-neutral-400">Spellcasting Ability</span>
          <select name="spellcastingAbility" defaultValue={character.spellcastingAbility} className="input mt-1">
            <option value="">— none —</option>
            {ABILITIES.map((a) => (
              <option key={a} value={a}>
                {ABILITY_LABEL[a]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-neutral-400">Spell Save DC</span>
          <input name="spellSaveDc" type="number" defaultValue={character.spellSaveDc} className="input mt-1" />
        </label>
        <label className="text-sm">
          <span className="text-neutral-400">Spell Attack Bonus</span>
          <input name="spellAttackBonus" defaultValue={character.spellAttackBonus} placeholder="+5" className="input mt-1" />
        </label>
      </AutoSaveForm>

      {/* spell slots */}
      <AutoSaveForm action={updateSpellSlots.bind(null, character.id, id)} className="card space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-neutral-200">Spell Slots</h3>
          <button formAction={resetSpellSlots.bind(null, character.id, id)} className="btn btn-ghost text-xs">
            Reset all (long rest)
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-9">
          {SLOT_LEVELS.map((level) => {
            const slot = slotsByLevel.get(level);
            return (
              <div key={level} className="rounded-lg border border-white/10 p-2 text-center">
                <span className="block text-xs uppercase tracking-wide text-neutral-500">Lvl {level}</span>
                <label className="mt-1 block text-xs text-neutral-400">
                  Total
                  <input
                    name={`total-${level}`}
                    type="number"
                    min={0}
                    defaultValue={slot?.total ?? 0}
                    className="input mt-0.5 text-center"
                  />
                </label>
                <label className="mt-1 block text-xs text-neutral-400">
                  Remaining
                  <input
                    name={`remaining-${level}`}
                    type="number"
                    min={0}
                    defaultValue={(slot?.total ?? 0) - (slot?.used ?? 0)}
                    className="input mt-0.5 text-center"
                  />
                </label>
              </div>
            );
          })}
        </div>
      </AutoSaveForm>

      {/* saved spells: info remembered from deleted spells, ready to re-add */}
      {templates.length > 0 && (
        <section className="card space-y-2 p-4">
          <h3 className="font-semibold text-neutral-200">📋 Saved Spells</h3>
          <p className="text-xs text-neutral-500">Remembered from spells you removed — add one back without retyping its info.</p>
          <ul className="space-y-2 divide-y divide-white/5">
            {templates.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-2 pt-2 first:pt-0">
                <span className="flex-1 min-w-[100px] truncate font-medium text-neutral-100">{t.name}</span>
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-neutral-400">
                  {spellLevelLabel(t.level)}
                </span>
                <form action={addSpellFromTemplate.bind(null, t.id, character.id, id)}>
                  <button className="btn btn-primary text-xs whitespace-nowrap">+ Add</button>
                </form>
                <form action={deleteSpellTemplate.bind(null, t.id, id)}>
                  <button className="btn btn-danger text-xs">✕</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* spells by level */}
      {SPELL_LEVELS.map((level) => {
        const spells = character.spells.filter((s) => s.level === level).sort((a, b) => a.name.localeCompare(b.name));
        return (
          <section key={level} className="card space-y-3 p-4">
            <h3 className="font-semibold text-neutral-200">{spellLevelLabel(level)}</h3>

            {spells.length === 0 ? (
              <p className="text-sm text-neutral-500">None yet.</p>
            ) : (
              <ul className="space-y-2">
                {spells.map((s) => (
                  <li key={s.id} className="rounded-lg border border-white/10">
                    <details className="group">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3 select-none">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-neutral-100">{s.name}</span>
                          {s.concentration && (
                            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-neutral-400">Conc.</span>
                          )}
                          {s.ritual && (
                            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-neutral-400">Ritual</span>
                          )}
                        </div>
                        <svg
                          className="h-4 w-4 flex-shrink-0 text-neutral-500 transition-transform group-open:rotate-180"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                        </svg>
                      </summary>

                      <AutoSaveForm action={updateSpell.bind(null, s.id, id)} className="space-y-2 border-t border-white/10 p-3">
                        <input type="hidden" name="level" value={level} />
                        <div className="flex flex-wrap items-center gap-2">
                          <input name="name" defaultValue={s.name} className="input flex-1 min-w-[160px] font-semibold" />
                          <input name="range" defaultValue={s.range} placeholder="Range" className="input w-28" />
                          <input name="castingTime" defaultValue={s.castingTime} placeholder="Casting time" className="input w-32" />
                          <input name="duration" defaultValue={s.duration} placeholder="Duration" className="input w-32" />
                        </div>
                        <textarea
                          name="description"
                          defaultValue={s.description}
                          placeholder="Description…"
                          rows={textareaRows(s.description, 4)}
                          className="input resize-y"
                        />
                        <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-400">
                          <label className="flex items-center gap-1.5">
                            <input type="checkbox" name="concentration" defaultChecked={s.concentration} className="h-4 w-4 accent-amber-500" />
                            Concentration
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input type="checkbox" name="ritual" defaultChecked={s.ritual} className="h-4 w-4 accent-amber-500" />
                            Ritual
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input type="checkbox" name="verbal" defaultChecked={s.verbal} className="h-4 w-4 accent-amber-500" />
                            Verbal (V)
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input type="checkbox" name="somatic" defaultChecked={s.somatic} className="h-4 w-4 accent-amber-500" />
                            Somatic (S)
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input type="checkbox" name="material" defaultChecked={s.material} className="h-4 w-4 accent-amber-500" />
                            Material (M)
                          </label>
                          <input
                            name="materialDescription"
                            defaultValue={s.materialDescription}
                            placeholder="Material needed…"
                            className="input flex-1 min-w-[160px]"
                          />
                        </div>
                        <textarea
                          name="notes"
                          defaultValue={s.notes}
                          placeholder="Notes…"
                          rows={textareaRows(s.notes, 2)}
                          className="input resize-y text-sm"
                        />
                        <div className="flex items-center gap-2">
                          <button formAction={deleteSpell.bind(null, s.id, id)} className="btn btn-danger text-xs">
                            Delete
                          </button>
                        </div>
                      </AutoSaveForm>
                    </details>
                  </li>
                ))}
              </ul>
            )}

            <details className="group rounded-lg border border-dashed border-white/15">
              <summary className="cursor-pointer list-none p-3 text-sm font-medium text-neutral-400 select-none group-open:text-neutral-200 hover:text-neutral-200">
                + Add {spellLevelLabel(level)} spell
              </summary>
              <form action={addSpell.bind(null, character.id, id)} className="space-y-2 border-t border-white/10 p-3">
                <input type="hidden" name="level" value={level} />
                <div className="flex flex-wrap items-center gap-2">
                  <input name="name" placeholder="New spell name" className="input flex-1 min-w-[160px]" required />
                  <input name="range" placeholder="Range" className="input w-28" />
                  <input name="castingTime" placeholder="Casting time" className="input w-32" />
                  <input name="duration" placeholder="Duration" className="input w-32" />
                </div>
                <textarea name="description" placeholder="Description…" className="input min-h-[60px]" />
                <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-400">
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" name="concentration" className="h-4 w-4 accent-amber-500" />
                    Concentration
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" name="ritual" className="h-4 w-4 accent-amber-500" />
                    Ritual
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" name="verbal" className="h-4 w-4 accent-amber-500" />
                    Verbal (V)
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" name="somatic" className="h-4 w-4 accent-amber-500" />
                    Somatic (S)
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" name="material" className="h-4 w-4 accent-amber-500" />
                    Material (M)
                  </label>
                  <input name="materialDescription" placeholder="Material needed…" className="input flex-1 min-w-[160px]" />
                </div>
                <textarea name="notes" placeholder="Notes…" className="input min-h-[50px] text-sm" />
                <button className="btn btn-primary text-sm">+ Add {spellLevelLabel(level)} spell</button>
              </form>
            </details>
          </section>
        );
      })}
    </div>
  );
}
