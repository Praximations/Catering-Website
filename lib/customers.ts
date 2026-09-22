import { db } from "./db";

/**
 * The owner's view of everybody who has ever been in touch, keyed by email.
 *
 * One person may have an account, several orders placed before they made
 * one, an enquiry, and a contact message. Email is the only thing common to
 * all four, so it is what stitches them together.
 */

export interface CustomerProfile {
  email: string;
  name: string;
  phone: string;
  hasAccount: boolean;
  orders: number;
  enquiries: number;
  messages: number;
  lifetimeValueMinor: number;
  lastActivity: string;
}

export async function listCustomers(): Promise<CustomerProfile[]> {
  // Five reads in parallel rather than in sequence. They are independent,
  // and the dashboard waits for the slowest rather than for the sum.
  const [users, orders, enquiries, contacts, messages] = await Promise.all([
    db.users.find({ all: { role: "customer" } }),
    db.orders.find(),
    db.enquiries.find(),
    db.contacts.find(),
    db.customerMessages.find(),
  ]);

  const customers = new Map<string, CustomerProfile>();

  const get = (email: string, name: string, phone = ""): CustomerProfile => {
    const key = email.trim().toLowerCase();
    const existing = customers.get(key);
    if (existing) {
      if (!existing.phone && phone) existing.phone = phone;
      if (!existing.name && name) existing.name = name;
      return existing;
    }
    const profile: CustomerProfile = {
      email: key,
      name,
      phone,
      hasAccount: false,
      orders: 0,
      enquiries: 0,
      messages: 0,
      lifetimeValueMinor: 0,
      lastActivity: "",
    };
    customers.set(key, profile);
    return profile;
  };

  const touch = (profile: CustomerProfile, at: string) => {
    if (!profile.lastActivity || at > profile.lastActivity) profile.lastActivity = at;
  };

  const emailByUserId = new Map(users.map((user) => [user.id, user]));

  for (const user of users) {
    const profile = get(user.email, user.name);
    profile.hasAccount = true;
    touch(profile, user.createdAt);
  }
  for (const order of orders) {
    const profile = get(order.email, order.name, order.phone);
    profile.orders += 1;
    // Cancelled and refunded are not lifetime value.
    if (order.status !== "cancelled" && order.paymentStatus !== "refunded") {
      profile.lifetimeValueMinor += order.subtotalMinor;
    }
    touch(profile, order.updatedAt);
  }
  for (const enquiry of enquiries) {
    const profile = get(enquiry.email, enquiry.name, enquiry.phone);
    profile.enquiries += 1;
    touch(profile, enquiry.updatedAt);
  }
  for (const contact of contacts) {
    const profile = get(contact.email, contact.name, contact.phone);
    profile.messages += 1;
    touch(profile, contact.updatedAt);
  }
  for (const message of messages) {
    const user = emailByUserId.get(message.userId);
    if (!user) continue;
    const profile = get(user.email, user.name);
    profile.messages += 1;
    touch(profile, message.createdAt);
  }

  return [...customers.values()].sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
}
