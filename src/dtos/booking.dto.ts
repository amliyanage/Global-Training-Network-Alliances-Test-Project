import { PaymentMethod } from '../types/booking.types';

export interface CheckoutCustomerDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
}

export interface CheckoutDto {
  userId: string;
  userEmail?: string;
  paymentMethod: PaymentMethod;
  customer?: CheckoutCustomerDto;
}

export interface BookingActionDto {
  userId: string;
  bookingId: string;
}

export interface PayHereNotifyDto {
  merchant_id: string;
  order_id: string;
  payment_id?: string;
  payhere_amount: string;
  payhere_currency: string;
  status_code: string;
  md5sig: string;
  method?: string;
  status_message?: string;
  custom_1?: string;
  custom_2?: string;
  [key: string]: string | undefined;
}
