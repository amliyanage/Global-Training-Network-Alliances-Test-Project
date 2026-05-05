import mongoose, { Schema, Document } from 'mongoose';

export interface ITimeSlot {
  _id?: string | mongoose.Types.ObjectId;
  startTime: Date;
  capacity: number;
}

export interface IService extends Document {
  title: string;
  description: string;
  price: number;
  duration: number; // in minutes
  category: string;
  image: string;
  capacityPerSlot: number;
  slots: ITimeSlot[];
}

const TimeSlotSchema = new Schema({
  startTime: { type: Date, required: true },
  capacity: { type: Number, required: true, min: 0 },
});

const ServiceSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    duration: { type: Number, required: true },
    category: { type: String, required: true },
    image: { type: String, required: true },
    capacityPerSlot: { type: Number, required: true },
    slots: [TimeSlotSchema],
  },
  { timestamps: true },
);

export default mongoose.model<IService>('Service', ServiceSchema);
