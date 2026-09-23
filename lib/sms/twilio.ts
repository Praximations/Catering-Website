import { createHmac, timingSafeEqual } from "node:crypto";
import type { InboundText, SendResult, SmsProvider } from "./types";

/**
 * Twilio, over its REST API with fetch. No SDK: three environment variables and
 * two requests is all this needs.
 *
 *   TWILIO_ACCOUNT_SID   AC...
 *   TWILIO_AUTH_TOKEN    signs inbound webhooks and authenticates outbound
 *   TWILIO_FROM_NUMBER   the number texts come from, in E.164
 *
 * Point the number's "A message comes in" webhook at
 * <site>/api/sms/inbound (HTTP POST).
 */

const API = "https://api.twilio.com/2010-04-01";
const TIMEOUT_MS = 8000;

function config() {
  return {
    sid: process.env.TWILIO_ACCOUNT_SID ?? "",
    token: process.env.TWILIO_AUTH_TOKEN ?? "",
    from: process.env.TWILIO_FROM_NUMBER ?? "",
  };
}

/**
 * Twilio's webhook signature: HMAC-SHA1, keyed with the auth token, over the
 * full URL followed by every POST parameter as name then value, sorted by
 * name, base64 encoded. Exported so the tests can check it against Twilio's
 * published example.
 */
export function twilioSignature(authToken: string, url: string, params: URLSearchParams): string {
  const names = [...new Set(params.keys())].sort();
  let payload = url;
  for (const name of names) {
    for (const value of params.getAll(name)) payload += name + value;
  }
  return createHmac("sha1", authToken).update(payload, "utf8").digest("base64");
}

/** Constant time, and false rather than a throw for anything malformed. */
export function verifyTwilioSignature(
  authToken: string,
  url: string,
  params: URLSearchParams,
  signature: string | null
): boolean {
  if (!authToken || !signature) return false;
  const expected = Buffer.from(twilioSignature(authToken, url, params), "utf8");
  const given = Buffer.from(signature, "utf8");
  // timingSafeEqual throws on a length mismatch, which would turn a junk
  // header into a 500. A different length is simply not a match.
  if (expected.length !== given.length) return false;
  return timingSafeEqual(expected, given);
}

export const twilioProvider: SmsProvider = {
  id: "twilio",
  label: "Twilio",
  signatureHeader: "x-twilio-signature",
  get configured() {
    const { sid, token, from } = config();
    return Boolean(sid && token && from);
  },

  async send(to, body): Promise<SendResult> {
    const { sid, token, from } = config();
    if (!sid || !token || !from) return { ok: false, error: "Text messaging is not configured." };
    try {
      const response = await fetch(`${API}/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: from, Body: body.slice(0, 1500) }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
      const data = (await response.json().catch(() => ({}))) as { sid?: string; message?: string };
      if (!response.ok || !data.sid) return { ok: false, error: data.message ?? `The provider said ${response.status}.` };
      return { ok: true, id: data.sid };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "The provider could not be reached." };
    }
  },

  verifyInbound(url, params, signature) {
    return verifyTwilioSignature(config().token, url, params, signature);
  },

  parseInbound(params): InboundText | null {
    const id = params.get("MessageSid") ?? params.get("SmsSid");
    const from = params.get("From");
    const body = params.get("Body");
    if (!id || !from || body === null) return null;
    return { id: id.slice(0, 64), from: from.slice(0, 32), body: body.slice(0, 2000) };
  },
};
