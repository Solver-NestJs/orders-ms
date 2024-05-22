export interface IOrderWithProducts {
  orderItems: {
    productName: any;
    id: string;
    productId: number;
    quantity: number;
    price: number;
  }[];
  id: string;
  totalAmount: number;
  totalItems: number;
}
