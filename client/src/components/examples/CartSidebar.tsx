import { useState } from 'react';
import CartSidebar from '../CartSidebar';
import { Button } from '@/components/ui/button';
import rotiImage from '@assets/generated_images/Fresh_tandoori_rotis_stack_1dcda2c7.png';

export default function CartSidebarExample() {
  const [isOpen, setIsOpen] = useState(true);
  
  const mockItems = [
    {
      id: '1',
      name: 'Butter Naan',
      price: 45,
      quantity: 2,
      image: rotiImage,
    },
    {
      id: '2',
      name: 'Tandoori Roti',
      price: 30,
      quantity: 4,
      image: rotiImage,
    },
  ];

  return (
    <div className="h-screen">
      <Button onClick={() => setIsOpen(true)}>Open Cart</Button>
      <CartSidebar
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        items={mockItems}
        onUpdateQuantity={(id, qty) => console.log('Update quantity:', id, qty)}
        onCheckout={() => console.log('Checkout')}
      />
    </div>
  );
}
