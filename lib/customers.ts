import { readData } from "./store";

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
  const data = await readData();
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

  for (const user of data.users) {
    if (user.role !== "customer") continue;
    const profile = get(user.email, user.name);
    profile.hasAccount = true;
    touch(profile, user.createdAt);
  }
  for (const order of data.orders) {
    const profile = get(order.email, order.name, order.phone);
    profile.orders += 1;
    if (order.status !== "cancelled") profile.lifetimeValueMinor += order.subtotalMinor;
    touch(profile, order.updatedAt);
  }
  for (const enquiry of data.enquiries) {
    const profile = get(enquiry.email, enquiry.name, enquiry.phone);
    profile.enquiries += 1;
    touch(profile, enquiry.updatedAt);
  }
  for (const contact of data.contacts) {
    const profile = get(contact.email, contact.name, contact.phone);
    profile.messages += 1;
    touch(profile, contact.updatedAt);
  }

  return [...customers.values()].sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
}
