import { randomUUID } from "crypto";

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function paginateArray<T>(items: T[], params?: PaginationParams): PaginatedResult<T> {
  const page = Math.max(1, params?.page || 1);
  const limit = Math.max(1, Math.min(100, params?.limit || 20));
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const offset = (page - 1) * limit;
  const data = items.slice(offset, offset + limit);

  return {
    data,
    total,
    page,
    limit,
    totalPages,
  };
}

export function makeId(): string {
  return `${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export function toIsoDate(val: any): string {
  if (!val) return new Date().toISOString().slice(0, 10);
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
    return d.toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function toIso(val: any): string {
  if (!val) return new Date().toISOString();
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return new Date().toISOString();
    return d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}
