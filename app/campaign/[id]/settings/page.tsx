import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import CopyLinkButton from "@/components/CopyLinkButton";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) notFound();

  const memberships = await prisma.campaignMembership.findMany({
    where: { campaignId: id },
    include: { user: true },
    orderBy: { joinedAt: "asc" },
  });

  const hdrs = await headers();
  const host = hdrs.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  const inviteUrl = `${protocol}://${host}/join/${campaign.inviteCode}`;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Settings</h2>

      <section className="card space-y-3 p-4">
        <h3 className="font-semibold text-neutral-200">Invite Friends</h3>
        <p className="text-xs text-neutral-500">Anyone with this link can join the campaign and get their own character sheet.</p>
        <div className="flex items-center gap-2">
          <input readOnly value={inviteUrl} className="input" onFocus={(e) => e.currentTarget.select()} />
          <CopyLinkButton text={inviteUrl} />
        </div>
      </section>

      <section className="card space-y-3 p-4">
        <h3 className="font-semibold text-neutral-200">Members</h3>
        <ul className="space-y-1.5">
          {memberships.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-neutral-200">{m.user.name || m.user.email}</span>
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-neutral-400">
                {m.role === "OWNER" ? "Owner" : "Member"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
