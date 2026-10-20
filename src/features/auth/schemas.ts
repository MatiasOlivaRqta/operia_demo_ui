import { z } from "zod";

export const loginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(1024),
});

export type LoginValues = z.infer<typeof loginSchema>;

export type AuthSession = Readonly<{
  user: Readonly<{ id: string; email: string; name: string }>;
  companies: readonly Readonly<{ id: string; legalName: string; name: string }>[];
  activeCompany: Readonly<{ id: string; legalName: string; name: string }>;
  role: Readonly<{ id: string; name: string }>;
  permissions: readonly string[];
}>;
