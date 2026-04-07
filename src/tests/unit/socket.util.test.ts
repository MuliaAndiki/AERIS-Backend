import { describe, expect, it } from "bun:test";

import { locationMatches } from "@/utils/socket";

describe("socket location helper", () => {
  it("returns true when location values are identical", () => {
    expect(
      locationMatches(
        {
          latitude: 1,
          longitude: 2,
          city: "Jakarta",
          state: "DKI Jakarta",
          country: "Indonesia",
          radius: 1000,
        },
        {
          userId: "user-1",
          latitude: 1,
          longitude: 2,
          city: "Jakarta",
          state: "DKI Jakarta",
          country: "Indonesia",
          radius: 1000,
        },
      ),
    ).toBe(true);
  });

  it("returns false when any location field changes", () => {
    expect(
      locationMatches(
        {
          latitude: 1,
          longitude: 2,
          city: "Jakarta",
          state: "DKI Jakarta",
          country: "Indonesia",
          radius: 1000,
        },
        {
          userId: "user-1",
          latitude: 1,
          longitude: 3,
          city: "Jakarta",
          state: "DKI Jakarta",
          country: "Indonesia",
          radius: 1000,
        },
      ),
    ).toBe(false);
  });
});
