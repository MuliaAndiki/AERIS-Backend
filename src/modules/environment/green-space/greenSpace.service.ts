import { AppContext } from "@/context/appContext";
import { ErrorHandling, HttpResponse } from "@/context/error";
import prisma from "prisma/client";
import MapProvider from "@/providers/map.provider";
import { environmentCache } from "@/modules/environment/environment.cache";
import { ENV_CACHE_TTL } from "@/modules/environment/environment.cache-policy";
import {
  getOrCreateLatestSnapshot,
  refreshEnvironmentCache,
  upsertScoreDetailAndUpdateSnapshot,
} from "@/modules/environment/environment.persistence";

type ReviewSort = "latest" | "top-rated";
type ReviewFilter = "visible" | "all" | "flagged";

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceInKm(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
) {
  const earthRadiusKm = 6371;

  const deltaLat = toRadians(toLat - fromLat);
  const deltaLon = toRadians(toLon - fromLon);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function accessibilityScoreByDistance(
  distanceKm: number,
  radiusMeters: number,
) {
  const radiusKm = Math.max(radiusMeters / 1000, 0.1);
  const ratio = Math.max(0, 1 - distanceKm / radiusKm);
  return Math.max(0, Math.min(100, Math.round(ratio * 100)));
}

function aggregateGreenSpaceScore(accessibilityScores: number[]) {
  if (!accessibilityScores.length) {
    return 0;
  }

  const nearestTopFive = accessibilityScores
    .slice()
    .sort((left, right) => right - left)
    .slice(0, 5);

  const sum = nearestTopFive.reduce((acc, current) => acc + current, 0);
  return Math.round(sum / nearestTopFive.length);
}

class GreenSpaceService {
  public async getGreenSpace(c: AppContext) {
    try {
      if (!c.user?.id) {
        return HttpResponse(c).unauthorized();
      }

      const locationQuery = await prisma.userLocation.findFirst({
        where: {
          userId: c.user.id,
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          latitude: true,
          city: true,
          longitude: true,
          radius: true,
        },
      });

      if (!locationQuery) {
        return HttpResponse(c).badGateway();
      }

      const { latitude, longitude, radius } = locationQuery;

      console.log(
        `[GreenSpace] User location: lat=${latitude}, lon=${longitude}, radius=${radius}`,
      );

      const cacheKey = [
        "green-space",
        c.user.id,
        latitude,
        longitude,
        radius,
      ].join(":");

      const greenSpace = await environmentCache.getOrSet(
        cacheKey,
        ENV_CACHE_TTL.GREEN_SPACE_MS,
        () =>
          MapProvider.greenSpace.getGreenSpace(latitude, longitude, radius, c),
      );

      console.log(
        `[GreenSpace] API Response parkData count:`,
        greenSpace?.parkData?.length ?? 0,
      );

      if (!greenSpace) {
        console.warn(
          `[GreenSpace Service] No data returned for user ${c.user.id}`,
        );

        const snapshot = await getOrCreateLatestSnapshot(locationQuery.id);
        await prisma.greenAccessScore.deleteMany({
          where: {
            snapshotId: snapshot.id,
          },
        });
        await upsertScoreDetailAndUpdateSnapshot(snapshot.id, {
          greenSpaceScore: 0,
        });
        refreshEnvironmentCache(c.user.id);

        return { greenAreas: [] };
      }

      const parkData = Array.isArray(greenSpace.parkData)
        ? greenSpace.parkData.filter((park: any) => {
            const parkLatitude = Number(park?.latitude);
            const parkLongitude = Number(park?.longitude);
            return (
              Number.isFinite(parkLatitude) && Number.isFinite(parkLongitude)
            );
          })
        : [];

      const greenAreas = await Promise.all(
        parkData.map(async (park: any) => {
          const existing = await prisma.greenArea.findFirst({
            where: {
              name: park.name,
              latitude: Number(park.latitude),
              longitude: Number(park.longitude),
            },
            select: {
              id: true,
              name: true,
              latitude: true,
              longitude: true,
              areaSize: true,
            },
          });

          if (existing) {
            return existing;
          }

          return prisma.greenArea.create({
            data: {
              name: String(park.name ?? "Green Space"),
              latitude: Number(park.latitude),
              longitude: Number(park.longitude),
              areaSize: Number(park.areaSize ?? 0),
            },
            select: {
              id: true,
              name: true,
              latitude: true,
              longitude: true,
              areaSize: true,
            },
          });
        }),
      );

      const uniqueGreenAreas = Array.from(
        new Map(greenAreas.map((area) => [area.id, area])).values(),
      );

      const snapshot = await getOrCreateLatestSnapshot(locationQuery.id);

      const accessRows = uniqueGreenAreas.map((area) => {
        const distanceKm = distanceInKm(
          latitude,
          longitude,
          area.latitude,
          area.longitude,
        );

        const accessibilityScore = accessibilityScoreByDistance(
          distanceKm,
          radius,
        );

        return {
          snapshotId: snapshot.id,
          greenAreaId: area.id,
          distanceKm: Number(distanceKm.toFixed(3)),
          accessibilityScore,
        };
      });

      await prisma.$transaction(async (tx) => {
        await tx.greenAccessScore.deleteMany({
          where: {
            snapshotId: snapshot.id,
          },
        });

        if (accessRows.length > 0) {
          await tx.greenAccessScore.createMany({
            data: accessRows,
          });
        }
      });

      const greenSpaceScore = aggregateGreenSpaceScore(
        accessRows.map((row) => row.accessibilityScore),
      );

      await upsertScoreDetailAndUpdateSnapshot(snapshot.id, {
        greenSpaceScore,
      });

      refreshEnvironmentCache(c.user.id);

      const greenAreaIds = uniqueGreenAreas.map((area) => area.id);

      const groupedReviews = greenAreaIds.length
        ? await prisma.greenAreaReview.groupBy({
            by: ["greenAreaId"],
            where: {
              greenAreaId: {
                in: greenAreaIds,
              },
              isHidden: false,
            },
            _avg: {
              rating: true,
            },
            _count: {
              id: true,
            },
          })
        : [];

      const statsByArea = new Map(
        groupedReviews.map((row) => [
          row.greenAreaId,
          {
            averageRating: Number((row._avg.rating ?? 0).toFixed(2)),
            totalReviews: row._count.id,
          },
        ]),
      );

      const greenAreasWithStats = uniqueGreenAreas.map((area) => ({
        ...area,
        averageRating: statsByArea.get(area.id)?.averageRating ?? 0,
        totalReviews: statsByArea.get(area.id)?.totalReviews ?? 0,
      }));

      return HttpResponse(c).ok(
        { greenSpace, greenAreas: greenAreasWithStats },
        "Green space loaded",
      );
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }

  public async getGreenSpaceReviews(c: AppContext) {
    try {
      const pageRaw = String((c.query as Record<string, unknown>)?.page ?? "1");
      const limitRaw = String(
        (c.query as Record<string, unknown>)?.limit ?? "10",
      );
      const sortRaw = String(
        (c.query as Record<string, unknown>)?.sort ?? "latest",
      ) as ReviewSort;
      const filterRaw = String(
        (c.query as Record<string, unknown>)?.filter ?? "visible",
      ) as ReviewFilter;
      const greenAreaId = String(
        (c.query as Record<string, unknown>)?.greenAreaId ?? "",
      );

      if (!greenAreaId) {
        return HttpResponse(c).badRequest("greenAreaId is required");
      }

      const page = Math.max(1, Number.parseInt(pageRaw, 10) || 1);
      const limit = Math.min(
        100,
        Math.max(1, Number.parseInt(limitRaw, 10) || 10),
      );
      const skip = (page - 1) * limit;

      const sort: ReviewSort =
        sortRaw === "top-rated" || sortRaw === "latest" ? sortRaw : "latest";
      const filter: ReviewFilter =
        filterRaw === "all" ||
        filterRaw === "flagged" ||
        filterRaw === "visible"
          ? filterRaw
          : "visible";

      const whereClause: Record<string, unknown> = {
        greenAreaId,
      };

      if (filter === "visible") {
        whereClause.isHidden = false;
      } else if (filter === "flagged") {
        whereClause.isFlagged = true;
      }

      const orderBy =
        sort === "top-rated"
          ? [{ rating: "desc" as const }, { createdAt: "desc" as const }]
          : [{ createdAt: "desc" as const }];

      const [reviews, totalData] = await prisma.$transaction([
        prisma.greenAreaReview.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy,
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                avaUrl: true,
              },
            },
          },
        }),
        prisma.greenAreaReview.count({
          where: whereClause,
        }),
      ]);

      const totalPages = Math.max(1, Math.ceil(totalData / limit));

      return HttpResponse(c).ok(
        {
          items: reviews,
          page,
          limit,
          sort,
          filter,
          totalData,
          totalPages,
        },
        "Green space reviews loaded",
      );
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }

  public async getGreenAreaDetail(c: AppContext) {
    try {
      const greenAreaId = String(
        (c.params as Record<string, unknown>)?.greenAreaId ?? "",
      );

      if (!greenAreaId) {
        return HttpResponse(c).badRequest("greenAreaId is required");
      }

      const greenArea = await prisma.greenArea.findUnique({
        where: {
          id: greenAreaId,
        },
        select: {
          id: true,
          name: true,
          latitude: true,
          longitude: true,
          areaSize: true,
        },
      });

      if (!greenArea) {
        return HttpResponse(c).notFound("Green area not found");
      }

      const stats = await prisma.greenAreaReview.aggregate({
        where: {
          greenAreaId,
          isHidden: false,
        },
        _avg: {
          rating: true,
        },
        _count: {
          id: true,
        },
      });

      const averageRating = Number((stats._avg.rating ?? 0).toFixed(2));
      const totalReviews = stats._count.id;

      return HttpResponse(c).ok(
        {
          ...greenArea,
          averageRating,
          totalReviews,
        },
        "Green area detail loaded",
      );
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }

  public async createGreenSpaceReview(c: AppContext) {
    try {
      if (!c.user?.id) {
        return HttpResponse(c).unauthorized("Unauthorized");
      }

      const body = c.body as {
        greenAreaId?: string;
        rating?: number;
        comment?: string;
        flagReason?: string;
      };

      if (
        !body.greenAreaId ||
        !body.comment ||
        typeof body.rating !== "number"
      ) {
        return HttpResponse(c).badRequest(
          "greenAreaId, rating, and comment are required",
        );
      }

      if (body.rating < 1 || body.rating > 5) {
        return HttpResponse(c).unprocessable("rating must be between 1 and 5");
      }

      const greenArea = await prisma.greenArea.findUnique({
        where: {
          id: body.greenAreaId,
        },
        select: {
          id: true,
        },
      });

      if (!greenArea) {
        return HttpResponse(c).notFound("Green area not found");
      }

      const review = await prisma.greenAreaReview.create({
        data: {
          userId: c.user.id,
          greenAreaId: body.greenAreaId,
          rating: body.rating,
          comment: body.comment,
          flagReason: body.flagReason,
        },
      });

      return HttpResponse(c).created(review, "Green space review created");
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }

  public async updateGreenSpaceReview(c: AppContext) {
    try {
      if (!c.user?.id) {
        return HttpResponse(c).unauthorized("Unauthorized");
      }

      const reviewId = String(
        (c.params as Record<string, unknown>)?.reviewId ?? "",
      );
      const body = c.body as {
        rating?: number;
        comment?: string;
        isFlagged?: boolean;
        flagReason?: string;
      };

      if (!reviewId) {
        return HttpResponse(c).badRequest("reviewId is required");
      }

      if (body.rating !== undefined && (body.rating < 1 || body.rating > 5)) {
        return HttpResponse(c).unprocessable("rating must be between 1 and 5");
      }

      if (body.rating === undefined && body.comment === undefined) {
        return HttpResponse(c).badRequest("rating or comment is required");
      }

      const existing = await prisma.greenAreaReview.findUnique({
        where: {
          id: reviewId,
        },
        select: {
          id: true,
          userId: true,
        },
      });

      if (!existing) {
        return HttpResponse(c).notFound("Review not found");
      }

      if (existing.userId !== c.user.id) {
        return HttpResponse(c).forbidden("You can only update your own review");
      }

      const updated = await prisma.greenAreaReview.update({
        where: {
          id: reviewId,
        },
        data: {
          rating: body.rating,
          comment: body.comment,
          isFlagged: body.isFlagged,
          flagReason: body.flagReason,
        },
      });

      return HttpResponse(c).ok(updated, "Green space review updated");
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }

  public async deleteGreenSpaceReview(c: AppContext) {
    try {
      if (!c.user?.id) {
        return HttpResponse(c).unauthorized("Unauthorized");
      }

      const reviewId = String(
        (c.params as Record<string, unknown>)?.reviewId ?? "",
      );

      if (!reviewId) {
        return HttpResponse(c).badRequest("reviewId is required");
      }

      const existing = await prisma.greenAreaReview.findUnique({
        where: {
          id: reviewId,
        },
        select: {
          id: true,
          userId: true,
        },
      });

      if (!existing) {
        return HttpResponse(c).notFound("Review not found");
      }

      if (existing.userId !== c.user.id) {
        return HttpResponse(c).forbidden("You can only delete your own review");
      }

      await prisma.greenAreaReview.delete({
        where: {
          id: reviewId,
        },
      });

      return HttpResponse(c).ok(null, "Green space review deleted");
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }

  public async moderateGreenSpaceReview(c: AppContext) {
    try {
      if (!c.user?.id) {
        return HttpResponse(c).unauthorized("Unauthorized");
      }

      const reviewId = String(
        (c.params as Record<string, unknown>)?.reviewId ?? "",
      );

      const body = c.body as {
        isHidden?: boolean;
        isFlagged?: boolean;
        flagReason?: string;
      };

      if (!reviewId) {
        return HttpResponse(c).badRequest("reviewId is required");
      }

      if (
        body.isHidden === undefined &&
        body.isFlagged === undefined &&
        body.flagReason === undefined
      ) {
        return HttpResponse(c).badRequest(
          "isHidden, isFlagged, or flagReason is required",
        );
      }

      const existing = await prisma.greenAreaReview.findUnique({
        where: {
          id: reviewId,
        },
        select: {
          id: true,
        },
      });

      if (!existing) {
        return HttpResponse(c).notFound("Review not found");
      }

      const updated = await prisma.greenAreaReview.update({
        where: {
          id: reviewId,
        },
        data: {
          isHidden: body.isHidden,
          isFlagged: body.isFlagged,
          flagReason: body.flagReason,
        },
      });

      return HttpResponse(c).ok(updated, "Green space review moderated");
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }
}

export default new GreenSpaceService();
