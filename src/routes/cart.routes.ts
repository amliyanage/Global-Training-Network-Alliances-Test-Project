import { Router } from 'express';
import { ServiceRepository } from '../repositories/service.repository';
import { authenticate } from '../middleware/auth.middleware';
import { CartRepository } from '../repositories/cart.repository';
import { CartService } from '../services/cart.service';
import { CartController } from '../controllers/cart.controller';

const router = Router();

const cartRepository = new CartRepository();
const serviceRepository = new ServiceRepository();
const cartService = new CartService(cartRepository, serviceRepository);
const cartController = new CartController(cartService);

router.use(authenticate);

router.get('/', cartController.getCart.bind(cartController));
router.post('/items', cartController.addItem.bind(cartController));
router.patch('/items/:itemId', cartController.updateItem.bind(cartController));
router.delete('/items/:itemId', cartController.removeItem.bind(cartController));

export default router;
