/**
 * Server functions for the kitchen tablet's courier dispatch screen (/admin/dispatch).
 *
 * Handlers are imported INSIDE each function so no server code (credentials, database) reaches the browser
 * bundle. Each handler checks the administrator session before anything else (dispatch-handlers.server.ts).
 */
import { createServerFn } from "@tanstack/react-start";
import type {
  DispatchBoard,
  DispatchResult,
  DispatchView,
  FindDriversResult,
} from "./dispatch-service.server";

export type {
  DispatchBoard,
  DispatchBoardRow,
  DispatchResult,
  DispatchView,
  FindDriversResult,
} from "./dispatch-service.server";
export const getDispatchBoard = createServerFn({ method: "GET" }).handler(
  async (): Promise<DispatchBoard> =>
    (await import("./dispatch-handlers.server")).adminDispatchBoard(),
);

export const findCourierOptions = createServerFn({ method: "POST" })
  .inputValidator((input: { orderId: string; staffName?: string }) => input)
  .handler(async ({ data }): Promise<DispatchResult<FindDriversResult>> =>
    (await import("./dispatch-handlers.server")).adminFindDrivers(data),
  );

export const bookCourierQuote = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      orderId: string;
      provider: "doordash" | "uber";
      quoteId: string;
      tipCents: number;
      staffName?: string;
    }) => input,
  )
  .handler(async ({ data }): Promise<DispatchResult<DispatchView>> =>
    (await import("./dispatch-handlers.server")).adminBookCourier(data),
  );

export const assignOwnDriverToOrder = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      orderId: string;
      name: string;
      phone: string | null;
      sendText: boolean;
      staffName?: string;
    }) => input,
  )
  .handler(async ({ data }): Promise<DispatchResult<DispatchView>> =>
    (await import("./dispatch-handlers.server")).adminAssignOwnDriver(data),
  );

export const recordSkipCourier = createServerFn({ method: "POST" })
  .inputValidator((input: { orderId: string; reference: string; staffName?: string }) => input)
  .handler(async ({ data }): Promise<DispatchResult<DispatchView>> =>
    (await import("./dispatch-handlers.server")).adminRecordSkip(data),
  );

export const cancelCourierDispatch = createServerFn({ method: "POST" })
  .inputValidator((input: { orderId: string; reason: string; staffName?: string }) => input)
  .handler(async ({ data }): Promise<DispatchResult<DispatchView>> =>
    (await import("./dispatch-handlers.server")).adminCancelDispatch(data),
  );

export const refreshCourierDispatch = createServerFn({ method: "POST" })
  .inputValidator((input: { orderId: string }) => input)
  .handler(async ({ data }): Promise<DispatchResult<DispatchView>> =>
    (await import("./dispatch-handlers.server")).adminRefreshDispatch(data),
  );

export const markCourierProgress = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { orderId: string; status: "picked_up" | "delivered"; staffName?: string }) => input,
  )
  .handler(async ({ data }): Promise<DispatchResult<DispatchView>> =>
    (await import("./dispatch-handlers.server")).adminMarkDispatch(data),
  );
