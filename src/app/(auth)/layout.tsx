import type { ReactNode } from "react";

type AuthLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function AuthLayout({ children }: AuthLayoutProps) {
  return <div className="bg-auth-background min-h-dvh text-slate-100">{children}</div>;
}
