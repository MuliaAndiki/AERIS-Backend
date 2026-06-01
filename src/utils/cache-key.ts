/** Round coordinates to ~1.1km precision to improve cache hit rate. */
export const roundCoord = (coord: number) => Math.round(coord * 100) / 100;
