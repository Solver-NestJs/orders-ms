import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, PrismaClient } from '@prisma/client';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { NATS_SERVICES } from 'src/config/services';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { catchError, firstValueFrom } from 'rxjs';
import { IOrderWithProducts } from './interfaces/IOrderWithProducts';
import { PaidOrderDto } from './dto/paidOrder.dto';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
  logger = new Logger('OrdersService');

  constructor(@Inject(NATS_SERVICES) private readonly client: ClientProxy) {
    super();
  }
  onModuleInit() {
    this.$connect();
    this.logger.log('Connected to the database');
  }

  async create(createOrderDto: CreateOrderDto) {
    //1. Extraer los Ids de los productos del arreglo items Dto
    const ids = createOrderDto.items.map((item) => item.productId);
    //2. Conectarnos con el Micro de Productos para valiadar los productos
    const products = await firstValueFrom(
      this.client.send({ cmd: 'validateProducts' }, ids).pipe(
        catchError((error) => {
          throw new RpcException(error);
        }),
      ),
    );
    //3. Calcular el total de la orden
    const totalAmount = products.reduce((acc, product) => {
      const item = createOrderDto.items.find(
        (item) => item.productId === product.id,
      );
      return acc + item.quantity * product.price;
    }, 0);
    //4. calcular el numero de Items
    const totalItems = createOrderDto.items.reduce(
      (acc, item) => acc + item.quantity,
      0,
    );
    //5. Crear la orden en la base de datos
    const order = await this.order.create({
      data: {
        totalAmount,
        totalItems,
        orderItems: {
          create: createOrderDto.items.map((item) => ({
            ...item,
            price: products.find((product) => product.id === item.productId)
              .price,
          })),
        },
      },
      select: {
        id: true,
        totalAmount: true,
        totalItems: true,
        orderItems: {
          select: {
            id: true,
            quantity: true,
            price: true,
            productId: true,
          },
        },
      },
    });
    //6. Retornar la orden creada
    return {
      ...order,
      orderItems: order.orderItems.map((item) => ({
        ...item,
        productName: products.find((product) => product.id === item.productId)
          .name,
      })),
    };
  }

  async findAll(orderPaginationDto: OrderPaginationDto) {
    const { page, limit, status } = orderPaginationDto;
    const [total, orders] = await Promise.all([
      await this.order.count({
        where: {
          orderStatus: status,
        },
      }),
      await this.order.findMany({
        where: {
          orderStatus: status,
        },
        take: limit,
        skip: (page - 1) * limit,
      }),
    ]);
    return {
      data: orders,
      meta: {
        currentPage: page,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    //1. Buscar la orden y los detalles
    const order = await this.order.findUnique({
      where: { id },
      select: {
        id: true,
        totalAmount: true,
        totalItems: true,
        orderStatus: true,
        orderItems: {
          select: {
            id: true,
            quantity: true,
            price: true,
            productId: true,
          },
        },
      },
    });

    if (!order) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: 'Order not found',
      });
    }

    //2. Extraer los Ids de los productos
    const ids = order.orderItems.map((item) => item.productId);
    //3. Conectarnos con el Micro de Productos para obtener los productos
    const products = await firstValueFrom(
      this.client.send({ cmd: 'validateProducts' }, ids).pipe(
        catchError((error) => {
          throw new RpcException(error);
        }),
      ),
    );
    //4. Retornar la orden con los nombres de los productos
    return {
      ...order,
      orderItems: order.orderItems.map((item) => ({
        ...item,
        productName: products.find((product) => product.id === item.productId)
          .name,
      })),
    };
  }

  async changeStatus(changeStatusDto: ChangeStatusDto) {
    const order = await this.findOne(changeStatusDto.id);
    if (order.orderStatus === changeStatusDto.status) {
      return order;
    }

    return this.order.update({
      where: { id: changeStatusDto.id },
      data: { orderStatus: changeStatusDto.status },
    });
  }

  async createPaymentSession(order: IOrderWithProducts) {
    const paymentSession = await firstValueFrom(
      this.client
        .send('create.payment.session', {
          orderId: order.id,
          currency: 'usd',
          items: order.orderItems.map((item) => ({
            name: item.productName,
            price: item.price,
            quantity: item.quantity,
          })),
        })
        .pipe(
          catchError((error) => {
            throw new RpcException(error);
          }),
        ),
    );

    return {
      cancelUrl: paymentSession.cancel_url,
      successUrl: paymentSession.success_url,
      paymentUrlSession: paymentSession.url,
    };
  }

  async paidOrder(payload: PaidOrderDto) {
    const order = await this.order.update({
      where: { id: payload.orderId },
      data: {
        paid: true,
        paidAt: new Date(),
        stripeSessionId: payload.stripePaymentId,
        orderStatus: OrderStatus.PAID,

        orderReceipt: {
          create: {
            receiptUrl: payload.receiptUrl,
          },
        },
      },
    });

    this.logger.log('Order updated to PAID');
    return order;
  }
}
