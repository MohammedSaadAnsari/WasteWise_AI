import { apiGet } from "./api";

export type DemandPoint = {
  date: string;
  units: number;
};

export type DemandForecast = {
  store_id: string;
  model: string;
  model_validation: {
    mae?: number;
    rmse?: number;
    r2?: number;
  };
  history_days: number;
  as_of: string;
  stale_days: number;
  history: DemandPoint[];
  forecast: DemandPoint[];
  note: string;
};

export function getDemandForecast(days = 7, signal?: AbortSignal) {
  return apiGet<DemandForecast>(`/api/v1/forecasts/demand?days=${days}`, signal);
}