export interface GetServicesFilterDto {
  page?: number;
  limit?: number;
  category?: string;
  title?: string;
}

export interface GetServiceByIdDto {
  id: string;
  bookingDate?: string;
}
