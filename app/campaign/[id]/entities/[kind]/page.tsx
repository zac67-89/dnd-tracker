import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { KINDS, KIND_LABEL, KIND_SYNTAX, isKind } from "@/lib/kinds";
import { createEntity } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function EntitiesPage({
  params,
}: {
  params: Promise<{ id: string; kind: string }>;
}) {
  const { id, kind } = await params;
  if (!isKind(kind)) notFound();

  const type = KINDS[kind];
  const entities = await prisma.entity.findMany({
    where: { campaignId: id, type },
    orderBy: { name: "asc" },
    include: { _count: { select: { notes: true } } },
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">{KIND_LABEL[kind]}</h2>
        <p className="text-sm text-neutral-400">
          Auto-created when you write{" "}
          <code className="rounded bg-white/10 px-1">{KIND_SYNTAX[kind]}</code> in a note, or add one manually.
        </p>
      </div>

      <form action={createEntity.bind(null, id, type)} className="card flex gap-2 p-3">
        <input name="name" placeholder={`New ${KIND_LABEL[kind].slice(0, -1).toLowerCase()} name…`} className="input" required />
        <button className="btn btn-primary whitespace-nowrap">+ Add</button>
      </form>

      {entities.length === 0 ? (
        <p className="text-neutral-500">Nothing here yet.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {entities.map((e) => (
            <li key={e.id} className="card p-3">
              <Link
                href={`/campaign/${id}/entity/${e.id}`}
                className="font-semibold text-amber-400 hover:underline"
              >
                {e.name}
              </Link>
              <p className="mt-0.5 line-clamp-1 text-xs text-neutral-500">
                {e.description || "No description yet"} · {e._count.notes} note(s)
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
