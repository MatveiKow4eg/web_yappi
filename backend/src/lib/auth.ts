import { SignJWT, jwtVerify } from "jose";

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error(
    "JWT_SECRET environment variable is required and must be at least 32 characters long"
  );
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export interface AdminTokenPayload {
  id: string;
  email: string;
  role: "admin" | "kitchen";
}

export async function signAdminToken(payload: AdminTokenPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(JWT_SECRET);
}

export async function verifyAdminToken(
  token: string
): Promise<AdminTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AdminTokenPayload;
  } catch {
    return null;
  }
}
