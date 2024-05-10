import { OrderStatus } from '@prisma/client';
import { IsEnum, IsUUID } from 'class-validator';
import { orderStatusList } from '../enum/order-status.enum';

export class ChangeStatusDto {
  @IsUUID()
  id: string;

  @IsEnum(orderStatusList, {
    message: `Status must be one of the following values: ${orderStatusList.join(', ')}`,
  })
  status: OrderStatus;
}
