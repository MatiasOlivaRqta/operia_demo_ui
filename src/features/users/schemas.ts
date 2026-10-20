import { z } from "zod";

const trimmedText = z.string().trim();

export const managedRoleSchema = z.object({
  name: trimmedText.min(1, "validation.required").max(60, "validation.maxLength|60"),
  permissions: z.array(z.string()),
});

export const createManagedUserSchema = z.object({
  email: trimmedText.min(1, "validation.required").pipe(z.email("validation.email")),
  name: trimmedText.min(1, "validation.required").max(120, "validation.maxLength|120"),
  password: z.string().min(12, "validation.minLength|12").max(128, "validation.maxLength|128"),
  roleId: trimmedText.min(1, "validation.required"),
});

export type ManagedRoleFormValues = z.infer<typeof managedRoleSchema>;
export type CreateManagedUserFormValues = z.infer<typeof createManagedUserSchema>;
