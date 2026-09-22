import {
  newId,
  readData,
  updateData,
  type CustomerMessageRecord,
} from "./store";

export async function listMessagesForUser(userId: string): Promise<CustomerMessageRecord[]> {
  return (await readData()).customerMessages
    .filter((message) => message.userId === userId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export type AdminCustomerMessage = CustomerMessageRecord & {
  customerName: string;
  customerEmail: string;
  orderReference: string | null;
};

export async function listAllCustomerMessages(): Promise<AdminCustomerMessage[]> {
  const data = await readData();
  return [...data.customerMessages]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((message) => {
      const customer = data.users.find((user) => user.id === message.userId);
      const order = message.orderId
        ? data.orders.find((candidate) => candidate.id === message.orderId)
        : null;
      return {
        ...message,
        customerName: customer?.name ?? "Customer",
        customerEmail: customer?.email ?? "",
        orderReference: order?.reference ?? null,
      };
    });
}

export async function createCustomerMessage(input: {
  userId: string;
  orderId: string | null;
  sender: "customer" | "owner";
  kind: "message" | "change_request";
  body: string;
}): Promise<CustomerMessageRecord> {
  const message: CustomerMessageRecord = {
    id: newId(),
    userId: input.userId,
    orderId: input.orderId,
    sender: input.sender,
    kind: input.kind,
    body: input.body.trim().slice(0, 2000),
    createdAt: new Date().toISOString(),
  };
  await updateData((data) => data.customerMessages.push(message));
  return message;
}
