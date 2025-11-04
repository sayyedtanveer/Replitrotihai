
import { db, categories, products, chefs, adminUsers, subscriptionPlans } from "@shared/db";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Starting database seeding...");

  // Seed Categories
  console.log("Seeding categories...");
  const categoriesData = [
    {
      id: "cat1",
      name: "Rotis",
      description: "Fresh rotis made daily",
      image: "/attached_assets/seed_images/roti-category.jpg",
      iconName: "🫓",
      itemCount: "12",
    },
    {
      id: "cat2",
      name: "Lunch & Dinner",
      description: "Complete meals for your family",
      image: "/attached_assets/seed_images/lunch-dinner-category.jpg",
      iconName: "🍛",
      itemCount: "25",
    },
    {
      id: "cat3",
      name: "Hotel Specials",
      description: "Restaurant style dishes",
      image: "/attached_assets/seed_images/hotel-specials-category.jpg",
      iconName: "⭐",
      itemCount: "18",
    },
  ];

  await db.insert(categories).values(categoriesData).onConflictDoNothing();

  // Seed Chefs
  console.log("Seeding chefs...");
  const chefsData = [
    {
      id: "chef1",
      name: "Ramesh's Kitchen",
      description: "Traditional home-style rotis",
      categoryId: "cat1",
      rating: "4.8",
      reviewCount: 152,
      image: "/attached_assets/seed_images/chef-ramesh.jpg",
    },
    {
      id: "chef2",
      name: "Anita's Meals",
      description: "Complete lunch and dinner meals",
      categoryId: "cat2",
      rating: "4.9",
      reviewCount: 203,
      image: "/attached_assets/seed_images/chef-anita.jpg",
    },
    {
      id: "chef3",
      name: "Kurla Tandoor",
      description: "Restaurant quality tandoori",
      categoryId: "cat3",
      rating: "4.7",
      reviewCount: 98,
      image: "/attached_assets/seed_images/chef-kurla.jpg",
    },
  ];

  await db.insert(chefs).values(chefsData).onConflictDoNothing();

  // Seed Products
  console.log("Seeding products...");
  const productsData = [
    {
      id: "prod1",
      name: "Butter Roti",
      description: "Soft butter roti made with whole wheat",
      price: 8,
      categoryId: "cat1",
      chefId: "chef1",
      image: "/attached_assets/seed_images/roti-category.jpg",
      rating: "4.8",
      reviewCount: 45,
      isVeg: true,
      isCustomizable: false,
    },
    {
      id: "prod2",
      name: "Tandoori Roti",
      description: "Traditional tandoori roti",
      price: 10,
      categoryId: "cat1",
      chefId: "chef1",
      image: "/attached_assets/seed_images/tandoori-roti.jpg",
      rating: "4.7",
      reviewCount: 38,
      isVeg: true,
      isCustomizable: false,
    },
    {
      id: "prod3",
      name: "Dal Chawal Combo",
      description: "Yellow dal with steamed rice",
      price: 80,
      categoryId: "cat2",
      chefId: "chef2",
      image: "/attached_assets/seed_images/lunch-dinner-category.jpg",
      rating: "4.9",
      reviewCount: 92,
      isVeg: true,
      isCustomizable: true,
    },
    {
      id: "prod4",
      name: "Rajma Rice",
      description: "Kidney beans curry with rice",
      price: 90,
      categoryId: "cat2",
      chefId: "chef2",
      image: "/attached_assets/seed_images/hotel-specials-category.jpg",
      rating: "4.8",
      reviewCount: 76,
      isVeg: true,
      isCustomizable: true,
    },
    {
      id: "prod5",
      name: "Paneer Butter Masala",
      description: "Cottage cheese in rich tomato gravy",
      price: 150,
      categoryId: "cat3",
      chefId: "chef3",
      image: "/attached_assets/seed_images/paneer-butter-masala.jpg",
      rating: "4.9",
      reviewCount: 134,
      isVeg: true,
      isCustomizable: true,
    },
    {
      id: "prod6",
      name: "Butter Chicken",
      description: "Tandoori chicken in creamy tomato sauce",
      price: 180,
      categoryId: "cat3",
      chefId: "chef3",
      image: "/attached_assets/seed_images/butter-chicken.jpg",
      rating: "4.8",
      reviewCount: 112,
      isVeg: false,
      isCustomizable: true,
    },
  ];

  await db.insert(products).values(productsData).onConflictDoNothing();

  // Seed Admin User
  console.log("Seeding admin user...");
  const passwordHash = await bcrypt.hash("admin123", 10);
  await db.insert(adminUsers).values({
    id: "admin1",
    username: "admin",
    email: "admin@rotihai.com",
    passwordHash,
    role: "super_admin",
  }).onConflictDoNothing();

  // Seed Subscription Plans
  console.log("Seeding subscription plans...");
  const plansData = [
    {
      id: "plan1",
      name: "Daily Roti Pack",
      description: "10 fresh rotis delivered daily",
      categoryId: "cat1",
      frequency: "daily" as const,
      price: 200,
      deliveryDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
      items: [{ productId: "prod1", quantity: 10 }],
      isActive: true,
    },
    {
      id: "plan2",
      name: "Weekly Meal Plan",
      description: "Complete meals for a week",
      categoryId: "cat2",
      frequency: "weekly" as const,
      price: 1200,
      deliveryDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
      items: [
        { productId: "prod3", quantity: 4 },
        { productId: "prod4", quantity: 3 },
      ],
      isActive: true,
    },
    {
      id: "plan3",
      name: "Monthly Premium",
      description: "Premium meal plan for a month",
      categoryId: "cat3",
      frequency: "monthly" as const,
      price: 4500,
      deliveryDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
      items: [
        { productId: "prod5", quantity: 10 },
        { productId: "prod6", quantity: 8 },
      ],
      isActive: true,
    },
  ];

  await db.insert(subscriptionPlans).values(plansData).onConflictDoNothing();

  // Seed Sample Orders for Payment Testing
  console.log("Seeding sample orders...");
  const { orders } = await import("@shared/db");
  const ordersData = [
    {
      id: "order1",
      customerName: "Rahul Sharma",
      phone: "+91 98765 43210",
      email: "rahul@example.com",
      address: "123 MG Road, Kurla West, Mumbai - 400070",
      items: [
        { id: "prod1", name: "Butter Roti", price: 8, quantity: 10, image: "/attached_assets/seed_images/roti-category.jpg" },
        { id: "prod2", name: "Tandoori Roti", price: 10, quantity: 5, image: "/attached_assets/seed_images/tandoori-roti.jpg" }
      ],
      subtotal: 130,
      deliveryFee: 40,
      total: 170,
      status: "pending",
      paymentStatus: "pending" as const,
      paymentQrShown: true,
      chefId: "chef1",
      createdAt: new Date(),
    },
    {
      id: "order2",
      customerName: "Priya Patel",
      phone: "+91 87654 32109",
      email: "priya@example.com",
      address: "456 LBS Marg, Kurla East, Mumbai - 400024",
      items: [
        { id: "prod3", name: "Dal Chawal Combo", price: 80, quantity: 2, image: "/attached_assets/seed_images/lunch-dinner-category.jpg" },
        { id: "prod4", name: "Rajma Rice", price: 90, quantity: 1, image: "/attached_assets/seed_images/hotel-specials-category.jpg" }
      ],
      subtotal: 250,
      deliveryFee: 60,
      total: 310,
      status: "pending",
      paymentStatus: "paid" as const,
      paymentQrShown: true,
      chefId: "chef2",
      createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    },
    {
      id: "order3",
      customerName: "Amit Kumar",
      phone: "+91 76543 21098",
      email: "amit@example.com",
      address: "789 CST Road, Kurla, Mumbai - 400098",
      items: [
        { id: "prod5", name: "Paneer Butter Masala", price: 150, quantity: 1, image: "/attached_assets/seed_images/paneer-butter-masala.jpg" },
        { id: "prod1", name: "Butter Roti", price: 8, quantity: 6, image: "/attached_assets/seed_images/roti-category.jpg" }
      ],
      subtotal: 198,
      deliveryFee: 40,
      total: 238,
      status: "pending",
      paymentStatus: "pending" as const,
      paymentQrShown: true,
      chefId: "chef3",
      createdAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    }
  ];

  await db.insert(orders).values(ordersData).onConflictDoNothing();

  // Seed Delivery Settings
  console.log("Seeding delivery settings...");
  const { deliverySettings } = await import("@shared/db");
  const deliverySettingsData = [
    {
      id: "ds1",
      name: "Local Area (0-3 km)",
      minDistance: "0",
      maxDistance: "3",
      price: 40,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "ds2",
      name: "Extended Area (3-5 km)",
      minDistance: "3",
      maxDistance: "5",
      price: 60,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "ds3",
      name: "Far Area (5-10 km)",
      minDistance: "5",
      maxDistance: "10",
      price: 100,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "ds4",
      name: "Very Far (10-15 km)",
      minDistance: "10",
      maxDistance: "15",
      price: 150,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  ];

  await db.insert(deliverySettings).values(deliverySettingsData).onConflictDoNothing();

  console.log("Database seeding completed!");
}

seed()
  .then(() => {
    console.log("Seed completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
