import { Request, Response, NextFunction } from 'express';
import { CartService } from '../services/cart.service';
import { addItemSchema, updateItemSchema } from '../validators/cart.validator';

export class CartController {
  constructor(private cartService: CartService) {}

  async getCart(req: Request, res: Response, next: NextFunction) {
    try {
      const cart = await this.cartService.getCart((req as any).user._id);
      res.status(200).json(cart);
    } catch (error) {
      next(error);
    }
  }

  async addItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { serviceId, slotId, quantity } = addItemSchema.parse(req.body);
      const cart = await this.cartService.addItem({
        userId: (req as any).user._id,
        serviceId,
        slotId,
        quantity
      });
      res.status(200).json(cart);
    } catch (error) {
      next(error);
    }
  }

  async updateItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { quantity } = updateItemSchema.parse(req.body);
      const cart = await this.cartService.updateItem({
        userId: (req as any).user._id,
        itemId: req.params.itemId as string,
        quantity
      });
      res.status(200).json(cart);
    } catch (error) {
      next(error);
    }
  }

  async removeItem(req: Request, res: Response, next: NextFunction) {
    try {
      const cart = await this.cartService.removeItem({
        userId: (req as any).user._id,
        itemId: req.params.itemId as string
      });
      res.status(200).json(cart);
    } catch (error) {
      next(error);
    }
  }
}
