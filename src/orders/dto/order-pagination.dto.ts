import { OrderStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsNumber, IsPositive, IsOptional, IsEnum } from 'class-validator';
import { orderStatusList } from '../enum/order-status.enum';

export class OrderPaginationDto {
  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @IsEnum(orderStatusList, { message: `Valores permitos ${orderStatusList}` })
  @IsOptional()
  status: OrderStatus;
}
