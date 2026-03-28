import { FastifyReply, FastifyRequest } from "fastify";
import { AdminTokenPayload } from "./auth";
type AdminRole = AdminTokenPayload["role"];
export declare function getAdminSession(req: FastifyRequest): Promise<AdminTokenPayload | null>;
export declare function requireAdminSession(session: AdminTokenPayload | null, reply: FastifyReply): session is AdminTokenPayload;
export declare function requireRoles(session: AdminTokenPayload, reply: FastifyReply, allowedRoles: AdminRole[]): boolean;
export declare function ok(reply: FastifyReply, data: unknown, status?: number): FastifyReply<import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, import("fastify").RouteGenericInterface, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
export declare function err(reply: FastifyReply, message: string, status?: number): FastifyReply<import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, import("fastify").RouteGenericInterface, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
export {};
