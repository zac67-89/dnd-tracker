import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import NavTabs from "@/components/NavTabs";

export default async function CampaignLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) notFound();

  const membership = await prisma.campaignMembership.findUnique({
    where: { campaignId_userId: { campaignId: id, userId: user.id } },
  });
  if (!membership) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <Link href="/" className="hover:text-neutral-300">
          Campaigns
        </Link>
        <span>/</span>
        <span className="font-semibold text-neutral-200">{campaign.name}</span>
      </div>
      <NavTabs campaignId={id} />
      <div className="pt-2">{children}</div>
    </div>
  );
}
