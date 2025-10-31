import { type Category, type InsertCategory, type Product, type InsertProduct, type Order, type InsertOrder, type User, type UpsertUser, type Chef } from "@shared/schema";
import { randomUUID } from "crypto";
import { nanoid } from "nanoid";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  getAllCategories(): Promise<Category[]>;
  getCategoryById(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;

  getAllProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | undefined>;
  getProductsByCategoryId(categoryId: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;

  createOrder(order: InsertOrder): Promise<Order>;
  getOrderById(id: string): Promise<Order | undefined>;

  getChefs(): Promise<Chef[]>;
  getChefsByCategory(categoryId: string): Promise<Chef[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private categories: Map<string, Category>;
  private chefs: Chef[]; // Changed from private products to private chefs
  private products: Map<string, Product>;
  private orders: Map<string, Order>;

  constructor() {
    this.users = new Map();
    this.categories = new Map();
    this.chefs = []; // Initialize chefs array
    this.products = new Map();
    this.orders = new Map();
    this.seedData();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existing = this.users.get(userData.id!);
    const user: User = {
      id: userData.id!,
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      createdAt: existing?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  private seedData() {
    const rotiCategoryId = randomUUID();
    const mealCategoryId = randomUUID();
    const hotelCategoryId = randomUUID();

    const categoriesData: InsertCategory[] = [
      {
        name: "Fresh Rotis & Breads",
        description: "Tandoori rotis, naan, and more freshly baked",
        itemCount: "20+ varieties",
        image: "/assets/generated_images/Fresh_tandoori_rotis_stack_1dcda2c7.png",
        iconName: "UtensilsCrossed",
      },
      {
        name: "Lunch & Dinner",
        description: "Complete meals with rice, curry, and sides",
        itemCount: "50+ dishes",
        image: "/assets/generated_images/Complete_Indian_thali_meal_837cc17d.png",
        iconName: "ChefHat",
      },
      {
        name: "Hotel Specials",
        description: "Restaurant quality dishes delivered to you",
        itemCount: "30+ partners",
        image: "/assets/generated_images/Fine_dining_restaurant_setup_1724ed85.png",
        iconName: "Hotel",
      },
    ];

    const categoryIds = [rotiCategoryId, mealCategoryId, hotelCategoryId];
    categoriesData.forEach((cat, index) => {
      const category: Category = { ...cat, id: categoryIds[index] };
      this.categories.set(category.id, category);
    });

    // Initialize chefs/hotels
    const chefs: Omit<Chef, "id">[] = [
      {
        name: "Raju's Tandoor Kitchen",
        description: "Authentic tandoori rotis made fresh",
        image: "/assets/generated_images/Fresh_tandoori_rotis_stack_1dcda2c7.png",
        rating: "4.8",
        reviewCount: 245,
        categoryId: rotiCategoryId,
      },
      {
        name: "Mumbai Roti House",
        description: "Traditional rotis and parathas",
        image: "/assets/generated_images/Fresh_tandoori_rotis_stack_1dcda2c7.png",
        rating: "4.6",
        reviewCount: 189,
        categoryId: rotiCategoryId,
      },
      {
        name: "Home Kitchen by Meera",
        description: "Home-style complete meals",
        image: "/assets/generated_images/Complete_Indian_thali_meal_837cc17d.png",
        rating: "4.7",
        reviewCount: 312,
        categoryId: mealCategoryId,
      },
      {
        name: "Annapurna Tiffin Service",
        description: "Daily fresh lunch and dinner",
        image: "/assets/generated_images/Complete_Indian_thali_meal_837cc17d.png",
        rating: "4.5",
        reviewCount: 198,
        categoryId: mealCategoryId,
      },
      {
        name: "Taj Fine Dining",
        description: "Premium restaurant experience",
        image: "/assets/generated_images/Fine_dining_restaurant_setup_1724ed85.png",
        rating: "4.9",
        reviewCount: 456,
        categoryId: hotelCategoryId,
      },
      {
        name: "Royal Palace Restaurant",
        description: "Royal Indian cuisine",
        image: "/assets/generated_images/Fine_dining_restaurant_setup_1724ed85.png",
        rating: "4.7",
        reviewCount: 378,
        categoryId: hotelCategoryId,
      },
    ];

    this.chefs = chefs.map(chef => ({
      ...chef,
      id: nanoid(),
    }));

    const chefsByCategory = {
      [rotiCategoryId]: this.chefs.filter(c => c.categoryId === rotiCategoryId),
      [mealCategoryId]: this.chefs.filter(c => c.categoryId === mealCategoryId),
      [hotelCategoryId]: this.chefs.filter(c => c.categoryId === hotelCategoryId),
    };

    const productsData: InsertProduct[] = [
      {
        name: "Butter Naan",
        description: "Soft and buttery Indian flatbread",
        price: 40,
        image: "/assets/generated_images/Fresh_tandoori_rotis_stack_1dcda2c7.png",
        rating: "4.5",
        reviewCount: 128,
        isVeg: true,
        isCustomizable: false,
        categoryId: rotiCategoryId,
        chefId: chefsByCategory[rotiCategoryId][0]?.id,
      },
      {
        name: "Tandoori Roti",
        description: "Whole wheat bread cooked in tandoor",
        price: 20,
        image: "/assets/generated_images/Fresh_tandoori_rotis_stack_1dcda2c7.png",
        rating: "4.6",
        reviewCount: 245,
        isVeg: true,
        isCustomizable: false,
        categoryId: rotiCategoryId,
        chefId: chefsByCategory[rotiCategoryId][0]?.id,
      },
      {
        name: "Garlic Naan",
        description: "Naan topped with fresh garlic and butter",
        price: 50,
        image: "/assets/generated_images/Fresh_tandoori_rotis_stack_1dcda2c7.png",
        rating: "4.7",
        reviewCount: 189,
        isVeg: true,
        isCustomizable: false,
        categoryId: rotiCategoryId,
        chefId: chefsByCategory[rotiCategoryId][1]?.id,
      },
      {
        name: "Aloo Paratha",
        description: "Stuffed flatbread with spiced potato filling",
        price: 60,
        image: "/assets/generated_images/Fresh_tandoori_rotis_stack_1dcda2c7.png",
        rating: "4.4",
        reviewCount: 167,
        isVeg: true,
        isCustomizable: true,
        categoryId: rotiCategoryId,
        chefId: chefsByCategory[rotiCategoryId][1]?.id,
      },
      {
        name: "North Indian Thali",
        description: "Complete meal with dal, sabzi, roti, rice and dessert",
        price: 180,
        image: "/assets/generated_images/Complete_Indian_thali_meal_837cc17d.png",
        rating: "4.8",
        reviewCount: 234,
        isVeg: true,
        isCustomizable: true,
        categoryId: mealCategoryId,
        chefId: chefsByCategory[mealCategoryId][0]?.id,
      },
      {
        name: "Rajasthani Thali",
        description: "Traditional Rajasthani meal with dal baati churma and more",
        price: 220,
        image: "/assets/generated_images/Complete_Indian_thali_meal_837cc17d.png",
        rating: "4.6",
        reviewCount: 89,
        isVeg: true,
        isCustomizable: false,
        categoryId: mealCategoryId,
        chefId: chefsByCategory[mealCategoryId][0]?.id,
      },
      {
        name: "South Indian Meal",
        description: "Rice, sambar, rasam, vegetables and curd",
        price: 150,
        image: "/assets/generated_images/Complete_Indian_thali_meal_837cc17d.png",
        rating: "4.7",
        reviewCount: 142,
        isVeg: true,
        isCustomizable: true,
        categoryId: mealCategoryId,
        chefId: chefsByCategory[mealCategoryId][1]?.id,
      },
      {
        name: "Paneer Tikka",
        description: "Grilled cottage cheese marinated in Indian spices",
        price: 220,
        image: "/assets/generated_images/Fine_dining_restaurant_setup_1724ed85.png",
        rating: "4.6",
        reviewCount: 156,
        isVeg: true,
        isCustomizable: true,
        categoryId: hotelCategoryId,
        chefId: chefsByCategory[hotelCategoryId][0]?.id,
      },
      {
        name: "Butter Chicken",
        description: "Tender chicken in creamy tomato-based curry",
        price: 280,
        image: "/assets/generated_images/Fine_dining_restaurant_setup_1724ed85.png",
        rating: "4.9",
        reviewCount: 312,
        isVeg: false,
        isCustomizable: true,
        categoryId: hotelCategoryId,
        chefId: chefsByCategory[hotelCategoryId][0]?.id,
      },
      {
        name: "Biryani Special",
        description: "Aromatic basmati rice with spices and your choice of protein",
        price: 250,
        image: "/assets/generated_images/Fine_dining_restaurant_setup_1724ed85.png",
        rating: "4.8",
        reviewCount: 278,
        isVeg: false,
        isCustomizable: true,
        categoryId: hotelCategoryId,
        chefId: chefsByCategory[hotelCategoryId][1]?.id,
      },
    ];

    productsData.forEach((prod) => {
      const product: Product = {
        ...prod,
        id: randomUUID(),
        rating: prod.rating || "4.5",
        reviewCount: prod.reviewCount || 0,
        isVeg: prod.isVeg !== undefined ? prod.isVeg : true,
        isCustomizable: prod.isCustomizable !== undefined ? prod.isCustomizable : false,
      };
      this.products.set(product.id, product);
    });
  }

  async getAllCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async getCategoryById(id: string): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = randomUUID();
    const category: Category = { ...insertCategory, id };
    this.categories.set(id, category);
    return category;
  }

  async getAllProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProductById(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getProductsByCategoryId(categoryId: string): Promise<Product[]> {
    return Array.from(this.products.values()).filter(
      (product) => product.categoryId === categoryId
    );
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = randomUUID();
    const product: Product = {
      ...insertProduct,
      id,
      rating: insertProduct.rating || "4.5",
      reviewCount: insertProduct.reviewCount || 0,
      isVeg: insertProduct.isVeg !== undefined ? insertProduct.isVeg : true,
      isCustomizable: insertProduct.isCustomizable !== undefined ? insertProduct.isCustomizable : false,
    };
    this.products.set(id, product);
    return product;
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = randomUUID();
    const order: Order = {
      ...insertOrder,
      id,
      status: insertOrder.status || "pending",
      createdAt: new Date(),
    };
    this.orders.set(id, order);
    return order;
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getChefs(): Promise<Chef[]> {
    return this.chefs;
  }

  async getChefsByCategory(categoryId: string): Promise<Chef[]> {
    return this.chefs.filter(chef => chef.categoryId === categoryId);
  }
}

export const storage = new MemStorage();