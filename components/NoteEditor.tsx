"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveNote } from "@/lib/actions";

export default function NoteEditor({
  noteId,
  campaignId,
  initialTitle,
  initialBody,
}: {
  noteId: string;
  campaignId: string;
  initialTitle: string;
  initialBody: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function save() {
    startTransition(async () => {
      await saveNote(noteId, campaignId, title, body);
      setSaved(true);
      router.refresh(); // re-render chips below with any new entity links
      setTimeout(() => setSaved(false), 1500);
    });
  }

  return (
    <div className="space-y-3">
      <input
        className="input text-lg font-semibold"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Note title"
      />
      <textarea
        className="input min-h-[280px] font-mono text-sm leading-relaxed"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="The party arrived at ((Neverwinter)) and met [[Volo]], who offered them a {{Rusty Dagger}}…"
      />
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={pending} className="btn btn-primary disabled:opacity-50">
          {pending ? "Saving…" : "Save"}
        </button>
        {saved && <span className="text-sm text-emerald-400">Saved ✓</span>}
        <span className="text-xs text-neutral-500">
          [[character]] · ((place)) · {"{{item}}"}
        </span>
      </div>
    </div>
  );
}
