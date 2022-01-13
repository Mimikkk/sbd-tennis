import { Grid } from "@mui/material";
import { FormProps } from "dedicated/forms/types";
import { Item, ItemReservation } from "@models";
import { itemReservationService, itemService } from "@services";
import { ItemReservationSchema } from "./ItemReservation.validation";
import { isEntity } from "shared/utils";
import {
  DateSelect,
  Form,
  SelectField,
  TextField,
  HourSelectField,
} from "shared/components";
import { useListContext } from "shared/contexts";
import { useDate } from "shared/hooks";
import { useEffect, useMemo, useState } from "react";

const createItemReservationValues = <T extends ItemReservation.Model>(): T =>
  ({
    count: 0,
    end: new Date(),
    itemId: "",
    start: new Date(),
  } as T);

export const ItemReservationForm = <T extends ItemReservation.Model>({
  initialValues,
}: FormProps<T>) => {
  const { refresh } = useListContext();

  const handleSuccess = async (values: T) => (
    await (isEntity(values)
      ? itemReservationService.update(values.id, values)
      : itemReservationService.create(values)),
    refresh()
  );

  const handleRemove = async (values: T) => (
    await (isEntity(values) && itemReservationService.delete(values.id)),
    refresh()
  );

  const { date, setDate } = useDate();

  const [items, setItems] = useState<Item.Entity[]>([]);
  useEffect(() => {
    itemService
      .readAll()
      .then(({ items }) => setItems(items.filter(({ name, id }) => name)));
  }, []);

  return (
    <Form
      validationSchema={ItemReservationSchema}
      initialValues={initialValues || createItemReservationValues<T>()}
      onSubmit={handleSuccess}
      onRemove={handleRemove}
    >
      <Grid container spacing={2.5}>
        <Grid item xs={12}>
          <SelectField
            name={"itemId"}
            label={"ItemID"}
            options={items.map((item) => new Option(item.name, item.id))}
          />
        </Grid>
        <Grid item xs={12}>
          <DateSelect
            date={date}
            onChange={setDate}
            min={useMemo(() => new Date(), [])}
          />
        </Grid>
        <Grid item xs={12}>
          <HourSelectField
            name="start"
            label="Start time"
            date={date}
            minHour={7}
            maxHour={22}
            minutesStep={30}
          />
        </Grid>
        <Grid item xs={12}>
          <HourSelectField
            name="end"
            label="End time"
            date={date}
            minHour={7}
            maxHour={22}
            minutesStep={30}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField name="count" label="Count" />
        </Grid>
      </Grid>
    </Form>
  );
};
