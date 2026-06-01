import { NextResponse } from "next/server";

import {
  type BusinessErrorCode,
  ERROR_MESSAGE_KEYS,
  getHttpStatusForError
} from "@/lib/errors";
import { BusinessError } from "@/server/business-error";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function fail(code: BusinessErrorCode, status = getHttpStatusForError(code)) {
  return NextResponse.json(
    {
      error: {
        code,
        messageKey: ERROR_MESSAGE_KEYS[code]
      }
    },
    { status }
  );
}

export function failFromError(error: unknown, fallback: BusinessErrorCode = "CONFIGURATION_ERROR") {
  return fail(error instanceof BusinessError ? error.code : fallback);
}
