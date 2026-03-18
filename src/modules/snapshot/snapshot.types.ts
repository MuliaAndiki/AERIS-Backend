export type SnapshotQuery = Partial<
  Record<"snapshotId" | "locationId" | "limit", string>
>;

export interface GenerateSnapshotBody {
  locationId?: string;
}
