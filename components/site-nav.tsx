import { business } from "@/lib/business";
import { getCart } from "@/lib/cart";
import { phoneHref } from "@/lib/facts";
import { countUnreadForCustomer, countUnreadForOwner, orderIdsForAccount } from "@/lib/messages";
import { getCurrentUser } from "@/lib/session";
import { SiteNavClient } from "./site-nav-client";

/**
 * The navbar's data: who is signed in, what is in the basket, and how many
 * messages are waiting. Rendered on the server; the interactive part is
 * site-nav-client.tsx.
 *
 * The navbar knows who is signed in, but it is NOT what keeps anyone out.
 * Protection lives on each page and inside each Server Action.
 *
 * THE PHONE NUMBER IS ALWAYS ONE TAP AWAY. People book caterers by phone as
 * often as online, so it stays in the bar on every screen size.
 */
export async function SiteNav() {
  const [user, cart] = await Promise.all([getCurrentUser(), getCart()]);

  let unread = 0;
  if (user?.role === "owner") {
    unread = await countUnreadForOwner();
  } else if (user) {
    unread = await countUnreadForCustomer(user.id, await orderIdsForAccount(user.id));
  }

  return (
    <SiteNavClient
      user={user ? { name: user.name, email: user.email, role: user.role } : null}
      cartCount={cart.count}
      unread={unread}
      businessName={business.name}
      phone={business.phone}
      phoneHref={phoneHref}
    />
  );
}
