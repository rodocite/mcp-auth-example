import jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';

// JWT validation configuration
interface JwtConfig {
  issuer: string;
  audience: string;
  jwksUri: string;
}

// Default JWT configuration
const defaultConfig: JwtConfig = {
  issuer: 'http://localhost:5556/dex',  // Dex issuer
  audience: 'mcp-client',               // Client ID
  jwksUri: 'http://localhost:5556/dex/keys' // Dex JWKS endpoint
};

// Allow configuring via environment variables
if (process.env.JWT_ISSUER) {
  defaultConfig.issuer = process.env.JWT_ISSUER;
}

if (process.env.JWT_AUDIENCE) {
  defaultConfig.audience = process.env.JWT_AUDIENCE;
}

if (process.env.JWT_JWKS_URI) {
  defaultConfig.jwksUri = process.env.JWT_JWKS_URI;
}

// Log the configuration on startup
console.log('JWT validation configured with:', {
  issuer: defaultConfig.issuer,
  audience: defaultConfig.audience,
  jwksUri: defaultConfig.jwksUri
});

// Cache for JWKS client
let jwksClientInstance: jwksRsa.JwksClient | null = null;

/**
 * Get or create the JWKS client
 */
function getJwksClient(jwksUri: string): jwksRsa.JwksClient {
  if (!jwksClientInstance) {
    jwksClientInstance = jwksRsa({
      jwksUri,
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
    });
  }
  
  // At this point, jwksClientInstance is guaranteed to be non-null
  return jwksClientInstance;
}

/**
 * Get the signing key for token verification
 */
function getSigningKey(kid: string, jwksUri: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = getJwksClient(jwksUri);
    client.getSigningKey(kid, (err, key) => {
      if (err) {
        console.error('Error getting signing key:', err);
        return reject(err);
      }
      
      if (!key) {
        return reject(new Error('No signing key found'));
      }
      
      const signingKey = key.getPublicKey();
      resolve(signingKey);
    });
  });
}

/**
 * Verify a JWT token
 */
export async function verifyToken(
  token: string, 
  config: Partial<JwtConfig> = {}
): Promise<jwt.JwtPayload> {
  try {
    // Merge default config with provided config
    const { issuer, audience, jwksUri } = {
      ...defaultConfig,
      ...config
    };

    // Decode the token without verification to get the key ID (kid)
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded !== 'object') {
      throw new Error('Invalid token format');
    }

    // Get the key ID from the token header
    const { kid } = decoded.header;
    if (!kid) {
      throw new Error('No key ID (kid) found in token header');
    }

    // Get the signing key from the JWKS endpoint
    const signingKey = await getSigningKey(kid as string, jwksUri);

    // Verify the token
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        signingKey,
        {
          issuer,
          audience,
          algorithms: ['RS256']
        },
        (err, decoded) => {
          if (err) {
            console.error('Token verification failed:', err);
            return reject(err);
          }
          resolve(decoded as jwt.JwtPayload);
        }
      );
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    throw error;
  }
}

/**
 * Decode a token without verification
 */
export function decodeToken(token: string): jwt.JwtPayload {
  try {
    const decoded = jwt.decode(token);
    if (!decoded) {
      throw new Error('Invalid token format');
    }
    return decoded as jwt.JwtPayload;
  } catch (error) {
    console.error('Error decoding token:', error);
    throw error;
  }
} 