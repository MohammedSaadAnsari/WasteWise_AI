import { apiGet } from "./api";

export type InventoryBatch = {
  batch_id: number;
  product_id: number;
  product_name: string;
  category: string;
  quantity_remaining: number;
  expiry_date: string;
  days_to_expiry: number;
  status: "Urgent" | "Watch" | "Good";
};

export type InventoryBatchResponse = {
  items: InventoryBatch[];
  total: number;
};

export function getInventoryBatches(signal?: AbortSignal) {
  return apiGet<InventoryBatchResponse>("/api/v1/batches?limit=50", signal);
}