
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  chefId?: string;
  chefName?: string;
  categoryId?: string;
}

interface CategoryCart {
  categoryId: string;
  categoryName: string;
  chefId: string;
  chefName: string;
  items: CartItem[];
}

interface CartStore {
  carts: CategoryCart[]; // Multiple carts - one per category
  addToCart: (item: Omit<CartItem, 'quantity'>, categoryName: string) => boolean;
  removeFromCart: (categoryId: string, itemId: string) => void;
  updateQuantity: (categoryId: string, itemId: string, quantity: number) => void;
  clearCart: (categoryId: string) => void;
  clearAllCarts: () => void;
  getTotalItems: (categoryId?: string) => number;
  getTotalPrice: (categoryId: string) => number;
  getCart: (categoryId: string) => CategoryCart | undefined;
  canAddItem: (chefId?: string, categoryId?: string) => { canAdd: boolean; conflictChef?: string };
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      carts: [],
      
      canAddItem: (chefId?: string, categoryId?: string) => {
        const { carts } = get();
        
        // If no chefId or categoryId provided, allow
        if (!chefId || !categoryId) {
          return { canAdd: true };
        }
        
        // Find cart for this category
        const categoryCart = carts.find(cart => cart.categoryId === categoryId);
        
        // If no cart exists for this category yet, allow
        if (!categoryCart) {
          return { canAdd: true };
        }
        
        // If same chef, allow
        if (categoryCart.chefId === chefId) {
          return { canAdd: true };
        }
        
        // Different chef for same category - not allowed
        return { 
          canAdd: false, 
          conflictChef: categoryCart.chefName 
        };
      },
      
      addToCart: (item, categoryName) => {
        const { carts, canAddItem } = get();
        
        // Check if item can be added
        const checkResult = canAddItem(item.chefId, item.categoryId);
        if (!checkResult.canAdd) {
          return false; // Cannot add - different chef in same category
        }
        
        // Find or create cart for this category
        const categoryCartIndex = carts.findIndex(cart => cart.categoryId === item.categoryId);
        
        if (categoryCartIndex === -1) {
          // Create new cart for this category
          const newCart: CategoryCart = {
            categoryId: item.categoryId || '',
            categoryName: categoryName,
            chefId: item.chefId || '',
            chefName: item.chefName || '',
            items: [{ ...item, quantity: 1 }]
          };
          set({ carts: [...carts, newCart] });
        } else {
          // Add to existing category cart
          const categoryCart = carts[categoryCartIndex];
          const existingItemIndex = categoryCart.items.findIndex(i => i.id === item.id);
          
          if (existingItemIndex !== -1) {
            // Update quantity
            const updatedItems = [...categoryCart.items];
            updatedItems[existingItemIndex] = {
              ...updatedItems[existingItemIndex],
              quantity: updatedItems[existingItemIndex].quantity + 1
            };
            
            const updatedCarts = [...carts];
            updatedCarts[categoryCartIndex] = {
              ...categoryCart,
              items: updatedItems
            };
            set({ carts: updatedCarts });
          } else {
            // Add new item
            const updatedCarts = [...carts];
            updatedCarts[categoryCartIndex] = {
              ...categoryCart,
              items: [...categoryCart.items, { ...item, quantity: 1 }]
            };
            set({ carts: updatedCarts });
          }
        }
        
        return true;
      },
      
      removeFromCart: (categoryId, itemId) => {
        const { carts } = get();
        const updatedCarts = carts
          .map(cart => {
            if (cart.categoryId === categoryId) {
              const updatedItems = cart.items.filter(item => item.id !== itemId);
              return { ...cart, items: updatedItems };
            }
            return cart;
          })
          .filter(cart => cart.items.length > 0); // Remove empty carts
        
        set({ carts: updatedCarts });
      },
      
      updateQuantity: (categoryId, itemId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(categoryId, itemId);
        } else {
          const { carts } = get();
          const updatedCarts = carts.map(cart => {
            if (cart.categoryId === categoryId) {
              const updatedItems = cart.items.map(item =>
                item.id === itemId ? { ...item, quantity } : item
              );
              return { ...cart, items: updatedItems };
            }
            return cart;
          });
          set({ carts: updatedCarts });
        }
      },
      
      clearCart: (categoryId: string) => {
        const { carts } = get();
        const updatedCarts = carts.filter(cart => cart.categoryId !== categoryId);
        set({ carts: updatedCarts });
      },
      
      clearAllCarts: () => {
        set({ carts: [] });
      },
      
      getTotalItems: (categoryId?: string) => {
        const { carts } = get();
        if (categoryId) {
          const cart = carts.find(c => c.categoryId === categoryId);
          return cart ? cart.items.reduce((total, item) => total + item.quantity, 0) : 0;
        }
        return carts.reduce((total, cart) => 
          total + cart.items.reduce((sum, item) => sum + item.quantity, 0), 0
        );
      },
      
      getTotalPrice: (categoryId: string) => {
        const { carts } = get();
        const cart = carts.find(c => c.categoryId === categoryId);
        return cart ? cart.items.reduce((total, item) => total + item.price * item.quantity, 0) : 0;
      },
      
      getCart: (categoryId: string) => {
        return get().carts.find(cart => cart.categoryId === categoryId);
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);
