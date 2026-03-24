import { SignJWT, jwtVerify } from "jose";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET environment variable is required and must be at least 32 characters long"
    );
  }
  return new TextEncoder().encode(secret);
}

export interface AdminTokenPayload {
  id: string;
  email: string;
  role: "admin" | "kitchen";
}

export async function signAdminToken(payload: AdminTokenPayload) {
  const jwtSecret = getJwtSecret();
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(jwtSecret);
}

export async function verifyAdminToken(
  token: string
): Promise<AdminTokenPayload | null> {
  try {
    const jwtSecret = getJwtSecret();
    const { payload } = await jwtVerify(token, jwtSecret);
    return payload as unknown as AdminTokenPayload;
  } catch {
    return null;
  }
}
