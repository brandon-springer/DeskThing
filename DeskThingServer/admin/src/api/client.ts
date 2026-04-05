const BASE = '/api/admin'

export async function adminFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error || 'Request failed')
  return json.data
}
