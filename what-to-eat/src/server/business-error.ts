import type { BusinessErrorCode } from "@/lib/errors";

export class BusinessError extends Error {
  constructor(public readonly code: BusinessErrorCode) {
    super(code);
    this.name = "BusinessError";
  }
}
