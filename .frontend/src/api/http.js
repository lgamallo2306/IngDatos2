export async function http(url, { method = 'GET', body, token, headers = {} } = {}) {
  let res
  try {
    res = await fetch(url, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error(`No se pudo conectar con ${new URL(url).origin} — ¿está levantado el servicio?`)
  }

  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }

  if (!res.ok) {
    const msg =
      (data && data.error) ||
      (data && typeof data.detail === 'string' && data.detail) ||
      (data && data.detail && JSON.stringify(data.detail)) ||
      `Error HTTP ${res.status}`
    throw new Error(msg)
  }
  return data
}
