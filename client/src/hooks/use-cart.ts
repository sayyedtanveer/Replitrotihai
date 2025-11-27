import { create } from "zustand";
import { persist } from "zustand/middleware";
import { calculateDistance, calculateDelivery, type DeliverySetting } from "@shared/deliveryUtils";

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
  chefLatitude?: number;
  chefLongitude?: number;
  items: CartItem[];
  total?: number;
  deliveryFee?: number;
  distance?: number;
  freeDeliveryEligible?: boolean;
  amountForFreeDelivery?: number;
  deliveryRangeName?: string;
  chefIsActive?: boolean;
}

interface ChefStatus {
  chefId: string;
  isActive: boolean;
}

interface CartStore {
  carts: CategoryCart[];
  userLatitude: number | null;
  userLongitude: number | null;
  deliverySettings: DeliverySetting[];
  chefStatuses: Record<string, boolean>;
  setUserLocation: (lat: number, lon: number) => void;
  setDeliverySettings: (settings: DeliverySetting[]) => void;
  fetchDeliverySettings: () => Promise<void>;
  updateChefStatus: (chefId: string, isActive: boolean) => void;
  setChefStatuses: (statuses: ChefStatus[]) => void;
  fetchChefStatuses: () => Promise<void>;
  addToCart: (
    item: Omit<CartItem, "quantity">, 
    categoryName: string,
    chefLatitude?: number,
    chefLongitude?: number
  ) => boolean;
  removeFromCart: (categoryId: string, itemId: string) => void;
  updateQuantity: (categoryId: string, itemId: string, quantity: number) => void;
  clearCart: (categoryId: string) => void;
  clearAllCarts: () => void;
  getTotalItems: (categoryId?: string) => number;
  getTotalPrice: (categoryId: string) => number;
  getCart: (categoryId: string) => CategoryCart | undefined;
  getAllCarts: () => CategoryCart[];
  getAllCartsWithDelivery: () => CategoryCart[];
  canAddItem: (
    chefId?: string,
    categoryId?: string
  ) => { canAdd: boolean; conflictChef?: string };
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      carts: [],
      userLatitude: null,
      userLongitude: null,
      deliverySettings: [],
      chefStatuses: {},

      setUserLocation: (lat: number, lon: number) => {
        set({ userLatitude: lat, userLongitude: lon });
      },

      setDeliverySettings: (settings: DeliverySetting[]) => {
        set({ deliverySettings: settings });
      },

      fetchDeliverySettings: async () => {
        try {
          const response = await fetch("/api/delivery-settings");
          if (response.ok) {
            const settings = await response.json();
            set({ deliverySettings: settings });
          }
        } catch (error) {
          console.error("Failed to fetch delivery settings:", error);
        }
      },

      updateChefStatus: (chefId: string, isActive: boolean) => {
        set((state) => {
          const newStatuses = { ...state.chefStatuses, [chefId]: isActive };
          // Force a re-render by creating a new object reference
          return { chefStatuses: newStatuses };
        });
      },

      setChefStatuses: (statuses: ChefStatus[]) => {
        const newStatuses: Record<string, boolean> = {};
        statuses.forEach(s => newStatuses[s.chefId] = s.isActive);
        set({ chefStatuses: newStatuses });
      },

      fetchChefStatuses: async () => {
        try {
          const response = await fetch("/api/chefs");
          if (response.ok) {
            const chefs = await response.json();
            const statuses: ChefStatus[] = chefs.map((chef: { id: string; isActive: boolean }) => ({
              chefId: chef.id,
              isActive: chef.isActive ?? true,
            }));
            get().setChefStatuses(statuses);
          }
        } catch (error) {
          console.error("Failed to fetch chef statuses:", error);
        }
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
      addToCart: (item, categoryName, chefLatitude, chefLongitude) => {
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
            chefLatitude,
            chefLongitude,
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

      // ✅ Get all carts with delivery fee calculation
      getAllCartsWithDelivery: () => {
        const { carts, userLatitude, userLongitude, deliverySettings, chefStatuses } = get();
        
        return carts.map((cart) => {
          const subtotal = cart.items.reduce((total, item) => total + item.price * item.quantity, 0);
          
          // Calculate distance and delivery fee (all dynamic from admin settings)
          let distance: number | undefined;
          let deliveryFee = 0; // Will be calculated from admin settings
          let freeDeliveryEligible = false;
          let amountForFreeDelivery: number | undefined;
          let deliveryRangeName: string | undefined;

          if (userLatitude && userLongitude && cart.chefLatitude && cart.chefLongitude) {
            // Calculate distance using shared utility
            distance = calculateDistance(
              userLatitude,
              userLongitude,
              cart.chefLatitude,
              cart.chefLongitude
            );

            // Calculate delivery fee using shared utility with admin settings
            const deliveryCalc = calculateDelivery(distance, subtotal, deliverySettings);
            deliveryFee = deliveryCalc.deliveryFee;
            freeDeliveryEligible = deliveryCalc.freeDeliveryEligible;
            amountForFreeDelivery = deliveryCalc.amountForFreeDelivery;
            deliveryRangeName = deliveryCalc.deliveryRangeName;
          } else {
            // No location data available
            deliveryRangeName = "Location required for delivery fee";
          }

          // Get chef active status from Record (default to true if not found)
          const chefIsActive = cart.chefId in chefStatuses ? chefStatuses[cart.chefId] : true;

          return {
            ...cart,
            total: subtotal,
            deliveryFee,
            distance,
            freeDeliveryEligible,
            amountForFreeDelivery,
            deliveryRangeName,
            chefIsActive,
          };
        });
      },
    }),
    {
      name: "cart-storage", // persistent cart in localStorage
    }
  )
);
