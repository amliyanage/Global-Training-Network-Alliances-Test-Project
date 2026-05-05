import mongoose from 'mongoose';
import Service from '../models/Service';

export class ServiceRepository {
  async findFilteredAndPaginated(filter: any, skip: number, limit: number) {
    return Service.find(filter).skip(skip).limit(limit).select('-slots');
  }
  async count(filter: any) {
    return Service.countDocuments(filter);
  }
  async decrementCapacity(
    serviceId: string,
    slotId: string,
    quantity: number,
    session: mongoose.ClientSession,
  ) {
    return Service.findOneAndUpdate(
      { _id: serviceId, 'slots._id': slotId, 'slots.capacity': { $gte: quantity } },
      { $inc: { 'slots.$.capacity': -quantity } },
      { session, new: true },
    );
  }
  async incrementCapacity(
    serviceId: string,
    slotId: string,
    quantity: number,
    session: mongoose.ClientSession,
  ) {
    return Service.findOneAndUpdate(
      { _id: serviceId, 'slots._id': slotId },
      { $inc: { 'slots.$.capacity': quantity } },
      { session },
    );
  }
}
