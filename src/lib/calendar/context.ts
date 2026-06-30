import "server-only";

import type { Membership, PrismaClient } from "@prisma/client";

import { DEFAULT_ACTOR, DEFAULT_WORKSPACE_ID } from "@/lib/deals/stage-definitions";

export async function ensureCalendarWorkspace(prisma: PrismaClient) {
  const existing = await prisma.workspace.findFirst({
    orderBy: {
      createdAt: "asc",
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.workspace.create({
    data: {
      id: DEFAULT_WORKSPACE_ID,
      name: "Axe CRM",
      slug: "axe-crm",
    },
  });
}

export async function ensureCalendarActor(
  prisma: PrismaClient,
  workspaceId: string,
): Promise<Membership> {
  const existing = await prisma.membership.findFirst({
    where: {
      workspaceId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.membership.create({
    data: {
      workspaceId,
      userId: DEFAULT_ACTOR.id,
      email: DEFAULT_ACTOR.email,
      fullName: DEFAULT_ACTOR.name,
      role: "admin",
    },
  });
}

export async function getCalendarContext(prisma: PrismaClient) {
  const workspace = await ensureCalendarWorkspace(prisma);
  const actor = await ensureCalendarActor(prisma, workspace.id);

  return {
    workspaceId: workspace.id,
    actor,
  };
}
