import { GetServicesFilterDto } from '../dtos/service.dto';
import { ServiceRepository } from '../repositories/service.repository';
import { AppError } from '../utils/errors';

export class CatalogService {
  constructor(private serviceRepository: ServiceRepository) {}

  async getServices(dto: GetServicesFilterDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (dto.category) filter.category = dto.category;
    if (dto.title) filter.title = { $regex: dto.title, $options: 'i' };

    const [services, total] = await Promise.all([
      this.serviceRepository.findFilteredAndPaginated(filter, skip, limit),
      this.serviceRepository.count(filter),
    ]);

    return {
      data: services,
      total,
      hasMore: total > skip + services.length,
      page,
      limit,
    };
  }

  async getServiceById(id: string) {
    const service = await this.serviceRepository.findById(id);
    if (!service) {
      throw new AppError(404, 'Service not found', 'NOT_FOUND');
    }
    return service;
  }
}
