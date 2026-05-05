import { Router } from 'express';
import { ServiceRepository } from '../repositories/service.repository';
import { CatalogService } from '../services/service.service';
import { ServiceController } from '../controllers/service.controller';

const router = Router();

const serviceRepository = new ServiceRepository();
const catalogService = new CatalogService(serviceRepository);
const serviceController = new ServiceController(catalogService);

router.get('/', serviceController.getServices.bind(serviceController));
router.get('/:id', serviceController.getServiceById.bind(serviceController));

export default router;
