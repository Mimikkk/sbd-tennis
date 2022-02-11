import { useEffect, VFC } from "react";
import { useListFetch } from "shared/hooks";
import {
  clientService,
  courtReservationService,
  discountService,
  employeeService,
  itemReservationService,
  itemService,
  priceService,
  transactionService,
} from "@services";
import {
  discountsToOptions,
  formatTime,
  itemsToOptions,
  peopleToOptions,
} from "shared/utils";
import { style } from "styles";
import { Button, SelectField, TextField } from "shared/components";
import { isSuccess } from "shared/utils/requests";
import { Actions } from "shared/components/Form/Actions";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { CourtReservation, ItemReservation } from "@models";
import { filter } from "lodash";
import { Formik } from "formik";
import { pricesToOptions } from "shared/utils/options/prices";
import { formatPrice } from "shared/utils/formats/formatPrice";
import { pendingSchema } from "./Reservation.validation";
import { useSchedulerContext } from "dedicated/components/Scheduler/hooks";
import { concatenateStatuses } from "@internal/enums";

interface Props {
  reservation: CourtReservation.Entity;
  disabled?: boolean;
}

export const ReservationPendingForm: VFC<Props> = ({
  reservation,
  disabled,
}) => {
  const { start, end, courtId, teacherId } = reservation;
  const { refresh } = useSchedulerContext();

  const {
    list: { status: transactionsStatus, items: transactions },
  } = useListFetch(transactionService.readAll);

  const {
    list: { status: itemsStatus, items: items },
  } = useListFetch(itemService.readAll);

  const {
    list: { status: itemReservationsStatus, items: itemReservations },
  } = useListFetch(() =>
    itemReservationService.readAll().then(({ items, ...meta }) => ({
      items: items.filter(
        ({ courtReservationId }) => courtReservationId === reservation.id
      ),
      ...meta,
    }))
  );

  const {
    list: { status: pricesStatus, items: prices },
  } = useListFetch(priceService.readAll);

  const {
    list: { status: employeesStatus, items: employees },
  } = useListFetch(employeeService.readAll);

  const {
    list: { status: clientsStatus, items: clients },
  } = useListFetch(clientService.readAll);

  const {
    list: { status: discountsStatus, items: discounts },
  } = useListFetch(discountService.readAll);

  const {
    discountId = null,
    clientId = null,
    priceId = null,
  } = transactions.find(
    ({ reservationId }) => reservationId === reservation.id
  ) || {};

  const itemsPrices = filter(prices, ["isItem", true]);
  const servicesPrices = filter(prices, ["isItem", false]);
  const teachers = filter(employees, "isTeacher");

  const loading = !isSuccess(
    concatenateStatuses(
      itemsStatus,
      pricesStatus,
      employeesStatus,
      clientsStatus,
      discountsStatus,
      transactionsStatus,
      itemReservationsStatus
    )
  );

  const handleSuccess = async (values: any) => {
    const [, ...itemResponses] = await Promise.all([
      courtReservationService.update(reservation.id, {
        courtId,
        teacherId: values.teacherId,
        start,
        end,
      }),
      ...values.itemReservations
        .filter(
          ({ itemId, priceId, count }: ItemReservation.Model) =>
            itemId && priceId && count
        )
        .map(({ itemId, priceId, count }: ItemReservation.Model) =>
          itemReservationService.create({
            itemId,
            start,
            end,
            priceId,
            count,
            courtReservationId: reservation.id,
          })
        ),
    ]);
    await Promise.all([
      transactionService.create({
        clientId: values.clientId,
        reservationId: reservation.id,
        priceId: values.priceId,
        discountId: values.discountId,
      }),
      ...itemResponses.map(({ resourceId, model: { priceId } }: any) =>
        transactionService.create({
          reservationId: resourceId,
          discountId: values.discountId,
          clientId: values.clientId,
          priceId: priceId,
        })
      ),
    ]);
    refresh();
  };
  const handleRemove = async () => {
    const itemReservationIds = itemReservations
      .filter(({ courtReservationId }) => reservation.id === courtReservationId)
      .flatMap(({ id }) => id);

    await Promise.all(itemReservationIds.map(itemReservationService.delete));
    await courtReservationService.delete(reservation.id);

    const itemTransactionsIds = itemReservations
      .filter(({ courtReservationId }) => reservation.id === courtReservationId)
      .flatMap(({ id }) => id);
    await Promise.all(itemTransactionsIds.map(transactionService.delete));

    const courtTransactionId = transactions.find(
      ({ reservationId }) => reservationId === reservation.id
    )?.id;

    if (!courtTransactionId) return;
    await transactionService.delete(courtTransactionId);
    refresh();
  };

  const initialValues = {
    courtId,
    teacherId,
    priceId,
    clientId,
    discountId,
    itemReservations,
    reservation: {
      start: formatTime(start),
      end: formatTime(end),
    },
    items,
  };

  return (
    <Formik
      validationSchema={pendingSchema}
      initialValues={initialValues}
      onSubmit={handleSuccess}
      enableReinitialize
      validateOnMount
    >
      {({ handleSubmit, submitForm, isValid, values, setFieldValue }) => {
        const addItem = () =>
          setFieldValue("itemReservations", [
            ...values.itemReservations,
            { itemId: null, count: null, cost: null, priceId: null },
          ]);

        const removeItem = (index: number) => () =>
          setFieldValue(
            "itemReservations",
            values.itemReservations.filter((_, i) => i !== index)
          );

        useEffect(() => {
          const service = prices.find(({ id }) => id === values.priceId);
          if (!service) {
            setFieldValue("cost", null);
            return;
          }

          const { cost: serviceValue } = service;

          const itemsValue = values.itemReservations
            .filter(({ itemId, priceId, count }) => itemId && priceId && count)
            .map(
              ({ priceId, count }) =>
                itemsPrices.find(({ id }) => id === priceId)!.cost * count
            )
            .reduce((acc, cur) => acc + cur, 0);

          let total = serviceValue + itemsValue;

          const discount = discounts.find(({ id }) => id === values.discountId);
          if (discount) {
            const discountValue = discount
              ? discount.isPercentage
                ? discount.value / 100
                : discount.value
              : 0;

            total -= discount.isPercentage
              ? total * discountValue
              : discountValue;
          }
          setFieldValue("cost", formatPrice(Math.max(0, total)));
        }, [values, initialValues]);
        useEffect(() => {
          values.itemReservations.map((itemReservation, index) => {
            const price = itemsPrices.find(
              ({ id }) => id === itemReservation.priceId
            );
            if (!price) {
              setFieldValue(`itemReservations.${index}.cost`, null);
              return;
            }

            setFieldValue(
              `itemReservations.${index}.cost`,
              `${(itemReservation.count * price.cost).toFixed(2)}zł`
            );
          });
        }, [values, initialValues]);

        return (
          <form onSubmit={handleSubmit}>
            <div className={style("form--split")}>
              <SelectField
                name="clientId"
                label="Client"
                options={peopleToOptions(clients)}
                loading={loading}
                disabled={disabled}
              />
              <SelectField
                name="teacherId"
                label="Teacher"
                options={peopleToOptions(teachers)}
                loading={loading}
                disabled={disabled}
              />
            </div>
            <SelectField
              name="discountId"
              label="Discount"
              options={discountsToOptions(discounts)}
              loading={loading}
              disabled={disabled}
            />
            <SelectField
              name="priceId"
              label="Price"
              options={pricesToOptions(servicesPrices)}
              loading={loading}
              disabled={disabled}
            />
            {values.itemReservations.map((item, index) => (
              <div className={style("form--split")}>
                <SelectField
                  name={`itemReservations.${index}.itemId`}
                  label="Item"
                  size="small"
                  options={itemsToOptions(items)}
                  loading={loading}
                  disabled={disabled}
                />
                <SelectField
                  name={`itemReservations.${index}.priceId`}
                  label="Price"
                  size="small"
                  options={pricesToOptions(itemsPrices)}
                  loading={loading}
                  disabled={disabled || !values.itemReservations[index].itemId}
                />
                <TextField
                  name={`itemReservations.${index}.count`}
                  label="Count"
                  size="small"
                  type="number"
                  disabled={disabled || !values.itemReservations[index].itemId}
                />
                <TextField
                  name={`itemReservations.${index}.cost`}
                  label="cost"
                  size="small"
                  disabled
                />
                {disabled || (
                  <Button icon={<RemoveIcon />} onClick={removeItem(index)} />
                )}
              </div>
            ))}
            {disabled || (
              <Button
                icon={<AddIcon />}
                title="Add item reservation"
                onClick={addItem}
              />
            )}
            <div className={style("form--split")}>
              <TextField name="reservation.start" label="Start" disabled />
              <TextField name="reservation.end" label="End" disabled />
            </div>
            <TextField name="cost" label="Total" disabled />
            <Actions
              onSubmit={
                !disabled && (async () => (await submitForm(), isValid))
              }
              onRemove={disabled && handleRemove}
              disabledSubmit={loading}
              disabledRemove={loading}
            />
          </form>
        );
      }}
    </Formik>
  );
};
