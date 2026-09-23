"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { XIcon } from "./icons";
import { cx, iconButtonClass } from "./ui";

/**
 * A sheet: the one overlay primitive. Native <dialog> underneath, so focus is
 * trapped, Escape closes it, and it sits in the top layer above everything,
 * with no focus-trap library. globals.css animates it in and out.
 *
 * `placement` decides where it lives: a bottom sheet on a phone is where the
 * thumb already is; a side drawer or a centred panel suits a wider screen.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  placement = "bottom",
  className,
  hideTitle,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  placement?: "bottom" | "right" | "center";
  className?: string;
  hideTitle?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Page scroll stays put behind an open sheet.
  useEffect(() => {
    if (!open) return;
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previous;
    };
  }, [open]);

  const position =
    placement === "right"
      ? "mr-0 ml-auto h-dvh max-h-dvh w-full max-w-sm rounded-l-2xl"
      : placement === "center"
        ? "m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl"
        : "mt-auto mb-0 w-full max-w-lg rounded-t-2xl sm:m-auto sm:rounded-2xl";

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // A click on the backdrop lands on the dialog element itself.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cx(
        "sheet max-w-none overflow-hidden border border-line bg-surface p-0 text-ink shadow-lg backdrop:backdrop-blur-[2px]",
        position,
        className
      )}
    >
      <div className="flex max-h-[inherit] flex-col">
        <div className={cx("flex items-center justify-between gap-4 px-5 pt-4", hideTitle ? "pb-0" : "pb-2")}>
          <h2 className={cx("font-display text-lg font-semibold tracking-tight", hideTitle && "sr-only")}>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className={cx(iconButtonClass, "-mr-2 ml-auto")}>
            <XIcon className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-6">{children}</div>
      </div>
    </dialog>
  );
}

/** Open and close state for a sheet, closing itself on navigation clicks inside. */
export function useSheet(initial = false) {
  const [open, setOpen] = useState(initial);
  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => setOpen(false), []);
  return { open, show, hide, setOpen };
}
