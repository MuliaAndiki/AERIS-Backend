import { AppContext } from "@/context/appContext";
import { AxiosEnvironment } from "@/utils/axios";

class NoiseProvider {
  public async getMajorRoadCount(lat: number, lon: number, c: AppContext) {
    const overpassQuery = `
    [out:json];
    (
      way["highway"="motorway"](around:500,${lat},${lon});
      way["highway"="trunk"](around:500,${lat},${lon});
      way["highway"="primary"](around:500,${lat},${lon});
    );
    out count;
  `;

    try {
      const { noise } = AxiosEnvironment({ lat, lon });

      const response = await noise.post(
        "/interpreter",
        `data=${encodeURIComponent(overpassQuery)}`,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );

      if (!response?.data?.elements?.length) {
        return 0;
      }

      const total = Number(response.data.elements[0]?.tags?.total);
      return Number.isFinite(total) ? total : 0;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown noise API error";
      console.warn(
        `[Noise] Overpass request failed for (${lat}, ${lon}): ${message}`,
      );
      // Return default value instead of throwing error
      // This prevents 500 response when Overpass API is temporarily unavailable
      return 2;
    }
  }
}

export default new NoiseProvider();
