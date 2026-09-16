"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { navTransitionType } from "@/lib/nav";

type NavLinkProps = ComponentProps<typeof Link> & { href: string };

export function NavLink({ href, transitionTypes, ...props }: NavLinkProps) {
  const pathname = usePathname();
  const inferred = navTransitionType(pathname, href);
  const types = transitionTypes ?? (inferred ? [inferred] : undefined);

  return <Link href={href} transitionTypes={types} {...props} />;
}
