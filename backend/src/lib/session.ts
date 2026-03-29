import { FastifyReply, FastifyRequest } from "fastify";
import { verifyAdminToken, AdminTokenPayload } from "./auth";

type AdminRole = AdminTokenPayload["role"];

type ValidationIssue = {
  code?: string;
  minimum?: number;
  maximum?: number;
  type?: string;
  expected?: string;
  received?: string;
  options?: string[];
  path?: Array<string | number>;
  message?: string;
};

const FIELD_LABELS: Record<string, string> = {
  customer_name: "Имя",
  customer_phone: "Телефон",
  address_line: "Адрес доставки",
  apartment: "Квартира",
  entrance: "Подъезд",
  floor: "Этаж",
  door_code: "Домофон",
  comment: "Комментарий",
  promo_code: "Промокод",
  type: "Тип заказа",
  payment_method: "Способ оплаты",
  items: "Товары",
  quantity: "Количество",
  product_id: "Товар",
  product_variant_id: "Вариант",
  option_item_id: "Опция",
  email: "Email",
  password: "Пароль",
  status: "Статус",
};

function formatValidationIssue(issue: ValidationIssue): string {
  const rawField = issue.path?.length ? String(issue.path[issue.path.length - 1]) : "field";
  const field = FIELD_LABELS[rawField] ?? rawField;

  if (issue.code === "too_small") {
    if (issue.type === "string" && issue.minimum) {
      return `${field}: минимум ${issue.minimum} символов`;
    }
    if (issue.type === "array" && issue.minimum) {
      return `${field}: выберите минимум ${issue.minimum}`;
    }
    if (typeof issue.minimum === "number") {
      return `${field}: значение должно быть не меньше ${issue.minimum}`;
    }
  }

  if (issue.code === "too_big" && typeof issue.maximum === "number") {
    return `${field}: значение должно быть не больше ${issue.maximum}`;
  }

  if (issue.code === "invalid_type") {
    return `${field}: заполнено некорректно`;
  }

  if (issue.code === "invalid_enum_value") {
    return `${field}: выбрано недопустимое значение`;
  }

  if (issue.code === "invalid_string") {
    return `${field}: неверный формат`;
  }

  if (issue.message && !issue.message.startsWith("String must contain at least")) {
    return `${field}: ${issue.message}`;
  }

  return `${field}: заполнено некорректно`;
}

function normalizeErrorMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
    return message;
  }

  try {
    const parsed = JSON.parse(trimmed) as ValidationIssue[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return message;
    }

    return parsed.map(formatValidationIssue).join(". ");
  } catch {
    return message;
  }
}

export async function getAdminSession(
  req: FastifyRequest
): Promise<AdminTokenPayload | null> {
  const token = req.cookies?.admin_token;
  if (!token) return null;
  return verifyAdminToken(token);
}

export function requireAdminSession(
  session: AdminTokenPayload | null,
  reply: FastifyReply
): session is AdminTokenPayload {
  if (!session) {
    reply.code(401).send({ ok: false, error: "Unauthorized" });
    return false;
  }
  return true;
}

export function requireRoles(
  session: AdminTokenPayload,
  reply: FastifyReply,
  allowedRoles: AdminRole[]
): boolean {
  if (!allowedRoles.includes(session.role)) {
    reply.code(403).send({ ok: false, error: "Forbidden" });
    return false;
  }
  return true;
}

export function ok(reply: FastifyReply, data: unknown, status = 200) {
  return reply.code(status).send({ ok: true, data });
}

export function err(reply: FastifyReply, message: string, status = 400) {
  return reply.code(status).send({ ok: false, error: normalizeErrorMessage(message) });
}
