import { afterEach, describe, expect, it, vi } from "vitest";
import { rolesApi, usersApi } from "@/data/http/users-roles-api";

afterEach(() => vi.restoreAllMocks());

describe("users and roles HTTP adapters", () => {
  it("reads users, roles, and the permission catalog", async () => {
    const responses = [
      [{ id: "u1", email: "a@example.com", name: "Ana", role: { id: "r1", name: "ADMIN" } }],
      [{ id: "r1", name: "ADMIN", isSystem: true, permissions: ["users.manage"], userCount: 1 }],
      [{ module: "users", permissions: ["users.manage"] }],
    ];
    const fetchMock = vi
      .fn()
      .mockImplementation(
        async () => new Response(JSON.stringify(responses.shift()), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(usersApi.list()).resolves.toMatchObject({ ok: true, value: [{ id: "u1" }] });
    await expect(rolesApi.list()).resolves.toMatchObject({ ok: true, value: [{ id: "r1" }] });
    await expect(rolesApi.permissionCatalog()).resolves.toMatchObject({
      ok: true,
      value: [{ module: "users", permissions: ["users.manage"] }],
    });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/users",
      "/api/roles",
      "/api/roles/permissions",
    ]);
  });

  it("preserves API field errors for role and membership conflicts", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              code: "validation",
              message: "Invalid",
              fieldErrors: { permissions: ["Unknown permission"] },
            },
          }),
          { status: 400 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              code: "conflict",
              message: "Already a member",
              fieldErrors: { email: ["Already assigned"] },
            },
          }),
          { status: 409 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const roleResult = await rolesApi.create({ name: "Bad", permissions: ["unknown.read"] });
    const userResult = await usersApi.create({
      email: "a@example.com",
      name: "Ana",
      password: "some-password",
      roleId: "r1",
    });
    expect(roleResult).toMatchObject({
      ok: false,
      error: { code: "validation", fieldErrors: { permissions: "Unknown permission" } },
    });
    expect(userResult).toMatchObject({
      ok: false,
      error: {
        code: "conflict",
        message: "Already a member",
        fieldErrors: { email: "Already assigned" },
      },
    });
  });
});
