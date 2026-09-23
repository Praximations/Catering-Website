import { business } from "../business";
import { db } from "../db";
import { createMessageOnce } from "../messages";
import { samePhone, toE164 } from "../phone";
import { twilioProvider } from "./twilio";
import type { SendResult, SmsProvider } from "./types";

/**
 * Text messages, both ways, inside the same conversations as the site's own
 * messages.
 *
 *   OUT: the owner replies in the Owner Portal and ticks "also send as a text".
 *        The reply is stored like any other; the text is a copy of it.
 *   IN:  the customer texts back. The provider posts to /api/sms/inbound, the
 *        signature is checked, and the text lands in that customer's thread,
 *        matched by phone number to their most recent order.
 *
 * OPTIONAL, like payments and Praxi: unset the keys and conversations stay on
 * the site, and the Owner Portal says which state it is in.
 */

export const PROVIDERS: readonly SmsProvider[] = [twilioProvider];

export function activeSmsProvider(): SmsProvider | null {
  return PROVIDERS.find((provider) => provider.configured) ?? null;
}

/** Send a copy of an owner's reply as a text. Never throws. */
export async function sendText(phone: string, body: string): Promise<SendResult> {
  const provider = activeSmsProvider();
  if (!provider) return { ok: false, error: "Text messaging is not configured." };
  const to = toE164(phone);
  if (!to) return { ok: false, error: "That phone number is not one a text can be sent to." };
  return provider.send(to, `${business.name}: ${body}`);
}

export type InboundOutcome = "stored" | "duplicate" | "unmatched";

/**
 * File an inbound text. Matched to the most recent order placed from that
 * number, so it joins the conversation the customer is already in. A number
 * that matches no order becomes a contact message, so it is still seen.
 */
export async function receiveText(text: { id: string; from: string; body: string }): Promise<InboundOutcome> {
  // Recent orders first; a business this size does not need an index on a
  // normalized phone column to find one customer among its last few hundred.
  const orders = await db.orders.find(undefined, { orderBy: "createdAt", direction: "desc", limit: 500 });
  const order = orders.find((candidate) => samePhone(candidate.phone, text.from));

  if (order) {
    const stored = await createMessageOnce({
      userId: order.userId,
      orderId: order.id,
      sender: "customer",
      body: text.body || "(empty text)",
      channel: "sms",
      externalId: text.id,
    });
    return stored ? "stored" : "duplicate";
  }

  await db.contacts.insert({
    id: crypto.randomUUID(),
    userId: null,
    name: "Text message",
    email: "",
    phone: text.from,
    subject: `Text from ${text.from}`,
    message: text.body || "(empty text)",
    status: "new",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return "unmatched";
}

export type { SmsProvider, SendResult } from "./types";
