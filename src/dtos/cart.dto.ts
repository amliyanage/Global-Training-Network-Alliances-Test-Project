export interface AddCartItemDto {
  userId: string;
  serviceId: string;
  slotId: string;
  quantity: number;
}

export interface UpdateCartItemDto {
  userId: string;
  itemId: string;
  quantity: number;
}

export interface RemoveCartItemDto {
  userId: string;
  itemId: string;
}
