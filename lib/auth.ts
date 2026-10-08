import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user as { id: string; name?: string | null; email?: string | null; image?: string | null };
}

export async function requireCampaignAccess(campaignId: string, userId: string) {
  const membership = await prisma.campaignMembership.findUnique({
    where: { campaignId_userId: { campaignId, userId } },
  });
  if (!membership) throw new Error("Forbidden");
  return membership;
}

export async function requireCampaignOwner(campaignId: string, userId: string) {
  const membership = await requireCampaignAccess(campaignId, userId);
  if (membership.role !== "OWNER") throw new Error("Forbidden");
  return membership;
}

export async function requireCharacterOwner(characterId: string, userId: string) {
  const character = await prisma.character.findUnique({ where: { id: characterId } });
  if (!character || character.userId !== userId) throw new Error("Forbidden");
  return character;
}
