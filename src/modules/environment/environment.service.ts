import prisma from "prisma/client";
import {
  ProviderStatus,
  RawEnvironmentQuery,
} from "@/modules/environment/environment.types";

export class ServiceError extends Error {
  public readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

class EnvironmentService {
  public async getRawEnvironment(query: RawEnvironmentQuery) {
    let locationId = query.locationId;

    if (!locationId && query.userId) {
      const location = await prisma.userLocation.findFirst({
        where: { userId: query.userId },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      locationId = location?.id;
    }

    if (!locationId) {
      throw new ServiceError("locationId or userId is required", 400);
    }

    const snapshot = await prisma.environmentalSnapshot.findFirst({
      where: { locationId },
      orderBy: { snapshotTime: "desc" },
      include: {
        airQuality: true,
        weatherCondition: true,
        noiseEstimation: true,
        scoreDetail: true,
        recommendations: true,
        greenAccessScores: {
          include: {
            greenArea: true,
          },
        },
      },
    });

    if (!snapshot) {
      throw new ServiceError("No environmental snapshot found", 404);
    }

    return snapshot;
  }

  public async getProviders() {
    return prisma.apiProvider.findMany({
      orderBy: { name: "asc" },
    });
  }

  public async getProviderStatuses(): Promise<ProviderStatus[]> {
    const providers = await prisma.apiProvider.findMany({
      include: {
        fetchLogs: {
          orderBy: { fetchTime: "desc" },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    });

    return providers.map((provider) => ({
      id: provider.id,
      name: provider.name,
      providerType: provider.providerType,
      baseUrl: provider.baseUrl,
      status: provider.fetchLogs[0]?.status ?? "unknown",
      lastFetchTime: provider.fetchLogs[0]?.fetchTime ?? null,
    }));
  }
}

export default new EnvironmentService();
