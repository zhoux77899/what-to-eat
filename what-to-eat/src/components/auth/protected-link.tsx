"use client";

import { useAuth } from "@clerk/nextjs";
import Link, { type LinkProps } from "next/link";
import { forwardRef, type AnchorHTMLAttributes } from "react";

import { useAuthModal } from "@/components/auth/auth-modal-provider";

type ProtectedLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    href: string;
  };

export const ProtectedLink = forwardRef<HTMLAnchorElement, ProtectedLinkProps>(
  ({ href, onClick, prefetch, ...props }, ref) => {
    const { isLoaded, isSignedIn } = useAuth();
    const { requestSignIn } = useAuthModal();

    return (
      <Link
        href={href}
        onClick={(event) => {
          onClick?.(event);

          if (event.defaultPrevented) {
            return;
          }

          if (!isLoaded || !isSignedIn) {
            event.preventDefault();
            requestSignIn(href);
          }
        }}
        prefetch={isSignedIn ? prefetch : false}
        ref={ref}
        {...props}
      />
    );
  }
);

ProtectedLink.displayName = "ProtectedLink";
