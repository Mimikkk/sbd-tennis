import { SqlResponse } from "$sql/types";
import { Reservation } from "@models";
import { translateFootprint } from "./footprint.orm";

export const translateReservation = (raw: SqlResponse): Reservation.Entity => ({
  ...translateFootprint(raw),
  start: new Date(),
  end: new Date(),
});