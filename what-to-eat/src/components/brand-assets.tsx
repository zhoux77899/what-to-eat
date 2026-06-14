import Image from "next/image";

import { cn } from "@/lib/utils";

type BrandLocale = "zh" | "en";

type BrandLogoImageProps = {
  className?: string;
  label: string;
  locale: BrandLocale;
};

type AppIconImageProps = {
  className?: string;
  label: string;
};

export function BrandLogoImage({ className, label, locale }: BrandLogoImageProps) {
  const src = locale === "en" ? "/brand/header-logo-en.webp" : "/brand/header-logo-zh.webp";

  return (
    <Image
      alt={label}
      className={cn("brand-logo-image", className)}
      height={locale === "en" ? 110 : 112}
      priority
      src={src}
      unoptimized
      width={locale === "en" ? 550 : 456}
    />
  );
}

export function AppIconImage({ className, label }: AppIconImageProps) {
  return (
    <Image
      alt={label}
      className={cn("app-icon-image", className)}
      height={512}
      src="/brand/app-icon-512.png"
      unoptimized
      width={512}
    />
  );
}
