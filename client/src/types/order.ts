export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface Order {
  id: string;
  createdAt: string;
  status: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  address: string;
  phone: string;
  paymentStatus: string;  
  rejectionReason?: string;
  deliveryPersonName?: string;
}
