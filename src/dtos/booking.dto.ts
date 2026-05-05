export interface CheckoutDto {
  userId: string;
  paymentMethod: 'cash' | 'pay_on_arrival' | 'online';
}

export interface BookingActionDto {
  userId: string;
  bookingId: string;
}
