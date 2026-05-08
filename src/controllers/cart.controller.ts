import { Request, Response, NextFunction } from 'express';
import { CartService } from '../services/cart.service';
import { addItemSchema, updateItemSchema } from '../validators/cart.validator';
import { sendSuccess } from '../utils/response';

export class CartController {
  constructor(private cartService: CartService) {}

  async getCart(req: Request, res: Response, next: NextFunction) {
    try {
      const cart = await this.cartService.getCart(req.user!._id.toString());
      return sendSuccess(res, cart, 200);
    } catch (error) {
      next(error);
    }
  }

  async addItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { serviceId, slotId, bookingDate, quantity } = addItemSchema.parse(req.body);
      const cart = await this.cartService.addItem({
        userId: req.user!._id.toString(),
        serviceId,
        slotId,
        bookingDate,
        quantity,
      });
      return sendSuccess(res, cart, 200, 'Item added to cart');
    } catch (error) {
      next(error);
    }
  }

  async updateItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { quantity } = updateItemSchema.parse(req.body);
      const cart = await this.cartService.updateItem({
        userId: req.user!._id.toString(),
        itemId: req.params.itemId as string,
        quantity,
      });
      return sendSuccess(res, cart, 200, 'Cart item updated');
    } catch (error) {
      next(error);
    }
  }

  async removeItem(req: Request, res: Response, next: NextFunction) {
    try {
      const cart = await this.cartService.removeItem({
        userId: req.user!._id.toString(),
        itemId: req.params.itemId as string,
      });
      return sendSuccess(res, cart, 200, 'Cart item removed');
    } catch (error) {
      next(error);
    }
  }
}
