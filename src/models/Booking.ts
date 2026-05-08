import mongoose, { Schema, Document } from 'mongoose';
import {
  ALL_BOOKING_STATUSES,
  ALL_PAYMENT_METHODS,
  ALL_PAYMENT_STATUSES,
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
} from '../types/booking.types';

export interface IBooking extends Document {
  user: mongoose.Types.ObjectId;
  items: {
    serviceId: mongoose.Types.ObjectId;
    slotId: string;
    bookingDate?: Date;
    quantity: number;
    priceSnapshot: number;
  }[];
  totalAmount: number;
  status: BookingStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentGateway?: 'payhere';
  paymentOrderId?: string;
  paymentId?: string;
  paymentVerifiedAt?: Date;
  paymentStatusCode?: number;
  paymentStatusMessage?: string;
  paymentMethodName?: string;
  capacityReleasedOnFailure?: boolean;
  payhereNotifications: {
    statusCode: number;
    md5sig: string;
    paymentId?: string;
    statusMessage?: string;
    method?: string;
    rawBody?: string;
    receivedAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const BookingItemSchema = new Schema({
  serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
  slotId: { type: String, required: true },
  bookingDate: { type: Date },
  quantity: { type: Number, required: true },
  priceSnapshot: { type: Number, required: true },
});

const BookingSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: [BookingItemSchema],
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ALL_BOOKING_STATUSES,
      default: 'pending',
    },
    paymentMethod: { type: String, enum: ALL_PAYMENT_METHODS, required: true },
    paymentStatus: {
      type: String,
      enum: ALL_PAYMENT_STATUSES,
      default: 'pending',
    },
    paymentGateway: { type: String, enum: ['payhere'] },
    paymentOrderId: { type: String, unique: true, sparse: true },
    paymentId: { type: String },
    paymentVerifiedAt: { type: Date },
    paymentStatusCode: { type: Number },
    paymentStatusMessage: { type: String },
    paymentMethodName: { type: String },
    capacityReleasedOnFailure: { type: Boolean, default: false },
    payhereNotifications: [
      {
        statusCode: { type: Number, required: true },
        md5sig: { type: String, required: true },
        paymentId: { type: String },
        statusMessage: { type: String },
        method: { type: String },
        rawBody: { type: String },
        receivedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

export default mongoose.model<IBooking>('Booking', BookingSchema);
