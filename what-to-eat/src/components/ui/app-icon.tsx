import Image, { type ImageProps } from "next/image";

import { cn } from "@/lib/utils";

export const appIconNames = [
  "add",
  "api-key",
  "chevron-down",
  "clock",
  "close",
  "confirm",
  "delete",
  "edit",
  "fridge",
  "generate",
  "history",
  "image-unavailable",
  "language",
  "loading",
  "minus",
  "more",
  "plus",
  "preferences",
  "recommend",
  "retry",
  "save",
  "secure-key",
  "timeline-marker",
  "tip"
] as const;

export type AppIconName = (typeof appIconNames)[number];

type AppIconProps = Omit<ImageProps, "alt" | "height" | "src" | "width"> & {
  name: AppIconName;
  size?: number;
};

export function AppIcon({ className, name, size = 24, ...props }: AppIconProps) {
  return (
    <Image
      {...props}
      alt=""
      aria-hidden="true"
      className={cn("app-generated-icon", className)}
      draggable={false}
      height={size}
      src={`/ui/icons/${name}.webp`}
      unoptimized
      width={size}
    />
  );
}
