import { createHash } from "node:crypto";
import { db } from "./db";

/**
 * The owner's view of everybody who has ever been in touch, keyed by email.
 *
 * One person may have an account, orders placed before they made one, an
 * event enquiry, a contact message and a conversation. Email is the only
 * thing common to all of them, so it is what stitches them together.
 */

export interface CustomerProfile {
  /**
   * A short, stable id for the customer's page in the Owner Portal. A hash of
   * the email rather than the email itself, so an address does not sit in a
   * URL (and so in logs and browser history).
   */
  id: string;
  email: string;
  name: string;
  phone: string;
  userId: string | null;
  hasAccount: boolean;
  orders: number;
  enquiries: number;
  messages: number;
  lifetimeValueMinor: number;
  lastActivity: string;
  firstSeen: string;
}

export function customerId(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 16);
}

export async function listCustomers(): Promise<CustomerProfile[]> {
  // Independent reads in parallel: the page waits for the slowest, not the sum.
  const [users, orders, enquiries, contacts, messages] = await Promise.all([
    db.users.find({ all: { role: "customer" } }),
    db.orders.find(),
    db.enquiries.find(),
    db.contacts.find(),
    db.customerMessages.find(),
  ]);

  const customers = new Map<string, CustomerProfile>();

  const get = (email: string, name: string, phone = ""): CustomerProfile | null => {
    const key = email.trim().toLowerCase();
    // A text message from an unknown number has no email to file it under.
    if (!key) return null;
    const existing = customers.get(key);
    if (existing) {
      if (!existing.phone && phone) existing.phone = phone;
      if (!existing.name && name) existing.name = name;
      return existing;
    }
    const profile: CustomerProfile = {
      id: customerId(key),
      email: key,
      name,
      phone,
      userId: null,
      hasAccount: false,
      orders: 0,
      enquiries: 0,
      messages: 0,
      lifetimeValueMinor: 0,
      lastActivity: "",
      firstSeen: "",
    };
    customers.set(key, profile);
    return profile;
  };

  const touch = (profile: CustomerProfile, at: string) => {
    if (!profile.lastActivity || at > profile.lastActivity) profile.lastActivity = at;
    if (!profile.firstSeen || at < profile.firstSeen) profile.firstSeen = at;
  };

  const userById = new Map(users.map((user) => [user.id, user]));
  const orderById = new Map(orders.map((order) => [order.id, order]));

  for (const user of users) {
    const profile = get(user.email, user.name);
    if (!profile) continue;
    profile.hasAccount = true;
    profile.userId = user.id;
    touch(profile, user.createdAt);
  }
  for (const order of orders) {
    const profile = get(order.email, order.name, order.phone);
    if (!profile) continue;
    profile.orders += 1;
    // Cancelled and refunded are not lifetime value.
    if (order.status !== "cancelled" && order.paymentStatus !== "refunded") {
      profile.lifetimeValueMinor += order.subtotalMinor;
    }
    touch(profile, order.createdAt);
  }
  for (const enquiry of enquiries) {
    const profile = get(enquiry.email, enquiry.name, enquiry.phone);
    if (!profile) continue;
    profile.enquiries += 1;
    touch(profile, enquiry.createdAt);
  }
  for (const contact of contacts) {
    const profile = get(contact.email, contact.name, contact.phone);
    if (!profile) continue;
    profile.messages += 1;
    touch(profile, contact.createdAt);
  }
  for (const message of messages) {
    // An account's message, or a guest's on one of their orders.
    const owner = message.userId
      ? userById.get(message.userId)
      : message.orderId
        ? orderById.get(message.orderId)
        : undefined;
    if (!owner) continue;
    const profile = get(owner.email, owner.name);
    if (!profile) continue;
    profile.messages += 1;
    touch(profile, message.createdAt);
  }

  return [...customers.values()].sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
}

export async function findCustomer(id: string): Promise<CustomerProfile | null> {
  if (!/^[0-9a-f]{16}$/.test(id)) return null;
  return (await listCustomers()).find((customer) => customer.id === id) ?? null;
}
