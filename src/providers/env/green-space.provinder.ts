import { AppContext } from "@/contex/appContex";
import { ErrorHandling, HttpResponse } from "@/contex/error";
import { AxiosEnvironment } from "@/utils/axios";

class GreenSpaceProvinder {
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

      const respone = await greenSpace.post(
        "/interpreter",
        `data=${encodeURIComponent(overpassQuery)}`,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );

      if (!respone) {
        return HttpResponse(c).badRequest();
      }
      const element = respone.data.elements;

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
      return ErrorHandling(c, error);
    }
  }
}

export default new GreenSpaceProvinder();
