import { afterEach, describe, expect, it, vi } from "vitest";
import { geoApi } from "@/data/http/geo-api";

afterEach(() => vi.unstubAllGlobals());

describe("GeoApi HTTP adapter", () => {
  it("requests provinces and localities by province id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("[]", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await geoApi.provinces();
    await geoApi.localities("06");

    expect(fetchMock.mock.calls.map(([url, init]) => [url, init?.method])).toEqual([
      ["/api/geo/provinces", "GET"],
      ["/api/geo/provinces/06/localities", "GET"],
    ]);
  });
});
