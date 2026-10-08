import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createCampaign, deleteCampaign } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireUser();
  const campaigns = await prisma.campaign.findMany({
    where: { memberships: { some: { userId: user.id } } },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { notes: true, entities: true, inventory: true, memberships: true } } },
  });

  return (
    <div className="space-y-8">
      <section>
        <h1 className="mb-1 text-2xl font-bold">Your Campaigns</h1>
        <p className="text-sm text-neutral-400">
          Each campaign holds its own notes, characters, places, items, and equipment.
        </p>
      </section>

      <form action={createCampaign} className="card flex gap-2 p-3">
        <input name="name" placeholder="New campaign name…" className="input" required />
        <button className="btn btn-primary whitespace-nowrap">+ Create</button>
      </form>

      {campaigns.length === 0 ? (
        <p className="text-neutral-500">No campaigns yet. Create one above to get started.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {campaigns.map((c) => (
            <li key={c.id} className="card flex flex-col justify-between p-4">
              <div>
                <Link
                  href={`/campaign/${c.id}/notes`}
                  className="text-lg font-semibold text-amber-400 hover:underline"
                >
                  {c.name}
                </Link>
                <p className="mt-1 text-xs text-neutral-500">
                  {c._count.notes} notes · {c._count.entities} entities · {c._count.inventory} items ·{" "}
                  {c._count.memberships} {c._count.memberships === 1 ? "member" : "members"}
                </p>
              </div>
              {c.ownerId === user.id && (
                <div className="mt-3 flex justify-end">
                  <form action={deleteCampaign.bind(null, c.id)}>
                    <button className="btn btn-danger text-xs">Delete</button>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
