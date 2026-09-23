"use client";

import { useEffect } from "react";
import { clearCheckoutDraft } from "./checkout-form";

/** The order exists, so the checkout draft has done its job. */
export function ClearCheckoutDraft() {
  useEffect(() => clearCheckoutDraft(), []);
  return null;
}
