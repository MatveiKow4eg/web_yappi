import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const order = await prisma.order.findUnique({
    where: { public_status_token: params.token },
    include: {
      items: {
        include: { selections: true },
      },
    },
  });

  if (!order) return apiError("Order not found", 404);

  return apiSuccess({
    order_number: order.order_number,
    status: order.status,
    type: order.type,
    payment_method: order.payment_method,
    payment_status: order.payment_status,
    customer_name: order.customer_name,
    address_line: order.address_line,
    subtotal_amount: order.subtotal_amount,
    delivery_fee: order.delivery_fee,
    discount_amount: order.discount_amount,
    total_amount: order.total_amount,
    items: order.items,
    created_at: order.created_at,
  });
}
