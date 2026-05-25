"use client";

import { useAuth } from "@clerk/nextjs";
import Link, { type LinkProps } from "next/link";
import { forwardRef, type AnchorHTMLAttributes } from "react";

import { useAuthModal } from "@/components/auth/auth-modal-provider";
import { useAuthRuntime } from "@/components/auth/auth-runtime-provider";

type ProtectedLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    href: string;
  };

export const ProtectedLink = forwardRef<HTMLAnchorElement, ProtectedLinkProps>(
  ({ href, onClick, prefetch, ...props }, ref) => {
    const { clerkEnabled } = useAuthRuntime();
    const { requestSignIn } = useAuthModal();

    if (!clerkEnabled) {
      return (
        <Link
          href={href}
          onClick={(event) => {
            onClick?.(event);

            if (event.defaultPrevented) {
              return;
            }

            event.preventDefault();
            requestSignIn(href);
          }}
          prefetch={false}
          ref={ref}
          {...props}
        />
      );
    }

    return (
      <ClerkProtectedLink
        href={href}
        onClick={onClick}
        prefetch={prefetch}
        ref={ref}
        {...props}
      />
    );
  }
);

ProtectedLink.displayName = "ProtectedLink";

const ClerkProtectedLink = forwardRef<HTMLAnchorElement, ProtectedLinkProps>(
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

ClerkProtectedLink.displayName = "ClerkProtectedLink";
