import mongoose, { Schema, Document } from 'mongoose';

export interface IBooking extends Document {
  user: mongoose.Types.ObjectId;
  items: {
    serviceId: mongoose.Types.ObjectId;
    slotId: string;
    quantity: number;
    priceSnapshot: number;
  }[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'failed';
  paymentMethod: 'cash' | 'pay_on_arrival' | 'online';
  createdAt: Date;
  updatedAt: Date;
}

const BookingItemSchema = new Schema({
  serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
  slotId: { type: String, required: true },
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
      enum: ['pending', 'confirmed', 'completed', 'cancelled', 'failed'],
      default: 'pending',
    },
    paymentMethod: { type: String, enum: ['cash', 'pay_on_arrival', 'online'], required: true },
  },
  { timestamps: true },
);

export default mongoose.model<IBooking>('Booking', BookingSchema);
