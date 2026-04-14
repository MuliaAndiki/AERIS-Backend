import { AppContext } from "@/context/appContext";
import { ErrorHandling, HttpResponse } from "@/context/error";
import { AxiosEnvironment } from "@/utils/axios";

class GreenSpaceProvider {
  public async getGreenSpace(
    lat: number,
    lon: number,
    radius: number,
    c: AppContext,
  ) {
    const overpassQuery = `
    [out:json];
    (
      node["leisure"="park"](around:${radius},${lat},${lon});
      way["leisure"="park"](around:${radius},${lat},${lon});
      node["leisure"="pitch"](around:${radius},${lat},${lon});
      way["leisure"="pitch"](around:${radius},${lat},${lon});
    );
    out center;
  `;
    try {
      const { greenSpace } = AxiosEnvironment({ lat, lon });

      const response = await greenSpace.post(
        "/interpreter",
        `data=${encodeURIComponent(overpassQuery)}`,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );

      if (!response || !response.data) {
        console.warn(
          `[GreenSpace] No response data from Overpass API at lat:${lat}, lon:${lon}`,
        );
        return { parkData: [] };
      }
      const element = response.data.elements || [];

      const parkData = element.map((el: any) => {
        return {
          name:
            el.tags?.name ||
            (el.tags?.leisure === "pitch"
              ? "Lapangan Olahraga"
              : "Taman Tanpa Nama"),

          latitude: el.lat || el.center?.lat,
          longitude: el.lon || el.center?.lon,

          areaSize: 0,
        };
      });
      return { parkData };
    } catch (error) {
      console.error(
        `[GreenSpace] Error fetching from Overpass at (${lat}, ${lon}):`,
        error instanceof Error ? error.message : error,
      );
      return { parkData: [] };
    }
  }
}

export default new GreenSpaceProvider();
