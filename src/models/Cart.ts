import mongoose, { Schema, Document } from 'mongoose';

export interface ICartItem {
  _id?: string | mongoose.Types.ObjectId;
  serviceId: mongoose.Types.ObjectId;
  slotId: string;
  bookingDate?: Date;
  quantity: number;
  expiresAt: Date;
}

export interface ICart extends Document {
  user: mongoose.Types.ObjectId;
  items: ICartItem[];
  createdAt: Date;
  updatedAt: Date;
}

const CartItemSchema = new Schema({
  serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
  slotId: { type: String, required: true },
  bookingDate: { type: Date },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  expiresAt: { type: Date, required: true },
});

const CartSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [CartItemSchema],
  },
  { timestamps: true },
);

CartSchema.index({ 'items.expiresAt': 1 });

export default mongoose.model<ICart>('Cart', CartSchema);
