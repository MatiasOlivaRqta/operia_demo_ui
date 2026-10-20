import type { ReactNode } from "react";
import { DataProvider } from "@/data/provider";

type PrintLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function PrintLayout({ children }: PrintLayoutProps) {
  return <DataProvider>{children}</DataProvider>;
}
