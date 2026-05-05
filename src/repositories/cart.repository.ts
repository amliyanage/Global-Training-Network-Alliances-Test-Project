import Cart, { ICart } from '../models/Cart';
import mongoose from 'mongoose';

export class CartRepository {
  async findByUserId(userId: string, session?: mongoose.ClientSession) {
    if (session) return Cart.findOne({ user: userId }).session(session);
    return Cart.findOne({ user: userId });
  }
  async findByUserIdPopulated(userId: string, session?: mongoose.ClientSession) {
    const query = Cart.findOne({ user: userId }).populate('items.serviceId');
    if (session) return query.session(session);
    return query;
  }
  async create(data: { user: string; items: any[] }) {
    return Cart.create(data);
  }
  async build(data: { user: string; items: any[] }) {
    return new Cart(data);
  }
  async save(cart: any, session?: mongoose.ClientSession) {
    if (session) return cart.save({ session });
    return cart.save();
  }
}
