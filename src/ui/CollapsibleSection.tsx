import { useId, useState, type ReactNode } from "react";

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * A `<section>` whose `panel__eyebrow` heading doubles as a disclosure
 * toggle: clicking it (or the leading arrow) expands/collapses the body.
 * The arrow rotates 90° when open, and the body slides open/closed via a
 * `grid-template-rows` transition (see `.panel__collapsible` in styles.css).
 * Content stays in the DOM so inputs/refs inside it aren't remounted when
 * collapsed; `inert` keeps it out of the tab order and hidden from
 * assistive tech while collapsed, without cutting the slide animation
 * short the way the `hidden` attribute would.
 */
export function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <section>
      <h4 className="panel__eyebrow">
        <button
          type="button"
          className="panel__eyebrow-toggle"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setOpen((prev) => !prev)}
        >
          <i
            className={`ri-arrow-right-s-line panel__eyebrow-arrow${
              open ? " panel__eyebrow-arrow--open" : ""
            }`}
            aria-hidden
          />
          <span>{title}</span>
        </button>
      </h4>
      <div
        className={`panel__collapsible${open ? " panel__collapsible--open" : ""}`}
      >
        <div id={contentId} className="panel__collapsible-inner" inert={!open}>
          {children}
        </div>
      </div>
    </section>
  );
}
