import { uuid } from "@internal/types";
import { Reservation } from "./reservation.model";

export module CourtReservation {
  export interface Model extends Reservation.Model {
    courtId: uuid;
  }
  export interface Entity extends Reservation.Entity, Model {}
}
