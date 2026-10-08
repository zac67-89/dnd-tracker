import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  addItem,
  updateItem,
  deleteItem,
  moveItem,
  setCapacities,
  addItemFromTemplate,
  deleteItemTemplate,
} from "@/lib/actions";
import { AutoSaveForm } from "@/components/AutoSaveForm";

export const dynamic = "force-dynamic";

function CapacityBar({ carried, cap }: { carried: number; cap: number }) {
  const pct = cap > 0 ? Math.min(100, (carried / cap) * 100) : 0;
  const over = carried > cap;
  return (
    <div className="mt-2">
      <div className="flex justify-between text-sm">
        <span className={over ? "font-semibold text-red-400" : "text-neutral-300"}>
          {carried.toFixed(1)} / {cap.toFixed(0)} lbs
        </span>
        {over && <span className="text-xs font-semibold text-red-400">OVER-ENCUMBERED</span>}
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded bg-white/10">
        <div
          className={`h-full ${over ? "bg-red-500" : "bg-emerald-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default async function EquipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) notFound();

  const items = await prisma.inventoryItem.findMany({
    where: { campaignId: id },
    orderBy: { name: "asc" },
  });

  const templates = await prisma.itemTemplate.findMany({
    where: { campaignId: id },
    orderBy: { name: "asc" },
  });

  const sumLbs = (loc: string) =>
    items.filter((i) => i.location === loc).reduce((a, i) => a + i.weightLbs * i.quantity, 0);
  const selfLbs = sumLbs("SELF");
  const horseLbs = sumLbs("HORSE");
  const totalWorth = items.reduce((a, i) => a + i.worth * i.quantity, 0);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Equipment</h2>

      {/* capacity summary + editor */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="card p-4">
          <h3 className="font-semibold text-neutral-200">🎒 Carried by You</h3>
          <CapacityBar carried={selfLbs} cap={campaign.carryCapacitySelf} />
        </div>
        <div className="card p-4">
          <h3 className="font-semibold text-neutral-200">🐴 On Horse</h3>
          <CapacityBar carried={horseLbs} cap={campaign.carryCapacityHorse} />
        </div>
      </div>

      <form action={setCapacities.bind(null, id)} className="card flex flex-wrap items-end gap-3 p-3">
        <label className="text-sm">
          <span className="text-neutral-400">Your max (lbs)</span>
          <input name="self" type="number" step="any" defaultValue={campaign.carryCapacitySelf} className="input mt-1 w-32" />
        </label>
        <label className="text-sm">
          <span className="text-neutral-400">Horse max (lbs)</span>
          <input name="horse" type="number" step="any" defaultValue={campaign.carryCapacityHorse} className="input mt-1 w-32" />
        </label>
        <button className="btn btn-ghost">Update capacity</button>
        <span className="ml-auto self-center text-sm text-neutral-400">
          Total worth: <span className="font-semibold text-amber-400">{totalWorth.toFixed(2)} gp</span>
        </span>
      </form>

      {/* add item */}
      <details className="group card border border-dashed border-white/15 p-0">
        <summary className="cursor-pointer list-none p-3 text-sm font-medium text-neutral-400 select-none group-open:text-neutral-200 hover:text-neutral-200">
          + Add item
        </summary>
        <form action={addItem.bind(null, id)} className="grid gap-2 border-t border-white/10 p-3 sm:grid-cols-6">
          <input name="name" placeholder="Item name" className="input sm:col-span-2" required />
          <input name="worth" type="number" step="any" placeholder="Worth (gp)" className="input" />
          <input name="weightLbs" type="number" step="any" placeholder="Weight (lbs)" className="input" />
          <input name="quantity" type="number" min="1" defaultValue={1} placeholder="Qty" className="input" />
          <select name="location" className="input">
            <option value="SELF">On Me</option>
            <option value="HORSE">On Horse</option>
          </select>
          <input name="description" placeholder="Description (optional)…" className="input sm:col-span-6" />
          <button className="btn btn-primary sm:col-span-6">+ Add item</button>
        </form>
      </details>

      {/* saved items: info remembered from deleted items, ready to re-add */}
      {templates.length > 0 && (
        <section className="card space-y-2 p-4">
          <h3 className="font-semibold text-neutral-200">📋 Saved Items</h3>
          <p className="text-xs text-neutral-500">Remembered from items you removed — add one back without retyping its info.</p>
          <ul className="space-y-2 divide-y divide-white/5">
            {templates.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-2 pt-2 first:pt-0">
                <span className="flex-1 min-w-[100px] truncate font-medium text-neutral-100">{t.name}</span>
                <span className="text-xs text-neutral-500">{t.weightLbs.toFixed(1)} lbs</span>
                <span className="text-xs text-amber-400">{t.worth.toFixed(2)} gp</span>
                <form action={addItemFromTemplate.bind(null, t.id, id)} className="flex items-center gap-1.5">
                  <input name="quantity" type="number" min="1" defaultValue={1} className="input w-16" />
                  <select name="location" className="input w-28">
                    <option value="SELF">On Me</option>
                    <option value="HORSE">On Horse</option>
                  </select>
                  <button className="btn btn-primary text-xs whitespace-nowrap">+ Add</button>
                </form>
                <form action={deleteItemTemplate.bind(null, t.id, id)}>
                  <button className="btn btn-danger text-xs">✕</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* item list, grouped by location */}
      {items.length === 0 ? (
        <p className="text-neutral-500">No equipment yet.</p>
      ) : (
        <>
          <ItemGroup title="🎒 On You" items={items.filter((i) => i.location === "SELF")} campaignId={id} />
          <ItemGroup title="🐴 On Horse" items={items.filter((i) => i.location === "HORSE")} campaignId={id} />
        </>
      )}
    </div>
  );
}

function ItemGroup({
  title,
  items,
  campaignId,
}: {
  title: string;
  items: {
    id: string;
    name: string;
    description: string;
    worth: number;
    weightLbs: number;
    quantity: number;
    location: string;
  }[];
  campaignId: string;
}) {
  if (items.length === 0) return null;
  return (
    <section className="card space-y-2 p-4">
      <h3 className="font-semibold text-neutral-200">{title}</h3>
      <ul className="space-y-2 divide-y divide-white/5">
        {items.map((i) => {
          const lineWeight = (i.weightLbs * i.quantity).toFixed(1);
          return (
            <li key={i.id} className="pt-2 first:pt-0">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 select-none">
                  <span className="flex-1 min-w-[100px] truncate font-medium text-neutral-100">{i.name || "Unnamed"}</span>
                  <span className="text-xs text-neutral-500">×{i.quantity}</span>
                  <span className="hidden text-xs text-neutral-500 sm:inline">{lineWeight} lbs</span>
                  <span className="hidden text-xs text-amber-400 sm:inline">{(i.worth * i.quantity).toFixed(2)} gp</span>
                  <svg
                    className="h-4 w-4 flex-shrink-0 text-neutral-500 transition-transform group-open:rotate-180"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </summary>

                <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
                  <AutoSaveForm action={updateItem.bind(null, i.id, campaignId)} className="grid items-end gap-2 sm:grid-cols-6">
                    <label className="text-xs sm:col-span-2">
                      <span className="text-neutral-500">Name</span>
                      <input name="name" defaultValue={i.name} className="input mt-1" />
                    </label>
                    <label className="text-xs">
                      <span className="text-neutral-500">Worth</span>
                      <input name="worth" type="number" step="any" defaultValue={i.worth} className="input mt-1" />
                    </label>
                    <label className="text-xs">
                      <span className="text-neutral-500">Wt/ea</span>
                      <input name="weightLbs" type="number" step="any" defaultValue={i.weightLbs} className="input mt-1" />
                    </label>
                    <label className="text-xs">
                      <span className="text-neutral-500">Qty</span>
                      <input name="quantity" type="number" min="1" defaultValue={i.quantity} className="input mt-1" />
                    </label>
                    <label className="text-xs">
                      <span className="text-neutral-500">Where</span>
                      <select name="location" defaultValue={i.location} className="input mt-1">
                        <option value="SELF">On Me</option>
                        <option value="HORSE">On Horse</option>
                      </select>
                    </label>
                    <input
                      name="description"
                      defaultValue={i.description}
                      placeholder="Description (optional)…"
                      className="input sm:col-span-6"
                    />
                  </AutoSaveForm>

                  <div className="flex items-center gap-2">
                    <form action={moveItem.bind(null, i.id, campaignId, i.location === "SELF" ? "HORSE" : "SELF")}>
                      <button className="btn btn-ghost text-xs">
                        Move to {i.location === "SELF" ? "🐴 Horse" : "🎒 Me"}
                      </button>
                    </form>
                    <form action={deleteItem.bind(null, i.id, campaignId)}>
                      <button className="btn btn-danger text-xs">Delete</button>
                    </form>
                  </div>
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
