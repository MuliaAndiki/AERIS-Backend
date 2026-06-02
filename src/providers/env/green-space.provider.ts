import { AppContext } from "@/context/appContext";
import { AxiosEnvironment } from "@/utils/axios";

class GreenSpaceProvider {
  public async getGreenSpace(
    lat: number,
    lon: number,
    radius: number,
    _c: AppContext,
  ) {
    try {
      const { greenSpace } = AxiosEnvironment({ lat, lon, radius });

      const response = await greenSpace.get("");

      if (!response || !response.data) {
        console.warn(
          `[GreenSpace] No response data from Geoapify API at lat:${lat}, lon:${lon}`,
        );
        return { parkData: [] };
      }

      const element = response.data.features || [];

      const parkData = element.map((el: any) => {
        const coordinates = el.geometry?.coordinates || [];
        const properties = el.properties || {};

        return {
          name: properties.name || "Taman Tanpa Nama",

          latitude: properties.lat ?? coordinates[1],
          longitude: properties.lon ?? coordinates[0],

          areaSize: 0,
        };
      });
      return { parkData };
    } catch (error) {
      console.error(
        `[GreenSpace] Error fetching from Geoapify at (${lat}, ${lon}):`,
        error instanceof Error ? error.message : error,
      );
      return { parkData: [] };
    }
  }
}

export default new GreenSpaceProvider();
