"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { addDiscardGrams, closeJar, useDiscard } from "@/lib/discard/jars";
import { getRecipe } from "@/lib/discard/recipes";

const addSchema = z.object({
  grams: z.coerce.number().min(1).max(2000),
});

export async function addDiscardAction(formData: FormData) {
  const user = await requireUser();
  if (!user) redirect("/login");
  const parsed = addSchema.parse({ grams: formData.get("grams") });
  await addDiscardGrams(user.id, parsed.grams);
  revalidatePath("/discard");
}

const useSchema = z.object({
  recipeKey: z.string().min(1),
  grams: z.coerce.number().min(1).max(2000).optional(),
  notes: z.string().max(500).optional().nullable(),
  rating: z.coerce.number().int().min(1).max(5).optional().nullable(),
});

export async function useDiscardAction(formData: FormData) {
  const user = await requireUser();
  if (!user) redirect("/login");
  const parsed = useSchema.parse({
    recipeKey: formData.get("recipeKey"),
    grams: formData.get("grams") ?? undefined,
    notes: formData.get("notes") ?? undefined,
    rating: formData.get("rating") ?? undefined,
  });

  const recipe = getRecipe(parsed.recipeKey);
  if (!recipe) throw new Error(`Unknown recipe: ${parsed.recipeKey}`);

  await useDiscard({
    userId: user.id,
    recipeKey: recipe.key,
    recipeName: recipe.name,
    grams: parsed.grams ?? recipe.grams,
    notes: parsed.notes ?? undefined,
    rating: parsed.rating ?? undefined,
  });
  revalidatePath("/discard");
}

export async function closeJarAction() {
  const user = await requireUser();
  if (!user) redirect("/login");
  await closeJar(user.id);
  revalidatePath("/discard");
}
