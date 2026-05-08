import { Request, Response, NextFunction } from 'express';
import { CatalogService } from '../services/service.service';
import { serviceDateQuerySchema } from '../validators/service.validator';
import { sendSuccess } from '../utils/response';

export class ServiceController {
  constructor(private catalogService: CatalogService) {}

  async getServices(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.catalogService.getServices({
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        category: req.query.category as string,
        title: req.query.title as string,
      });
      return sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async getServiceById(req: Request, res: Response, next: NextFunction) {
    try {
      const { bookingDate } = serviceDateQuerySchema.parse(req.query);
      const result = await this.catalogService.getServiceById({
        id: req.params.id as string,
        bookingDate,
      });
      return sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }
}
