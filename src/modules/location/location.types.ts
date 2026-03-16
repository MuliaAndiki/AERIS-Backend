interface GeoLocation {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  state: string;
}

interface RequestMeta {
  ipAddress: string;
  userAgent: string;
}

type DetectLocationInput = Partial<
  Record<keyof Pick<GeoLocation, "latitude" | "longitude">, string> &
    Pick<GeoLocation, "city" | "country">
>;

export type DetectLocationQuery = Pick<
  DetectLocationInput,
  "latitude" | "longitude" | "city" | "country"
>;

export type DetectLocationResult = RequestMeta & {
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  country: string | null;
};

type ResolveLocationPayload = Required<
  Pick<GeoLocation, "latitude" | "longitude" | "city" | "country" | "state">
>;

export type ResolveLocationBody = ResolveLocationPayload & {
  userId?: string;
};
