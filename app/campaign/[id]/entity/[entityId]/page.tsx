import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { KIND_LABEL, typeToKind } from "@/lib/kinds";
import { updateEntity, deleteEntity } from "@/lib/actions";

export const dynamic = "force-dynamic";

const TYPE_COLOR: Record<string, string> = {
  CHARACTER: "text-emerald-400",
  PLACE: "text-sky-400",
  ITEM: "text-amber-400",
};

export default async function EntityDetail({
  params,
}: {
  params: Promise<{ id: string; entityId: string }>;
}) {
  const { id, entityId } = await params;

  const entity = await prisma.entity.findUnique({
    where: { id: entityId },
    include: { notes: { orderBy: { updatedAt: "desc" } } },
  });
  if (!entity || entity.campaignId !== id) notFound();

  const kind = typeToKind(entity.type);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/campaign/${id}/entities/${kind}`}
          className="text-sm text-neutral-400 hover:text-neutral-200"
        >
          ← {KIND_LABEL[kind]}
        </Link>
        <span className={`text-xs font-semibold uppercase ${TYPE_COLOR[entity.type]}`}>
          {entity.type}
        </span>
      </div>

      <form action={updateEntity.bind(null, entityId, id)} className="card space-y-3 p-4">
        <label className="block text-sm">
          <span className="text-neutral-400">Name</span>
          <input name="name" defaultValue={entity.name} className="input mt-1" required />
        </label>
        <label className="block text-sm">
          <span className="text-neutral-400">Short description</span>
          <input name="description" defaultValue={entity.description} className="input mt-1" placeholder="One-liner…" />
        </label>
        <label className="block text-sm">
          <span className="text-neutral-400">Details / notes</span>
          <textarea name="details" defaultValue={entity.details} className="input mt-1 min-h-[140px]" placeholder="Backstory, stats, secrets, whatever you want to track…" />
        </label>
        <button className="btn btn-primary">Save</button>
      </form>

      <form action={deleteEntity.bind(null, entityId, id, kind)}>
        <button className="btn btn-danger text-sm">Delete this {entity.type.toLowerCase()}</button>
      </form>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Mentioned in {entity.notes.length} note(s)
        </h3>
        {entity.notes.length === 0 ? (
          <p className="text-neutral-600 text-sm">Not referenced in any note yet.</p>
        ) : (
          <ul className="space-y-1">
            {entity.notes.map((n) => (
              <li key={n.id}>
                <Link href={`/campaign/${id}/notes/${n.id}`} className="text-amber-400 hover:underline">
                  {n.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
