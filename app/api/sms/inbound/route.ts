import { NextResponse, type NextRequest } from "next/server";
import { siteUrl } from "@/lib/site";
import { activeSmsProvider, receiveText } from "@/lib/sms";

/**
 * Inbound text messages. A server-to-server POST from the SMS provider, so it
 * is excluded from proxy.ts: there is no browser here and nothing should sit
 * between the request and its signature check.
 *
 * The signature is computed over the PUBLIC URL the provider called, which is
 * the configured site URL, not request.url: behind a proxy the latter is an
 * internal address and every signature would fail.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const provider = activeSmsProvider();
  if (!provider) return new NextResponse("Not configured", { status: 404 });

  const params = new URLSearchParams(await request.text());
  const url = `${siteUrl()}/api/sms/inbound`;
  const signature = request.headers.get(provider.signatureHeader);

  if (!provider.verifyInbound(url, params, signature)) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const text = provider.parseInbound(params);
  if (!text) return new NextResponse("Bad request", { status: 400 });

  try {
    await receiveText(text);
  } catch (error) {
    // A 500 makes the provider retry, which is what should happen when the
    // database blinked. The unique message id makes the retry land once.
    console.error("[sms] inbound failed:", error);
    return new NextResponse("Try again", { status: 500 });
  }

  // An empty reply: the conversation continues in the Owner Portal, not by
  // an automatic text back.
  return new NextResponse("<Response></Response>", {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
