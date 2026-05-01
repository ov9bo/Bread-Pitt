import "server-only";
import { db } from "@/lib/db/client";
import { discardJars, discardUses } from "@/lib/db/schema";
import { and, desc, eq, isNotNull, isNull, sum } from "drizzle-orm";

export async function getCurrentJar(userId: string) {
  const [jar] = await db
    .select()
    .from(discardJars)
    .where(and(eq(discardJars.userId, userId), isNull(discardJars.closedAt)))
    .orderBy(desc(discardJars.openedAt))
    .limit(1);
  return jar ?? null;
}

export async function getOrCreateJar(userId: string) {
  const existing = await getCurrentJar(userId);
  if (existing) return existing;
  const [jar] = await db
    .insert(discardJars)
    .values({
      userId,
      openedAt: new Date(),
      currentGrams: 0,
    })
    .returning();
  return jar;
}

export async function getArchivedJars(userId: string, limit = 6) {
  return db
    .select()
    .from(discardJars)
    .where(and(eq(discardJars.userId, userId), isNotNull(discardJars.closedAt)))
    .orderBy(desc(discardJars.openedAt))
    .limit(limit);
}

export async function getJarUses(jarId: string) {
  return db
    .select()
    .from(discardUses)
    .where(eq(discardUses.jarId, jarId))
    .orderBy(desc(discardUses.usedAt));
}

export async function totalGramsUsed(jarId: string): Promise<number> {
  const [row] = await db
    .select({ total: sum(discardUses.gramsUsed) })
    .from(discardUses)
    .where(eq(discardUses.jarId, jarId));
  return Number(row?.total ?? 0);
}

export async function addDiscardGrams(userId: string, grams: number) {
  const jar = await getOrCreateJar(userId);
  await db
    .update(discardJars)
    .set({ currentGrams: jar.currentGrams + grams })
    .where(eq(discardJars.id, jar.id));
}

export async function useDiscard(input: {
  userId: string;
  recipeKey: string;
  recipeName: string;
  grams: number;
  notes?: string;
  rating?: number;
}) {
  const jar = await getOrCreateJar(input.userId);
  const taken = Math.min(input.grams, jar.currentGrams);
  const newTotal = Math.max(0, jar.currentGrams - taken);

  await db.insert(discardUses).values({
    jarId: jar.id,
    recipeKey: input.recipeKey,
    recipeName: input.recipeName,
    gramsUsed: taken,
    notes: input.notes ?? null,
    rating: input.rating ?? null,
    usedAt: new Date(),
  });

  await db
    .update(discardJars)
    .set({ currentGrams: newTotal })
    .where(eq(discardJars.id, jar.id));

  return { jar: { ...jar, currentGrams: newTotal }, used: taken };
}

export async function closeJar(userId: string, notes?: string) {
  const jar = await getCurrentJar(userId);
  if (!jar) return null;
  const [closed] = await db
    .update(discardJars)
    .set({ closedAt: new Date(), notes: notes ?? jar.notes })
    .where(eq(discardJars.id, jar.id))
    .returning();
  return closed;
}
