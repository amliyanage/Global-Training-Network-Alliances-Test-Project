import { Request, Response, NextFunction } from 'express';
import { CatalogService } from '../services/service.service';

export class ServiceController {
  constructor(private catalogService: CatalogService) {}

  async getServices(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.catalogService.getServices({
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        category: req.query.category as string,
        title: req.query.title as string,
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getServiceById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.catalogService.getServiceById(req.params.id as string);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
