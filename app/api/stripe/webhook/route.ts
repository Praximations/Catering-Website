import { markOrderPaid } from "@/lib/orders";
import { verifyStripeSignature } from "@/lib/stripe";

interface StripeCheckoutEvent {
  id: string;
  type: string;
  data?: {
    object?: {
      id?: string;
      payment_status?: string;
      metadata?: { order_id?: string };
    };
  };
}

export async function POST(request: Request): Promise<Response> {
  const payload = await request.text();
  if (!verifyStripeSignature(payload, request.headers.get("stripe-signature"))) {
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(payload) as StripeCheckoutEvent;
  if (event.type === "checkout.session.completed") {
    const session = event.data?.object;
    const orderId = session?.metadata?.order_id;
    if (orderId && session?.id && session.payment_status === "paid") {
      await markOrderPaid(orderId, session.id);
    }
  }

  return Response.json({ received: true });
}
