import { useEffect, VFC } from "react";
import { useListFetch } from "shared/hooks";
import {
  clientService,
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
import { CourtReservation } from "@models";
import { object, Schema, string, array, number } from "yup";
import { filter } from "lodash";
import { Formik } from "formik";
import { pricesToOptions } from "shared/utils/options/prices";
import { formatPrice } from "shared/utils/formats/formatPrice";

interface FormValues {}
export const pendingSchema: Schema<FormValues> = object<any>({
  clientId: string().required("Client is required").nullable(),
  discountId: string().nullable(),
  teacherId: string().nullable(),
  priceId: string().required("Price is required").nullable(),
  itemReservations: array()
    .of(
      object<any>({
        id: string().required("Item is required").nullable(),
        count: number().required("Count is required").min(1).nullable(),
      })
    )
    .min(0)
    .max(20)
    .required(),
}).defined();

interface Props {
  reservation: CourtReservation.Entity;
  disabled?: boolean;
}

export const ReservationPendingForm: VFC<Props> = ({
  reservation,
  disabled,
}) => {
  const { start, end, courtId, teacherId } = reservation;

  const {
    list: { items: transactions },
  } = useListFetch(transactionService.readAll);

  const {
    discountId = null,
    clientId = null,
    reservationId = null,
    priceId = null,
  } = transactions.find(
    ({ reservationId }) => reservationId === reservation.id
  ) || {};

  const {
    list: { status: itemsStatus, items: items },
  } = useListFetch(itemService.readAll);

  const {
    list: { items: itemReservations },
  } = useListFetch(() => {
    return itemReservationService.readAll().then(({ items, ...meta }) => ({
      items: items.filter(
        ({ courtReservationId }) => courtReservationId === reservationId
      ),
      ...meta,
    }));
  });
  const {
    list: { status: pricesStatus, items: prices },
  } = useListFetch(priceService.readAll);

  const itemsPrices = prices.filter(({ isItem }) => isItem);
  const servicesPrices = prices.filter(({ isItem }) => !isItem);

  const {
    list: { status: employeesStatus, items: employees },
  } = useListFetch(employeeService.readAll);

  const {
    list: { status: clientsStatus, items: clients },
  } = useListFetch(clientService.readAll);

  const {
    list: { status: discountsStatus, items: discounts },
  } = useListFetch(discountService.readAll);

  const teachers = filter(employees, "isTeacher");

  const handleSuccess = async (values: any) => {
    console.log({ values });
  };

  return (
    <Formik
      validationSchema={pendingSchema}
      initialValues={{
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
      }}
      onSubmit={handleSuccess}
      enableReinitialize
      validateOnMount
    >
      {({ handleSubmit, submitForm, isValid, values, setFieldValue }) => {
        const addItem = () =>
          setFieldValue("itemReservations", [
            ...values.itemReservations,
            { id: null, count: null, cost: 0, priceId: null },
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
            .filter(({ id, priceId, count }) => id && priceId && count)
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
        }, [values]);

        return (
          <form onSubmit={handleSubmit}>
            <div className={style("form--split")}>
              <SelectField
                name="clientId"
                label="Client"
                options={peopleToOptions(clients)}
                loading={!isSuccess(clientsStatus)}
                disabled={disabled}
              />
              <SelectField
                name="teacherId"
                label="Teacher"
                options={peopleToOptions(teachers)}
                loading={!isSuccess(employeesStatus)}
                disabled={disabled}
              />
            </div>
            <SelectField
              name="discountId"
              label="Discount"
              options={discountsToOptions(discounts)}
              loading={!isSuccess(discountsStatus)}
              disabled={disabled}
            />
            <SelectField
              name="priceId"
              label="Price"
              options={pricesToOptions(servicesPrices)}
              loading={!isSuccess(pricesStatus)}
              disabled={disabled}
            />
            {values.itemReservations.map((item, index) => (
              <div className={style("form--split")}>
                <SelectField
                  name={`itemReservations.${index}.id`}
                  label="Item"
                  size="small"
                  options={itemsToOptions(items)}
                  loading={!isSuccess(itemsStatus)}
                  disabled={disabled}
                />
                <SelectField
                  name={`itemReservations.${index}.priceId`}
                  label="Price"
                  size="small"
                  options={pricesToOptions(itemsPrices)}
                  loading={!isSuccess(itemsStatus)}
                  disabled={disabled}
                />
                <TextField
                  name={`itemReservations.${index}.count`}
                  label="Count"
                  size="small"
                  type="number"
                  disabled={disabled}
                  onChange={(value) => {
                    const price = itemsPrices.find(
                      ({ id }) => id === values.itemReservations[index].priceId
                    );
                    if (!price) {
                      setFieldValue(`itemReservations.${index}.cost`, 0);
                      return;
                    }

                    setFieldValue(
                      `itemReservations.${index}.cost`,
                      `${(Number(value) * price.cost).toFixed(2)}zł`
                    );
                  }}
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
            />
          </form>
        );
      }}
    </Formik>
  );
};
