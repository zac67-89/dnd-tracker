import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { RenderNote } from "@/lib/parser";
import { deleteNote } from "@/lib/actions";
import NoteEditor from "@/components/NoteEditor";

export const dynamic = "force-dynamic";

export default async function NotePage({
  params,
}: {
  params: Promise<{ id: string; noteId: string }>;
}) {
  const { id, noteId } = await params;

  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note || note.campaignId !== id) notFound();

  // map every entity in the campaign so saved tokens can link to detail pages
  const entities = await prisma.entity.findMany({ where: { campaignId: id } });
  const entityMap: Record<string, string> = {};
  for (const e of entities) entityMap[`${e.type}::${e.name.toLowerCase()}`] = e.id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href={`/campaign/${id}/notes`} className="text-sm text-neutral-400 hover:text-neutral-200">
          ← All notes
        </Link>
        <form action={deleteNote.bind(null, noteId, id)}>
          <button className="btn btn-danger text-xs">Delete note</button>
        </form>
      </div>

      <NoteEditor noteId={noteId} campaignId={id} initialTitle={note.title} initialBody={note.body} />

      <section className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Preview</h3>
        <div className="card p-4">
          {note.body.trim() ? (
            <RenderNote body={note.body} campaignId={id} entityMap={entityMap} />
          ) : (
            <p className="text-neutral-600">Write something and hit Save to see linked entities.</p>
          )}
        </div>
      </section>
    </div>
  );
}
