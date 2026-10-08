import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  getOrCreateCharacter,
  updateCharacterInfo,
  updateCharacterCombat,
  setInitiative,
  updateCharacterStats,
  addLanguage,
  deleteLanguage,
  addProficiency,
  deleteProficiency,
  addFeature,
  updateFeature,
  deleteFeature,
  addSavingThrow,
  updateSavingThrow,
  deleteSavingThrow,
  addSkill,
  updateSkill,
  deleteSkill,
  updateDeathSaves,
  resetDeathSaves,
  addAttack,
  updateAttack,
  deleteAttack,
} from "@/lib/actions";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ABILITIES, ABILITY_LABEL, abilityModifier, formatModifier } from "@/lib/dnd";
import { AutoSaveForm } from "@/components/AutoSaveForm";

export const dynamic = "force-dynamic";

function AddDisclosure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="group relative shrink-0">
      <summary className="btn btn-ghost text-xs cursor-pointer list-none select-none whitespace-nowrap">{label}</summary>
      <div className="absolute right-0 top-full z-10 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-white/10 bg-neutral-900 p-3 shadow-xl">
        {children}
      </div>
    </details>
  );
}

function TagList({
  items,
  onDelete,
  campaignId,
}: {
  items: { id: string; name: string }[];
  onDelete: (id: string, campaignId: string) => Promise<void>;
  campaignId: string;
}) {
  if (items.length === 0) return <p className="text-sm text-neutral-500">None yet.</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-1.5 rounded-full bg-white/5 py-1 pl-3 pr-1.5 text-sm">
          <span>{item.name}</span>
          <form action={onDelete.bind(null, item.id, campaignId)}>
            <button className="rounded-full px-1.5 text-xs text-neutral-500 hover:text-red-400" title="Remove">
              ✕
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}

export default async function CharacterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) notFound();

  const user = await requireUser();
  const character = await getOrCreateCharacter(id, user.id);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Character Sheet</h2>

      {/* identity */}
      <AutoSaveForm action={updateCharacterInfo.bind(null, character.id, id)} className="card grid gap-3 p-4 sm:grid-cols-3">
        <label className="text-sm sm:col-span-2">
          <span className="text-neutral-400">Name</span>
          <input name="name" defaultValue={character.name} className="input mt-1" placeholder="Character name" />
        </label>
        <label className="text-sm">
          <span className="text-neutral-400">Level</span>
          <input name="level" type="number" min={1} defaultValue={character.level} className="input mt-1" />
        </label>
        <label className="text-sm">
          <span className="text-neutral-400">Class</span>
          <input name="className" defaultValue={character.className} className="input mt-1" />
        </label>
        <label className="text-sm">
          <span className="text-neutral-400">Background</span>
          <input name="background" defaultValue={character.background} className="input mt-1" />
        </label>
        <label className="text-sm">
          <span className="text-neutral-400">Alignment</span>
          <input name="alignment" defaultValue={character.alignment} className="input mt-1" />
        </label>
        <label className="text-sm sm:col-span-3">
          <span className="text-neutral-400">Experience Points</span>
          <input name="experiencePoints" type="number" min={0} defaultValue={character.experiencePoints} className="input mt-1 sm:w-48" />
        </label>
      </AutoSaveForm>

      {/* initiative — set at the start of every fight */}
      <form action={setInitiative.bind(null, character.id, id)} className="card flex flex-wrap items-end gap-3 p-4">
        <label className="text-sm">
          <span className="text-neutral-400">Initiative</span>
          <input name="initiative" type="number" defaultValue={character.initiative} className="input mt-1 w-28 text-lg font-bold" />
        </label>
        <button className="btn btn-primary">Set for this fight</button>
        <span className="text-xs text-neutral-500">Update at the start of every combat.</span>
      </form>

      {/* combat stats */}
      <AutoSaveForm action={updateCharacterCombat.bind(null, character.id, id)} className="card grid gap-3 p-4 sm:grid-cols-4">
        <label className="text-sm">
          <span className="text-neutral-400">Armor Class</span>
          <input name="armorClass" type="number" defaultValue={character.armorClass} className="input mt-1" />
        </label>
        <label className="text-sm">
          <span className="text-neutral-400">Speed (ft)</span>
          <input name="speed" type="number" defaultValue={character.speed} className="input mt-1" />
        </label>
        <label className="text-sm">
          <span className="text-neutral-400">Passive Perception</span>
          <input name="passivePerception" type="number" defaultValue={character.passivePerception} className="input mt-1" />
        </label>
        <label className="text-sm">
          <span className="text-neutral-400">Proficiency Bonus</span>
          <input name="proficiencyBonus" type="number" defaultValue={character.proficiencyBonus} className="input mt-1" />
        </label>
        <label className="text-sm">
          <span className="text-neutral-400">Hit Dice</span>
          <input name="hitDice" defaultValue={character.hitDice} placeholder="e.g. 3d8" className="input mt-1" />
        </label>
        <label className="text-sm">
          <span className="text-neutral-400">Max HP</span>
          <input name="maxHp" type="number" min={0} defaultValue={character.maxHp} className="input mt-1" />
        </label>
        <label className="text-sm">
          <span className="text-neutral-400">Temp HP</span>
          <input name="tempHp" type="number" min={0} defaultValue={character.tempHp} className="input mt-1" />
        </label>
        <label className="text-sm">
          <span className="text-neutral-400">Current HP</span>
          <input name="currentHp" type="number" defaultValue={character.currentHp} className="input mt-1" />
        </label>
      </AutoSaveForm>

      {/* death saving throws */}
      <AutoSaveForm action={updateDeathSaves.bind(null, character.id, id)} className="card flex flex-wrap items-center gap-6 p-4">
        <h3 className="w-full font-semibold text-neutral-200 sm:w-auto">Death Saving Throws</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-400">Successes</span>
          {[1, 2, 3].map((n) => (
            <input
              key={n}
              type="checkbox"
              name="success"
              value={n}
              defaultChecked={n <= character.deathSaveSuccesses}
              className="h-5 w-5 accent-emerald-500"
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-400">Failures</span>
          {[1, 2, 3].map((n) => (
            <input
              key={n}
              type="checkbox"
              name="failure"
              value={n}
              defaultChecked={n <= character.deathSaveFailures}
              className="h-5 w-5 accent-red-500"
            />
          ))}
        </div>
        <button formAction={resetDeathSaves.bind(null, character.id, id)} className="btn btn-ghost text-sm">
          Reset
        </button>
      </AutoSaveForm>

      {/* ability scores */}
      <AutoSaveForm action={updateCharacterStats.bind(null, character.id, id)} className="card p-4">
        <h3 className="mb-3 font-semibold text-neutral-200">Ability Scores</h3>
        <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-6">
          {ABILITIES.map((ability) => {
            const score = character[ability];
            return (
              <label key={ability} className="text-center text-sm">
                <span className="text-neutral-400">{ABILITY_LABEL[ability]}</span>
                <input
                  name={ability}
                  type="number"
                  min={3}
                  max={20}
                  defaultValue={score}
                  className="input mt-1 text-center text-lg font-bold"
                />
                <span className="mt-1 block text-xs text-neutral-500">{formatModifier(abilityModifier(score))}</span>
              </label>
            );
          })}
        </div>
      </AutoSaveForm>

      {/* saving throws + skills */}
      <div className="grid gap-4 md:grid-cols-2">
        <section className="card space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-neutral-200">Saving Throws</h3>
            <AddDisclosure label="+ Add">
              <form action={addSavingThrow.bind(null, character.id, id)} className="flex items-center gap-2">
                <input name="name" placeholder="New saving throw" className="input" required />
                <input name="value" type="number" defaultValue={0} className="input w-20 text-center" />
                <button className="btn btn-primary text-xs whitespace-nowrap">Add</button>
              </form>
            </AddDisclosure>
          </div>
          <ul className="space-y-1.5">
            {character.savingThrows.map((s) => (
              <li key={s.id} className="flex items-center gap-2">
                <AutoSaveForm action={updateSavingThrow.bind(null, s.id, id)} className="flex flex-1 items-center gap-2">
                  <input name="name" defaultValue={s.name} className="input" />
                  <input name="value" type="number" defaultValue={s.value} className="input w-20 text-center" />
                </AutoSaveForm>
                <form action={deleteSavingThrow.bind(null, s.id, id)}>
                  <button className="btn btn-danger text-xs">✕</button>
                </form>
              </li>
            ))}
          </ul>
        </section>

        <section className="card space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-neutral-200">Skills</h3>
            <AddDisclosure label="+ Add">
              <form action={addSkill.bind(null, character.id, id)} className="flex items-center gap-2">
                <input name="name" placeholder="New skill" className="input" required />
                <input name="value" type="number" defaultValue={0} className="input w-20 text-center" />
                <button className="btn btn-primary text-xs whitespace-nowrap">Add</button>
              </form>
            </AddDisclosure>
          </div>
          <ul className="max-h-96 space-y-1.5 overflow-y-auto pr-1">
            {character.skills.map((s) => (
              <li key={s.id} className="flex items-center gap-2">
                <AutoSaveForm action={updateSkill.bind(null, s.id, id)} className="flex flex-1 items-center gap-2">
                  <input name="name" defaultValue={s.name} className="input" />
                  <input name="value" type="number" defaultValue={s.value} className="input w-20 text-center" />
                </AutoSaveForm>
                <form action={deleteSkill.bind(null, s.id, id)}>
                  <button className="btn btn-danger text-xs">✕</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* attacks & spellcasting */}
      <section className="card space-y-3 p-4">
        <h3 className="font-semibold text-neutral-200">Attacks & Spellcasting</h3>
        {character.attacks.length === 0 ? (
          <p className="text-sm text-neutral-500">None yet.</p>
        ) : (
          <>
            <ul className="space-y-1.5">
              {character.attacks.map((a) => (
                <li key={a.id} className="rounded-lg border border-white/10">
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3 select-none">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-neutral-100">{a.name || "Unnamed"}</span>
                        {a.attackBonus && (
                          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-neutral-400">{a.attackBonus}</span>
                        )}
                        {a.damage && (
                          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-neutral-400">
                            {a.damage}
                            {a.type ? ` ${a.type}` : ""}
                          </span>
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

                    <AutoSaveForm action={updateAttack.bind(null, a.id, id)} className="flex flex-wrap items-center gap-2 border-t border-white/10 p-3">
                      <input name="name" defaultValue={a.name} placeholder="Name" className="input flex-1 min-w-[120px]" />
                      <input name="attackBonus" defaultValue={a.attackBonus} placeholder="+5" className="input w-24" />
                      <input name="damage" defaultValue={a.damage} placeholder="1d8+3" className="input w-28" />
                      <input name="type" defaultValue={a.type} placeholder="Slashing" className="input w-32" />
                      <button formAction={deleteAttack.bind(null, a.id, id)} className="btn btn-danger text-xs">
                        ✕
                      </button>
                    </AutoSaveForm>
                  </details>
                </li>
              ))}
            </ul>
          </>
        )}
        <details className="group rounded-lg border border-dashed border-white/15">
          <summary className="cursor-pointer list-none p-3 text-sm font-medium text-neutral-400 select-none group-open:text-neutral-200 hover:text-neutral-200">
            + Add attack/spell
          </summary>
          <form action={addAttack.bind(null, character.id, id)} className="flex flex-wrap items-center gap-2 border-t border-white/10 p-3">
            <input name="name" placeholder="Attack/spell name" className="input flex-1 min-w-[120px]" required />
            <input name="attackBonus" placeholder="+5" className="input w-24" />
            <input name="damage" placeholder="1d8+3" className="input w-28" />
            <input name="type" placeholder="Slashing" className="input w-32" />
            <button className="btn btn-primary text-xs whitespace-nowrap">+ Add</button>
          </form>
        </details>
      </section>

      {/* languages + proficiencies */}
      <div className="grid gap-4 md:grid-cols-2">
        <section className="card space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-neutral-200">Languages</h3>
            <AddDisclosure label="+ Add">
              <form action={addLanguage.bind(null, character.id, id)} className="flex gap-2">
                <input name="name" placeholder="Add a language…" className="input" required />
                <button className="btn btn-primary text-xs whitespace-nowrap">Add</button>
              </form>
            </AddDisclosure>
          </div>
          <TagList items={character.languages} onDelete={deleteLanguage} campaignId={id} />
        </section>

        <section className="card space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-neutral-200">Proficiencies</h3>
            <AddDisclosure label="+ Add">
              <form action={addProficiency.bind(null, character.id, id)} className="flex gap-2">
                <input name="name" placeholder="Add a proficiency…" className="input" required />
                <button className="btn btn-primary text-xs whitespace-nowrap">Add</button>
              </form>
            </AddDisclosure>
          </div>
          <TagList items={character.proficiencies} onDelete={deleteProficiency} campaignId={id} />
        </section>
      </div>

      {/* features & traits */}
      <section className="card space-y-3 p-4">
        <h3 className="font-semibold text-neutral-200">Features & Traits</h3>
        {character.features.length === 0 ? (
          <p className="text-sm text-neutral-500">None yet.</p>
        ) : (
          <ul className="space-y-2">
            {character.features.map((f) => (
              <li key={f.id} className="rounded-lg border border-white/10">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3 select-none">
                    <span className="font-semibold text-neutral-100">{f.name || "Unnamed"}</span>
                    <svg
                      className="h-4 w-4 flex-shrink-0 text-neutral-500 transition-transform group-open:rotate-180"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                  </summary>

                  <div className="space-y-2 border-t border-white/10 p-3">
                    <AutoSaveForm action={updateFeature.bind(null, f.id, id)} className="space-y-2">
                      <input name="name" defaultValue={f.name} className="input font-semibold" />
                      <textarea name="description" defaultValue={f.description} className="input min-h-[70px]" placeholder="Description…" />
                    </AutoSaveForm>
                    <form action={deleteFeature.bind(null, f.id, id)} className="mt-1">
                      <button className="btn btn-danger text-xs">Delete</button>
                    </form>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
        <details className="group rounded-lg border border-dashed border-white/15">
          <summary className="cursor-pointer list-none p-3 text-sm font-medium text-neutral-400 select-none group-open:text-neutral-200 hover:text-neutral-200">
            + Add feature/trait
          </summary>
          <form action={addFeature.bind(null, character.id, id)} className="space-y-2 border-t border-white/10 p-3">
            <input name="name" placeholder="New feature/trait name" className="input" required />
            <textarea name="description" placeholder="Description…" className="input min-h-[70px]" />
            <button className="btn btn-primary text-sm">+ Add feature</button>
          </form>
        </details>
      </section>
    </div>
  );
}
