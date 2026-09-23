/**
 * What an SMS provider owes this site. Adding one is a new file implementing
 * this, plus a line in PROVIDERS in index.ts; nothing in app/ names a provider.
 *
 * The rules a provider must keep:
 *
 *   verifyInbound decides whether a webhook really came from the provider. It
 *   must be CONSTANT TIME and must return false, never throw, for anything
 *   malformed: a signature check that throws is a 500 an attacker can trigger
 *   at will, and one that is not constant time leaks the secret a byte at a
 *   time.
 *
 *   parseInbound returns the provider's own id for the message. The inbound
 *   pipeline stores it in a unique column, so a redelivery lands once.
 *
 *   send never throws. A text that could not be sent is an answer the owner
 *   is shown ("saved, but the text did not go"), not a crash.
 */

export interface InboundText {
  /** The provider's id for this message. Unique; the dedupe key. */
  id: string;
  /** Who sent it, as the provider reports it (E.164). */
  from: string;
  body: string;
}

export type SendResult = { ok: true; id: string } | { ok: false; error: string };

export interface SmsProvider {
  id: string;
  /** The provider's name, for the Owner Portal. */
  label: string;
  configured: boolean;
  /** The request header the provider signs inbound webhooks in. */
  signatureHeader: string;
  send(to: string, body: string): Promise<SendResult>;
  /**
   * `url` is the exact public URL the provider posted to, and `params` the
   * decoded form body. `signature` is the provider's signature header.
   */
  verifyInbound(url: string, params: URLSearchParams, signature: string | null): boolean;
  parseInbound(params: URLSearchParams): InboundText | null;
}
