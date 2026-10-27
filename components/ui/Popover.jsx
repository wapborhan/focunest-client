"use client";
import { autoUpdate, flip, FloatingPortal, offset, shift, size, useDismiss, useFloating, useInteractions } from "@floating-ui/react";
/** Anchored floating panel. Closes on outside click or Escape, flips to stay on screen, renders above dialogs. */
export default function Popover({ open, onOpenChange, trigger, children, placement = "bottom-start", matchWidth = false, className = "" }) {
  const { refs, floatingStyles, context } = useFloating({
    open, onOpenChange, placement, whileElementsMounted: autoUpdate,
    middleware: [offset(6), flip({ padding: 8 }), shift({ padding: 8 }),
      size({ padding: 8, apply({ rects, elements, availableHeight }) {
        Object.assign(elements.floating.style, { maxHeight: `${Math.max(160, Math.min(availableHeight, 380))}px`, ...(matchWidth ? { minWidth: `${rects.reference.width}px` } : {}) });
      } })],
  });
  const { getReferenceProps, getFloatingProps } = useInteractions([useDismiss(context)]);
  return (<>
    {trigger({ ref: refs.setReference, ...getReferenceProps() })}
    {open && (<FloatingPortal><div ref={refs.setFloating} style={floatingStyles} data-popover-open {...getFloatingProps()} className={`z-[70] ${className}`}>
      <div className="animate-pop flex max-h-[inherit] flex-col">{children}</div></div></FloatingPortal>)}
  </>);
}
