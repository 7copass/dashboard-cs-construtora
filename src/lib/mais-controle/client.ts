const MAX_RETRIES = 3
const RETRY_DELAYS = [1000, 3000, 9000] // exponential backoff
const TIMEOUT_MS = 30000

export async function fetchFromAPI(endpoint: string): Promise<string> {
  const baseUrl = process.env.MAIS_CONTROLE_BASE_URL!
  const authToken = process.env.MAIS_CONTROLE_AUTH_TOKEN!
  const url = `${baseUrl}/${endpoint}`

  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: authToken,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.text()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.error(
        `[mais-controle] Attempt ${attempt + 1}/${MAX_RETRIES} failed for ${endpoint}:`,
        lastError.message
      )

      if (attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]))
      }
    }
  }

  throw new Error(
    `[mais-controle] All ${MAX_RETRIES} attempts failed for ${endpoint}: ${lastError?.message}`
  )
}
