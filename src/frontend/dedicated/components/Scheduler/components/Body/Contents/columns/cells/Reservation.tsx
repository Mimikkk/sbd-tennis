import { VFC } from "react";
import { BaseModel, CourtReservation } from "@models";
import { differenceInMinutes } from "date-fns";
import { useSchedulerContext } from "dedicated/components/Scheduler/hooks";
import { style } from "styles";
import { useModal } from "shared/hooks";
import { Typography, TextField } from "@mui/material";
import { format } from "date-fns";
import { Nullable, uuid } from "@internal/types";
import { formatTeacherName } from "dedicated/hooks/useLists/courtReservations/columns";

interface Props {
  reservation: CourtReservation.Entity;
}

interface Propss {
  reservation: CourtReservation.Entity;
}

const translate = <T extends BaseModel>(id: Nullable<uuid>, items: T[]): T =>
  items.find((i) => i.id === id)!;

export const ReservationView: VFC<Propss> = ({ reservation }) => {
  const { courts, employees } = useSchedulerContext();

  const { start, end, courtId, teacherId } = reservation;
  return (
    <div className={style("form")}>
      <TextField
        value={translate(courtId, courts).name}
        label="Court"
        disabled
      />
      <TextField value={format(start, "HH:mm")} label="Start" disabled />
      <TextField value={format(end, "HH:mm")} label="End" disabled />
      <TextField
        value={formatTeacherName(translate(teacherId, employees))}
        label="Teacher"
        disabled
      />
    </div>
  );
};

export const Reservation: VFC<Props> = ({ reservation }) => {
  const { start, end } = reservation;

  const {
    courts: { length },
  } = useSchedulerContext();
  const [CourtReservationModal, open] = useModal(
    <ReservationView reservation={reservation} />,
    "Edit reservation"
  );

  return (
    <>
      <div
        className={style("scheduler-body__reservation")}
        style={{
          height: `${(differenceInMinutes(end, start) / 30) * 17}px`,
          minWidth: `${100 / (length + 1) - 8}%`,
        }}
        onClick={open}
      >
        <Typography>Reservation</Typography>
      </div>
      <CourtReservationModal />
    </>
  );
};