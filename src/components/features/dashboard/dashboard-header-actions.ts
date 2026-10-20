import type { Result } from "@/lib/result";

type SignOutDependencies = {
  dataSource: "api" | "local";
  logoutDemo: () => Promise<void>;
  postApi: (path: string) => Promise<Result<void>>;
  router: { replace: (path: string) => void };
};

export async function signOut({ dataSource, logoutDemo, postApi, router }: SignOutDependencies) {
  if (dataSource !== "api") return logoutDemo();
  const result = await postApi("/auth/logout");
  if (result.ok) router.replace("/login");
}
