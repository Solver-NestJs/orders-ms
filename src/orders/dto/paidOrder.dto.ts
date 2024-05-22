import { IsString } from 'class-validator';

export class PaidOrderDto {
  @IsString()
  stripePaymentId: string;
  @IsString()
  orderId: string;
  @IsString()
  receiptUrl: string;
}
