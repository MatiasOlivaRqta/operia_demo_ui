export const dataSource: "api" | "local" =
  process.env.NEXT_PUBLIC_DATA_SOURCE === "api" ? "api" : "local";
