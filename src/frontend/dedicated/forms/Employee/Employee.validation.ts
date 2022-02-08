import { object, string, boolean, Schema, date, number } from "yup";
import { Employee } from "@models";

export const employeeSchema: Schema<Employee.Model> = object<Employee.Model>({
  address: string().required(),
  bankAccount: string().required(),
  birthdate: date().required().min(new Date(1960, 0)).max(new Date(2010, 0)),
  email: string().required(),
  isTeacher: boolean().required(),
  name: string().required(),
  payroll: number().required(),
  phone: string().required(),
  surname: string().required(),
}).defined();
