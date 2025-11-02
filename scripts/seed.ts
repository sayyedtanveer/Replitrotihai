import { db, categories, products, chefs, adminUsers } from '../shared/db';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

async function seed() {
  console.log('Seeding database...');

  // Create categories
  const rotiCategory = {
    id: nanoid(),
    name: 'Rotis & Breads',
    description: 'Fresh hand-made rotis and breads delivered daily',
    image: 'https://images.unsplash.com/photo-1619740455993-557c1a0b69c3?w=800',
    iconName: 'UtensilsCrossed',
    itemCount: '15+',
  };

  const lunchDinnerCategory = {
    id: nanoid(),
    name: 'Lunch & Dinner',
    description: 'Complete meals prepared by expert chefs',
    image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800',
    iconName: 'ChefHat',
    itemCount: '25+',
  };

  const restaurantCategory = {
    id: nanoid(),
    name: 'Hotel Specials',
    description: 'Restaurant-quality dishes from local hotels',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
    iconName: 'Hotel',
    itemCount: '30+',
  };

  await db.insert(categories).values([rotiCategory, lunchDinnerCategory, restaurantCategory]);
  console.log('Categories created');

  // Create chefs
  const roticChef = {
    id: nanoid(),
    name: 'Roti Wala',
    description: 'Specializing in traditional rotis and parathas',
    image: 'https://images.unsplash.com/photo-1583394293214-28ded15ee548?w=400',
    rating: '4.8',
    reviewCount: 245,
    categoryId: rotiCategory.id,
  };

  const mealChef = {
    id: nanoid(),
    name: 'Ghar Jaisa Khana',
    description: 'Homestyle cooking with authentic flavors',
    image: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400',
    rating: '4.9',
    reviewCount: 312,
    categoryId: lunchDinnerCategory.id,
  };

  const hotelChef = {
    id: nanoid(),
    name: 'Hotel Specials Kitchen',
    description: 'Premium restaurant-quality meals',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400',
    rating: '4.7',
    reviewCount: 189,
    categoryId: restaurantCategory.id,
  };

  await db.insert(chefs).values([roticChef, mealChef, hotelChef]);
  console.log('Chefs created');

  // Create products
  const rotiProducts = [
    {
      id: nanoid(),
      name: 'Butter Roti',
      description: 'Soft butter roti made fresh',
      price: 8,
      image: 'https://images.unsplash.com/photo-1619740455993-557c1a0b69c3?w=400',
      rating: '4.5',
      reviewCount: 120,
      isVeg: true,
      isCustomizable: false,
      categoryId: rotiCategory.id,
      chefId: roticChef.id,
    },
    {
      id: nanoid(),
      name: 'Tandoori Roti',
      description: 'Traditional tandoor-baked roti',
      price: 10,
      image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400',
      rating: '4.7',
      reviewCount: 98,
      isVeg: true,
      isCustomizable: false,
      categoryId: rotiCategory.id,
      chefId: roticChef.id,
    },
    {
      id: nanoid(),
      name: 'Aloo Paratha',
      description: 'Stuffed potato paratha with butter',
      price: 25,
      image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400',
      rating: '4.8',
      reviewCount: 156,
      isVeg: true,
      isCustomizable: true,
      categoryId: rotiCategory.id,
      chefId: roticChef.id,
    },
    {
      id: nanoid(),
      name: 'Paneer Paratha',
      description: 'Fresh paneer stuffed paratha',
      price: 30,
      image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400',
      rating: '4.6',
      reviewCount: 87,
      isVeg: true,
      isCustomizable: true,
      categoryId: rotiCategory.id,
      chefId: roticChef.id,
    },
  ];

  const lunchProducts = [
    {
      id: nanoid(),
      name: 'Dal Tadka',
      description: 'Yellow lentils tempered with spices',
      price: 80,
      image: 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=400',
      rating: '4.7',
      reviewCount: 245,
      isVeg: true,
      isCustomizable: false,
      categoryId: lunchDinnerCategory.id,
      chefId: mealChef.id,
    },
    {
      id: nanoid(),
      name: 'Paneer Butter Masala',
      description: 'Rich and creamy paneer curry',
      price: 140,
      image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400',
      rating: '4.9',
      reviewCount: 312,
      isVeg: true,
      isCustomizable: true,
      categoryId: lunchDinnerCategory.id,
      chefId: mealChef.id,
    },
    {
      id: nanoid(),
      name: 'Chicken Curry',
      description: 'Tender chicken in spicy gravy',
      price: 160,
      image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400',
      rating: '4.8',
      reviewCount: 198,
      isVeg: false,
      isCustomizable: true,
      categoryId: lunchDinnerCategory.id,
      chefId: mealChef.id,
    },
    {
      id: nanoid(),
      name: 'Jeera Rice',
      description: 'Fragrant cumin rice',
      price: 60,
      image: 'https://images.unsplash.com/photo-1596560548464-f010549b84d7?w=400',
      rating: '4.5',
      reviewCount: 145,
      isVeg: true,
      isCustomizable: false,
      categoryId: lunchDinnerCategory.id,
      chefId: mealChef.id,
    },
  ];

  const hotelProducts = [
    {
      id: nanoid(),
      name: 'Biryani',
      description: 'Fragrant rice with tender meat and spices',
      price: 180,
      image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400',
      rating: '4.9',
      reviewCount: 425,
      isVeg: false,
      isCustomizable: true,
      categoryId: restaurantCategory.id,
      chefId: hotelChef.id,
    },
    {
      id: nanoid(),
      name: 'Butter Chicken',
      description: 'Classic butter chicken in rich tomato gravy',
      price: 200,
      image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400',
      rating: '4.8',
      reviewCount: 367,
      isVeg: false,
      isCustomizable: true,
      categoryId: restaurantCategory.id,
      chefId: hotelChef.id,
    },
    {
      id: nanoid(),
      name: 'Tandoori Chicken',
      description: 'Marinated chicken grilled in tandoor',
      price: 220,
      image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400',
      rating: '4.7',
      reviewCount: 289,
      isVeg: false,
      isCustomizable: false,
      categoryId: restaurantCategory.id,
      chefId: hotelChef.id,
    },
    {
      id: nanoid(),
      name: 'Naan',
      description: 'Butter-brushed tandoori naan',
      price: 15,
      image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400',
      rating: '4.6',
      reviewCount: 178,
      isVeg: true,
      isCustomizable: false,
      categoryId: restaurantCategory.id,
      chefId: hotelChef.id,
    },
  ];

  await db.insert(products).values([...rotiProducts, ...lunchProducts, ...hotelProducts]);
  console.log('Products created');

  // Create default admin user
  const passwordHash = await bcrypt.hash('admin123', 10);
  await db.insert(adminUsers).values({
    id: nanoid(),
    username: 'admin',
    email: 'admin@rotihai.com',
    passwordHash,
    role: 'super_admin',
  });
  console.log('Default admin user created (username: admin, password: admin123)');

  console.log('Seeding completed!');
  process.exit(0);
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
