import { NextResponse } from "next/server";

import {
  type BusinessErrorCode,
  ERROR_MESSAGE_KEYS,
  getHttpStatusForError
} from "@/lib/errors";

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
