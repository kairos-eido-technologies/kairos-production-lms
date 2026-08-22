import { describe, it, expect } from "vitest";
import { paginateArray } from "../src/lib/db/repositories/helpers";

describe("Pagination Utility and API Support", () => {
  const mockItems = Array.from({ length: 55 }, (_, i) => ({
    id: `item-${i + 1}`,
    name: `Item ${i + 1}`,
  }));

  it("paginates array accurately with default params", () => {
    const result = paginateArray(mockItems);
    expect(result.total).toBe(55);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.totalPages).toBe(3);
    expect(result.data.length).toBe(20);
    expect(result.data[0].id).toBe("item-1");
  });

  it("handles custom page and limit correctly", () => {
    const result = paginateArray(mockItems, { page: 2, limit: 10 });
    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
    expect(result.totalPages).toBe(6);
    expect(result.data.length).toBe(10);
    expect(result.data[0].id).toBe("item-11");
  });

  it("handles last partial page gracefully", () => {
    const result = paginateArray(mockItems, { page: 6, limit: 10 });
    expect(result.page).toBe(6);
    expect(result.data.length).toBe(5);
    expect(result.data[0].id).toBe("item-51");
  });

  it("clamps invalid negative or zero page numbers", () => {
    const result = paginateArray(mockItems, { page: -5, limit: 10 });
    expect(result.page).toBe(1);
    expect(result.data[0].id).toBe("item-1");
  });
});
