"use client";

import Link, { type LinkProps } from "next/link";
import type { ReactNode } from "react";

type StudentNavLinkProps = LinkProps & {
  children: ReactNode;
  className?: string | undefined;
  "aria-current"?: "page" | undefined;
  title?: string | undefined;
};

export function StudentNavLink({
  children,
  className,
  href,
  ...props
}: StudentNavLinkProps) {
  return (
    <Link {...props} className={className} href={href}>
      {children}
    </Link>
  );
}
