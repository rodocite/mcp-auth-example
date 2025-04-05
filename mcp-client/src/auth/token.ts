/**
 * Token utility functions for handling JWT tokens
 */

/**
 * Decode and parse a JWT token
 */
export function decodeToken(token: string): { header: any, payload: any, hasSignature: boolean } {
  try {
    const [headerBase64, payloadBase64, signatureBase64] = token.split(".");

    // Decode base64 parts (handle padding if needed)
    const decoded = {
      header: decodeBase64Part(headerBase64),
      payload: decodeBase64Part(payloadBase64),
      hasSignature: !!signatureBase64
    };

    return decoded;
  } catch (error) {
    console.error("Failed to decode token:", error);
    return { 
      header: { error: "Invalid token format" }, 
      payload: { error: "Invalid token format" }, 
      hasSignature: false 
    };
  }
}

/**
 * Decode a single base64 part of a JWT token
 */
function decodeBase64Part(b64: string): any {
  // Add padding if needed
  const padding = b64.length % 4 === 0 ? 0 : 4 - (b64.length % 4);
  const padded = b64 + "=".repeat(padding);
  
  // Replace URL-safe chars and decode
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  
  try {
    const decoded = Buffer.from(base64, "base64").toString();
    return JSON.parse(decoded);
  } catch (e) {
    return { error: "Could not parse JSON" };
  }
}

/**
 * Patch the global fetch function to include authorization headers
 */
export function patchFetchWithToken(token: string): () => void {
  const originalFetch = global.fetch;
  
  global.fetch = function (input, init) {
    // Create a new init object to avoid modifying the original
    const newInit = { ...(init || {}) };
    
    // Make sure headers exist
    newInit.headers = newInit.headers || {};
    
    // Add the Authorization header with the token to ALL requests
    if (typeof newInit.headers === "object") {
      (newInit.headers as any).Authorization = `Bearer ${token}`;
    }
    
    // Call the original fetch with our modified headers
    return originalFetch(input, newInit);
  };
  
  // Return a cleanup function to restore original fetch
  return () => {
    global.fetch = originalFetch;
  };
} 