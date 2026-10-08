import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { joinCampaign } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const campaign = await prisma.campaign.findUnique({ where: { inviteCode: code } });
  if (!campaign) notFound();

  const user = await requireUser();
  const membership = await prisma.campaignMembership.findUnique({
    where: { campaignId_userId: { campaignId: campaign.id, userId: user.id } },
  });

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="card space-y-3 p-6 text-center">
        <h1 className="text-xl font-bold">Join &ldquo;{campaign.name}&rdquo;?</h1>
        {membership ? (
          <>
            <p className="text-sm text-neutral-400">You&apos;re already a member of this campaign.</p>
            <a href={`/campaign/${campaign.id}/notes`} className="btn btn-primary inline-block">
              Go to campaign
            </a>
          </>
        ) : (
          <>
            <p className="text-sm text-neutral-400">You&apos;ll get shared access to its notes, world, and equipment, plus your own character sheet.</p>
            <form action={joinCampaign.bind(null, code)}>
              <button className="btn btn-primary">Join Campaign</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
