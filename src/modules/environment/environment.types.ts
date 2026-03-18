interface ApiProviderEntity {
  id: string;
  name: string;
  providerType: string;
  baseUrl: string;
}

interface ProviderHealth {
  status: string;
  lastFetchTime: Date | null;
}

export type RawEnvironmentQuery = Partial<
  Record<"locationId" | "userId", string>
>;

export type ProviderStatus = ApiProviderEntity & ProviderHealth;
