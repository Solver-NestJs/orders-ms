import { Controller, ParseUUIDPipe } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { PaidOrderDto } from './dto/paidOrder.dto';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @MessagePattern('createOrder')
  async create(@Payload() createOrderDto: CreateOrderDto) {
    const order = await this.ordersService.create(createOrderDto);
    const paymentSession = await this.ordersService.createPaymentSession(order);
    return { paymentSession };
  }

  @MessagePattern('findAllOrders')
  findAll(@Payload() orderPaginationDto: OrderPaginationDto) {
    return this.ordersService.findAll(orderPaginationDto);
  }

  @MessagePattern('findOneOrder')
  findOne(@Payload('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(id);
  }

  @MessagePattern('changeStatusOrder')
  changeStatus(@Payload() changeStatusDto: ChangeStatusDto) {
    return this.ordersService.changeStatus(changeStatusDto);
  }

  @EventPattern('payment.succeeded')
  paymentSucceeded(@Payload() payload: PaidOrderDto) {
    return this.ordersService.paidOrder(payload);
  }
}
