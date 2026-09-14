export type OrderStatus =
  | "awaiting_payment"
  | "payment_review"
  | "paid"
  | "processing"
  | "ready"
  | "dispatched"
  | "completed"
  | "cancelled";

type StatusMeta = {
  label: string;
  /** What the customer is told. Written from their point of view, not the system's. */
  customerLabel: string;
  customerDetail: string;
  tone: "neutral" | "waiting" | "review" | "good" | "done" | "stopped";
};

export const ORDER_STATUS: Record<OrderStatus, StatusMeta> = {
  awaiting_payment: {
    label: "Awaiting payment",
    customerLabel: "Waiting for your transfer",
    customerDetail:
      "Send the exact total to any account below, using your order number as the narration.",
    tone: "waiting",
  },
  payment_review: {
    label: "Checking payment",
    customerLabel: "We are checking your payment",
    customerDetail:
      "Your transfer details are with our team. We confirm against the bank statement, usually within a few hours during opening times.",
    tone: "review",
  },
  paid: {
    label: "Paid",
    customerLabel: "Payment confirmed",
    customerDetail: "We have your money. Your order goes to packing next.",
    tone: "good",
  },
  processing: {
    label: "Packing",
    customerLabel: "We are packing your order",
    customerDetail: "Your items are being picked from the shelves and wrapped.",
    tone: "good",
  },
  ready: {
    label: "Ready",
    customerLabel: "Ready for you",
    customerDetail: "Your order is packed and waiting at the shop.",
    tone: "good",
  },
  dispatched: {
    label: "Dispatched",
    customerLabel: "On its way",
    customerDetail: "Your order has left the shop with our dispatch rider.",
    tone: "good",
  },
  completed: {
    label: "Completed",
    customerLabel: "Delivered",
    customerDetail: "This order is complete. Thank you.",
    tone: "done",
  },
  cancelled: {
    label: "Cancelled",
    customerLabel: "Cancelled",
    customerDetail: "This order was cancelled and the items returned to stock.",
    tone: "stopped",
  },
};

export const STATUS_TONE_CLASS: Record<StatusMeta["tone"], string> = {
  neutral: "bg-surface text-muted border-rule",
  waiting: "bg-amber-soft text-amber border-amber/25",
  review: "bg-brass-soft text-brass-deep border-brass/30",
  good: "bg-leaf-soft text-leaf border-leaf/25",
  done: "bg-ink text-white border-ink",
  stopped: "bg-flag-soft text-flag border-flag/25",
};

/** The order the pipeline actually runs in, for progress indicators. */
export const PIPELINE: OrderStatus[] = [
  "awaiting_payment",
  "payment_review",
  "paid",
  "processing",
  "ready",
  "dispatched",
  "completed",
];
