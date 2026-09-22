"use server";

import { redirect } from "next/navigation";
import { findOrderByToken, setOrderCheckoutSession } from "@/lib/orders";
import { createStripeCheckout, isStripeConfigured } from "@/lib/stripe";

function configuredSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3100";
}

export async function startPaymentAction(formData: FormData): Promise<void> {
  if (!isStripeConfigured) return;
  const token = formData.get("token");
  if (typeof token !== "string" || token.length < 20) return;

  const order = await findOrderByToken(token);
  if (!order || order.status === "cancelled" || order.paymentStatus === "paid") return;

  const session = await createStripeCheckout(order, configuredSiteUrl());
  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  await setOrderCheckoutSession(order.id, session.id);
  redirect(session.url);
}
