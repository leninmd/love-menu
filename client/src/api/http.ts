export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function baseUrl() {
  const raw = import.meta.env.VITE_API_BASE || 'http://localhost:3000'
  return raw.endsWith('/') ? raw.slice(0, -1) : raw
}

export async function request<T>(
  path: string,
  options: {
    method?: string
    body?: Record<string, unknown> | null
    token?: string
  } = {}
): Promise<T> {
  const url = `${baseUrl()}${path}`
  const headers: Record<string, string> = {}
  if (options.body) {
    headers['Content-Type'] = 'application/json'
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  })

  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    const message =
      typeof payload === 'string'
        ? payload
        : payload?.error || response.statusText
    throw new ApiError(message, response.status)
  }

  return payload as T
}
