import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  total?: number;
  minOrderAmount?: number;
  meetsMinimum?: boolean;
}

interface CartStore {
  carts: CategoryCart[];
  cartMinSettings: Record<string, number>;
  setCartMinSettings: (settings: Record<string, number>) => void;
  addToCart: (item: Omit<CartItem, "quantity">, categoryName: string) => boolean;
  removeFromCart: (categoryId: string, itemId: string) => void;
  updateQuantity: (categoryId: string, itemId: string, quantity: number) => void;
  clearCart: (categoryId: string) => void;
  clearAllCarts: () => void;
  getTotalItems: (categoryId?: string) => number;
  getTotalPrice: (categoryId: string) => number;
  getCart: (categoryId: string) => CategoryCart | undefined;
  getAllCarts: () => CategoryCart[];
  canAddItem: (
    chefId?: string,
    categoryId?: string
  ) => { canAdd: boolean; conflictChef?: string };
  getCartWithValidation: (categoryId: string) => CategoryCart | undefined;
  getAllCartsWithValidation: () => CategoryCart[];
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      carts: [],
      cartMinSettings: {},

      setCartMinSettings: (settings: Record<string, number>) => {
        set({ cartMinSettings: settings });
      },

      // ✅ Check if item can be added (per category/chef rule)
      canAddItem: (chefId?: string, categoryId?: string) => {
        const { carts } = get();
        if (!chefId || !categoryId) return { canAdd: true };

        const categoryCart = carts.find(
          (cart) => cart.categoryId === categoryId
        );

        if (!categoryCart) return { canAdd: true };

        if (categoryCart.chefId === chefId) {
          return { canAdd: true };
        }

        // ❌ Different chef for same category
        return { canAdd: false, conflictChef: categoryCart.chefName };
      },

      // ✅ Add item to specific category cart
      addToCart: (item, categoryName) => {
        const { carts, canAddItem } = get();

        // Safety check
        if (!item.categoryId) {
          console.warn("Attempted to add item without categoryId:", item);
          return false;
        }

        const checkResult = canAddItem(item.chefId, item.categoryId);
        if (!checkResult.canAdd) {
          console.warn(
            `Cannot add item — existing chef in ${item.categoryId} is ${checkResult.conflictChef}`
          );
          return false;
        }

        const categoryCartIndex = carts.findIndex(
          (cart) => cart.categoryId === item.categoryId
        );

        // ✅ No cart yet → create new category cart
        if (categoryCartIndex === -1) {
          const newCart: CategoryCart = {
            categoryId: item.categoryId,
            categoryName,
            chefId: item.chefId || "",
            chefName: item.chefName || "",
            items: [{ ...item, quantity: 1 }],
          };
          set({ carts: [...carts, newCart] });
          return true;
        }

        // ✅ Existing cart → update or add item
        const categoryCart = carts[categoryCartIndex];
        const existingItemIndex = categoryCart.items.findIndex(
          (i) => i.id === item.id
        );

        const updatedCarts = [...carts];
        if (existingItemIndex !== -1) {
          // Increment quantity
          const updatedItems = [...categoryCart.items];
          updatedItems[existingItemIndex] = {
            ...updatedItems[existingItemIndex],
            quantity: updatedItems[existingItemIndex].quantity + 1,
          };
          updatedCarts[categoryCartIndex] = {
            ...categoryCart,
            items: updatedItems,
          };
        } else {
          // Add new item
          updatedCarts[categoryCartIndex] = {
            ...categoryCart,
            items: [...categoryCart.items, { ...item, quantity: 1 }],
          };
        }

        set({ carts: updatedCarts });
        return true;
      },

      // ✅ Remove item from cart
      removeFromCart: (categoryId, itemId) => {
        const { carts } = get();
        const updatedCarts = carts
          .map((cart) => {
            if (cart.categoryId === categoryId) {
              const updatedItems = cart.items.filter(
                (item) => item.id !== itemId
              );
              return { ...cart, items: updatedItems };
            }
            return cart;
          })
          .filter((cart) => cart.items.length > 0); // Remove empty carts

        set({ carts: updatedCarts });
      },

      // ✅ Update quantity (auto-removes if quantity <= 0)
      updateQuantity: (categoryId, itemId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(categoryId, itemId);
          return;
        }

        const { carts } = get();
        const updatedCarts = carts.map((cart) => {
          if (cart.categoryId === categoryId) {
            const updatedItems = cart.items.map((item) =>
              item.id === itemId ? { ...item, quantity } : item
            );
            return { ...cart, items: updatedItems };
          }
          return cart;
        });

        set({ carts: updatedCarts });
      },

      // ✅ Clear specific category cart (used after order placement)
      clearCart: (categoryId: string) => {
        const { carts } = get();
        const updatedCarts = carts.filter(
          (cart) => cart.categoryId !== categoryId
        );
        set({ carts: updatedCarts });
      },

      // ✅ Clear all carts (for logout or full reset)
      clearAllCarts: () => {
        set({ carts: [] });
      },

      // ✅ Get total number of items
      getTotalItems: (categoryId?: string) => {
        const { carts } = get();
        if (categoryId) {
          const cart = carts.find((c) => c.categoryId === categoryId);
          return cart
            ? cart.items.reduce((total, item) => total + item.quantity, 0)
            : 0;
        }

        return carts.reduce(
          (total, cart) =>
            total +
            cart.items.reduce((sum, item) => sum + item.quantity, 0),
          0
        );
      },

      // ✅ Get total price for one category
      getTotalPrice: (categoryId: string) => {
        const { carts } = get();
        const cart = carts.find((c) => c.categoryId === categoryId);
        return cart
          ? cart.items.reduce((total, item) => total + item.price * item.quantity, 0)
          : 0;
      },

      // ✅ Get cart by categoryId
      getCart: (categoryId: string) => {
        return get().carts.find((cart) => cart.categoryId === categoryId);
      },

      // ✅ Helper to get all carts (useful for debugging or analytics)
      getAllCarts: () => {
        return get().carts;
      },

      // ✅ Get cart with minimum order validation
      getCartWithValidation: (categoryId: string) => {
        const { carts, cartMinSettings } = get();
        const cart = carts.find((c) => c.categoryId === categoryId);
        if (!cart) return undefined;

        const subtotal = cart.items.reduce((total, item) => total + item.price * item.quantity, 0);
        const minOrderAmount = cartMinSettings[categoryId] || 100; // Default ₹100
        const meetsMinimum = subtotal >= minOrderAmount;

        return {
          ...cart,
          total: subtotal,
          minOrderAmount,
          meetsMinimum,
        };
      },

      // ✅ Get all carts with minimum order validation
      getAllCartsWithValidation: () => {
        const { carts, cartMinSettings } = get();
        return carts.map((cart) => {
          const subtotal = cart.items.reduce((total, item) => total + item.price * item.quantity, 0);
          const minOrderAmount = cartMinSettings[cart.categoryId] || 100; // Default ₹100
          const meetsMinimum = subtotal >= minOrderAmount;

          return {
            ...cart,
            total: subtotal,
            minOrderAmount,
            meetsMinimum,
          };
        });
      },
    }),
    {
      name: "cart-storage", // persisted key in localStorage
    }
  )
);
