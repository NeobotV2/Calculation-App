import * as React from "react";
import { cn } from "@/lib/utils";

export type PageWidth = "narrow" | "default" | "wide";

export const PAGE_WIDTH_CLASS: Record<PageWidth, string> = {
  narrow: "max-w-3xl",
  default: "max-w-6xl",
  wide: "max-w-7xl",
};

/** Einzige Quelle für den seitlichen Innenabstand. */
export const PAGE_GUTTER_CLASS = "px-4 md:px-6 lg:px-8";

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: PageWidth;
  as?: "div" | "section" | "header" | "footer" | "main";
}

/** Zentrierter Inhaltscontainer mit Seitenrand (`px-4 md:px-6 lg:px-8`). */
export const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  ({ width = "default", as = "div", className, ...props }, ref) =>
    React.createElement(as, {
      ref,
      className: cn("mx-auto w-full", PAGE_WIDTH_CLASS[width], PAGE_GUTTER_CLASS, className),
      ...props,
    }),
);
PageContainer.displayName = "PageContainer";
