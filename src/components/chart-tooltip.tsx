"use client";

/*
  The shared chart tooltip layer: one client component, no library.
  A ChartTooltipContainer marks the card or section bounds a tooltip
  must stay inside; each ChartTooltip wraps one interactive mark (an
  SVG shape via `svg`, or an HTML element) and portals its tooltip
  into the container, flipped or clamped so it never overflows the
  card or the viewport.

  Interaction contract: hover opens, focus-visible opens (the trigger
  keeps focus while open), touch tap toggles, Escape or a tap
  elsewhere or a scroll dismisses. The tooltip itself is aria-hidden
  and pointer-events-none; screen readers keep getting the values
  through the chart's role="img" aria-label and the sr-only text.
*/

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

/* useLayoutEffect on the client, useEffect during SSR. */
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export interface TooltipRow {
  label: string;
  value: string;
}

export interface TooltipContent {
  title: string;
  rows?: TooltipRow[];
  footnote?: string;
}

interface ContainerContextValue {
  containerRef: RefObject<HTMLElement | null>;
}

const ContainerContext = createContext<ContainerContextValue | null>(null);

/** Marks the bounds tooltips are positioned and clamped within. */
export function ChartTooltipContainer({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  return (
    <ContainerContext.Provider value={{ containerRef }}>
      <div
        ref={containerRef}
        className={["relative", className].filter(Boolean).join(" ")}
      >
        {children}
      </div>
    </ContainerContext.Provider>
  );
}

/* Geometry of the tooltip layer: max width and the padding kept
   between tooltip, card edge and viewport edge. */
const TOOLTIP_MAX_WIDTH = 288;
const TOOLTIP_PADDING = 8;
const TOOLTIP_GAP = 8;

interface Placement {
  left: number;
  top: number;
  width: number;
}

export function ChartTooltip({
  content,
  svg = false,
  className,
  style,
  children,
}: {
  /** Structured payload; all values pre-formatted by the caller. */
  content: TooltipContent;
  /** Wrap an SVG shape instead of an HTML element. */
  svg?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: ReactNode;
}) {
  const ctx = useContext(ContainerContext);
  const triggerRef = useRef<HTMLElement | SVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<Placement | null>(null);

  const computePlacement = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const container = ctx?.containerRef.current ?? document.body;
    const triggerRect = trigger.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const width = Math.min(
      TOOLTIP_MAX_WIDTH,
      containerRect.width - TOOLTIP_PADDING * 2,
    );
    // Viewport edges in container-relative coordinates, so the tooltip
    // is clamped inside both its card and the visible viewport.
    const viewLeft = -containerRect.left;
    const viewTop = -containerRect.top;
    const viewRight = window.innerWidth - containerRect.left;
    const viewBottom = window.innerHeight - containerRect.top;
    const clamp = (v: number, lo: number, hi: number) =>
      Math.max(lo, Math.min(v, hi));
    const centerX = triggerRect.left + triggerRect.width / 2;
    const left = clamp(
      centerX - containerRect.left - width / 2,
      Math.max(TOOLTIP_PADDING, viewLeft + TOOLTIP_PADDING),
      Math.min(
        containerRect.width - width - TOOLTIP_PADDING,
        viewRight - width - TOOLTIP_PADDING,
      ),
    );
    const tooltipHeight = tooltipRef.current?.offsetHeight ?? 0;
    const spaceAbove = triggerRect.top - containerRect.top;
    const spaceBelow = containerRect.bottom - triggerRect.bottom;
    const above =
      spaceAbove >= tooltipHeight + TOOLTIP_GAP || spaceAbove > spaceBelow;
    const top = clamp(
      above
        ? spaceAbove - tooltipHeight - TOOLTIP_GAP
        : triggerRect.bottom - containerRect.top + TOOLTIP_GAP,
      Math.max(TOOLTIP_PADDING, viewTop + TOOLTIP_PADDING),
      Math.min(
        containerRect.height - tooltipHeight - TOOLTIP_PADDING,
        viewBottom - tooltipHeight - TOOLTIP_PADDING,
      ),
    );
    setPlacement({ left, top, width });
  }, [ctx]);

  // Position once on open and on resize while open; the tooltip is
  // absolutely positioned, so hovering causes no layout work.
  useIsomorphicLayoutEffect(() => {
    if (!open) return;
    computePlacement();
    window.addEventListener("resize", computePlacement);
    return () => window.removeEventListener("resize", computePlacement);
  }, [open, computePlacement]);

  // Dismissal while open: Escape, a pointer down outside the trigger,
  // or any scroll. Focus is never moved, so the trigger keeps it.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (
        target &&
        !triggerRef.current?.contains(target) &&
        !tooltipRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("scroll", onScroll, {
      capture: true,
      passive: true,
    });
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("scroll", onScroll, { capture: true });
    };
  }, [open]);

  const openTooltip = () => setOpen(true);
  const closeTooltip = () => setOpen(false);

  const handlers = {
    onMouseEnter: openTooltip,
    onMouseLeave: closeTooltip,
    onFocus: (e: React.FocusEvent) => {
      // Keyboard focus only; programmatic or mouse focus does not pop
      // the tooltip.
      if (e.currentTarget.matches(":focus-visible")) setOpen(true);
    },
    onBlur: closeTooltip,
    onPointerDown: (e: React.PointerEvent) => {
      // Touch tap toggles; preventDefault suppresses the emulated
      // mouse events so the tap does not re-open what it closed.
      if (e.pointerType === "touch") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    },
  };

  const triggerClassName = ["chart-tooltip-trigger", className]
    .filter(Boolean)
    .join(" ");

  const tooltip = open
    ? createPortal(
        <div
          ref={tooltipRef}
          aria-hidden="true"
          className="chart-tooltip pointer-events-none absolute z-50 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-tooltip"
          style={{
            left: placement?.left ?? 0,
            top: placement?.top ?? 0,
            width: placement?.width ?? TOOLTIP_MAX_WIDTH,
            visibility: placement ? "visible" : "hidden",
          }}
        >
          <p className="font-semibold">{content.title}</p>
          {content.rows && content.rows.length > 0 && (
            <dl className="mt-1 flex flex-col gap-0.5">
              {content.rows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between gap-3"
                >
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="text-right font-medium tabular-nums">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {content.footnote && (
            <p className="mt-1.5 border-t border-border pt-1.5 text-muted-foreground">
              {content.footnote}
            </p>
          )}
        </div>,
        ctx?.containerRef.current ?? document.body,
      )
    : null;

  if (svg) {
    return (
      <g
        ref={triggerRef as React.Ref<SVGGElement>}
        tabIndex={0}
        className={triggerClassName}
        style={style}
        {...handlers}
      >
        {children}
        {tooltip}
      </g>
    );
  }
  return (
    <span
      ref={triggerRef as React.Ref<HTMLSpanElement>}
      tabIndex={0}
      className={triggerClassName}
      style={style}
      {...handlers}
    >
      {children}
      {tooltip}
    </span>
  );
}
