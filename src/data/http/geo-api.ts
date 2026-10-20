import { requestApi } from "@/data/http/client";
import type { GeoApi, GeoLocality, GeoProvince } from "@/data/api";

export const geoApi: GeoApi = {
  provinces: () => requestApi<readonly GeoProvince[]>("/geo/provinces"),
  localities: (provinceId) =>
    requestApi<readonly GeoLocality[]>(
      `/geo/provinces/${encodeURIComponent(provinceId)}/localities`,
    ),
};
