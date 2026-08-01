import { db } from "@/lib/db";
import type { MemberDto } from "@/lib/dto";

/** La mesa de una campaña, con el dueño siempre delante. */
export async function listMembers(campaignId: string): Promise<MemberDto[]> {
  const members = await db.campaignMember.findMany({
    where: { campaignId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      userId: true,
      role: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
    },
  });

  return members.map((member) => ({
    userId: member.userId,
    name: member.user.name,
    email: member.user.email,
    isOwner: member.role === "OWNER",
    joinedAt: member.createdAt.toISOString(),
  }));
}
