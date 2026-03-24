export interface AdminTokenPayload {
    id: string;
    email: string;
    role: "admin" | "kitchen";
}
export declare function signAdminToken(payload: AdminTokenPayload): Promise<string>;
export declare function verifyAdminToken(token: string): Promise<AdminTokenPayload | null>;
