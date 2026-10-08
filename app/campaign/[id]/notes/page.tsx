import Link from "next/link";
import { prisma } from "@/lib/db";
import { createNote } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function NotesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notes = await prisma.note.findMany({
    where: { campaignId: id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { links: true } } },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Session Notes</h2>
        <form action={createNote.bind(null, id)}>
          <button className="btn btn-primary">+ New Note</button>
        </form>
      </div>

      <p className="text-sm text-neutral-400">
        Write your story. Tag a{" "}
        <span className="text-emerald-400">character with [[name]]</span>,{" "}
        <span className="text-sky-400">place with ((name))</span>, or{" "}
        <span className="text-amber-400">item with {"{{name}}"}</span> — they auto-fill the tabs above.
      </p>

      {notes.length === 0 ? (
        <p className="text-neutral-500">No notes yet.</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="card p-3">
              <Link
                href={`/campaign/${id}/notes/${n.id}`}
                className="font-semibold text-amber-400 hover:underline"
              >
                {n.title}
              </Link>
              <p className="mt-1 line-clamp-1 text-xs text-neutral-500">
                {n._count.links} links · updated {n.updatedAt.toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
