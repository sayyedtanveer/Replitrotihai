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
      image: "https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=800&auto=format&fit=crop&q=80",
      iconName: "🫓",
      itemCount: "12",
    },
    {
      id: "cat2",
      name: "Lunch & Dinner",
      description: "Complete meals for your family",
      image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80",
      iconName: "🍛",
      itemCount: "25",
    },
    {
      id: "cat3",
      name: "Hotel Specials",
      description: "Restaurant style dishes",
      image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&auto=format&fit=crop&q=80",
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
      image: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400&auto=format&fit=crop&q=80",
    },
    {
      id: "chef2",
      name: "Anita's Meals",
      description: "Complete lunch and dinner meals",
      categoryId: "cat2",
      rating: "4.9",
      reviewCount: 203,
      image: "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=400&auto=format&fit=crop&q=80",
    },
    {
      id: "chef3",
      name: "Kurla Tandoor",
      description: "Restaurant quality tandoori",
      categoryId: "cat3",
      rating: "4.7",
      reviewCount: 98,
      image: "https://images.unsplash.com/photo-1564758866878-b75b9912d969?w=400&auto=format&fit=crop&q=80",
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
      image: "https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&auto=format&fit=crop&q=80",
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
      image: "https://images.unsplash.com/photo-1619365605616-b6ba40b19f3f?w=400&auto=format&fit=crop&q=80",
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
      image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80",
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
      image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&auto=format&fit=crop&q=80",
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
      image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&auto=format&fit=crop&q=80",
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
      image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&auto=format&fit=crop&q=80",
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
