const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:4000/api';

export class ApiRequestError extends Error {
  status: number;
  details?: unknown;

  constructor(
    status: number,
    message: string,
    details?: unknown
  ) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function getToken(): string | null {
  return localStorage.getItem('rams_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {

  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined)
  };

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  const res = await fetch(
    `${API_BASE}${path}`,
    {
      ...options,
      headers
    }
  );

  let body: any = null;

  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    throw new ApiRequestError(
      res.status,
      body?.message ||
        `Request failed with status ${res.status}`,
      body?.details
    );
  }

  return body as T;
}

export const api = {

  get: <T>(path: string) =>
    request<T>(
      path,
      {
        method: 'GET'
      }
    ),

  post: <T>(
    path: string,
    data?: unknown
  ) =>
    request<T>(
      path,
      {
        method: 'POST',
        body: data
          ? JSON.stringify(data)
          : undefined
      }
    ),

  put: <T>(
    path: string,
    data?: unknown
  ) =>
    request<T>(
      path,
      {
        method: 'PUT',
        body: data
          ? JSON.stringify(data)
          : undefined
      }
    ),

  delete: <T>(path: string) =>
    request<T>(
      path,
      {
        method: 'DELETE'
      }
    )

};

export function setToken(
  token: string
) {
  localStorage.setItem(
    'rams_token',
    token
  );
}

export function clearToken() {
  localStorage.removeItem(
    'rams_token'
  );
}

export { getToken };