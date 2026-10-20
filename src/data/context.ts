import { createContext, useContext } from "react";
import type { DataApi, DataSnapshot } from "@/data/api";

export type DataContextValue = Readonly<{ api: DataApi; snapshot: DataSnapshot }>;
export const DataContext = createContext<DataContextValue | null>(null);

export function useDataContext(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData debe usarse dentro de DataProvider");
  return context;
}
