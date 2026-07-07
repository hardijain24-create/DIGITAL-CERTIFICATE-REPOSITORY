const encoder = new TextEncoder()

// Convert string to base64url format
function base64urlEncode(str: string): string {
  return btoa(str).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
}

// Convert base64url to standard binary string
function base64urlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/")
  while (base64.length % 4) base64 += "="
  return atob(base64)
}

// Convert ArrayBuffer to base64url format
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return base64urlEncode(binary)
}

/**
 * Sign a payload into a JWT using HMAC SHA-256.
 * Zero external dependencies. Safe to run in Edge or Serverless functions.
 */
export async function signJWT(
  payload: Record<string, any>,
  secret: string,
  expiresInSeconds: number = 86400
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" }
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + expiresInSeconds
  const fullPayload = { ...payload, iat, exp }

  const headerStr = base64urlEncode(JSON.stringify(header))
  const payloadStr = base64urlEncode(JSON.stringify(fullPayload))
  const input = `${headerStr}.${payloadStr}`

  const keyData = encoder.encode(secret)
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(input)
  )

  const signatureStr = arrayBufferToBase64Url(signatureBuffer)
  return `${input}.${signatureStr}`
}

/**
 * Verify a JWT token using HMAC SHA-256.
 * Checks signature authenticity and expiration time.
 */
export async function verifyJWT(token: string, secret: string): Promise<Record<string, any> | null> {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null

    const [headerStr, payloadStr, signatureStr] = parts
    const input = `${headerStr}.${payloadStr}`

    const keyData = encoder.encode(secret)
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    )

    // Decode signature
    const signatureDecoded = base64urlDecode(signatureStr)
    const signatureBytes = new Uint8Array(signatureDecoded.length)
    for (let i = 0; i < signatureDecoded.length; i++) {
      signatureBytes[i] = signatureDecoded.charCodeAt(i)
    }

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      encoder.encode(input)
    )

    if (!isValid) return null

    const payload = JSON.parse(base64urlDecode(payloadStr))
    const now = Math.floor(Date.now() / 1000)
    
    // Check if token has expired
    if (payload.exp && payload.exp < now) {
      return null
    }

    return payload
  } catch (error) {
    return null
  }
}
