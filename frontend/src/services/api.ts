export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const apiBaseUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      headers: { Accept: "application/json" },
      signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    if (error instanceof TypeError) {
      throw new ApiError("Can’t reach the WasteWise API. Check that the backend is running.", 0);
    }
    throw error;
  }

  if (!response.ok) {
    let detail = `The API request failed (${response.status}).`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
    }
    throw new ApiError(detail, response.status);
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ApiError("The WasteWise API returned invalid JSON.", response.status);
    }
    throw error;
  }
}

export async function checkApiHealth(signal?: AbortSignal): Promise<void> {
  await apiGet<{ status: string; database: string }>("/health", signal);
}