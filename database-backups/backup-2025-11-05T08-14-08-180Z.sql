-- Database Backup Generated: 2025-11-05T08:14:08.185Z
-- PostgreSQL Database Dump


-- Data for table: categories
DELETE FROM categories;
INSERT INTO categories (id, name, description, image, icon_name, item_count) VALUES ('cat1', 'Rotis', 'Fresh rotis made daily', '/attached_assets/seed_images/roti-category.jpg', '🫓', '12') ON CONFLICT DO NOTHING;
INSERT INTO categories (id, name, description, image, icon_name, item_count) VALUES ('cat2', 'Lunch & Dinner', 'Complete meals for your family', '/attached_assets/seed_images/lunch-dinner-category.jpg', '🍛', '25') ON CONFLICT DO NOTHING;
INSERT INTO categories (id, name, description, image, icon_name, item_count) VALUES ('cat3', 'Hotel Specials', 'Restaurant style dishes', '/attached_assets/seed_images/hotel-specials-category.jpg', '⭐', '18') ON CONFLICT DO NOTHING;

-- Data for table: chefs
DELETE FROM chefs;
INSERT INTO chefs (id, name, description, image, rating, review_count, category_id) VALUES ('chef1', 'Ramesh''s Kitchen', 'Traditional home-style rotis', '/attached_assets/seed_images/chef-ramesh.jpg', '4.8', 152, 'cat1') ON CONFLICT DO NOTHING;
INSERT INTO chefs (id, name, description, image, rating, review_count, category_id) VALUES ('chef2', 'Anita''s Meals', 'Complete lunch and dinner meals', '/attached_assets/seed_images/chef-anita.jpg', '4.9', 203, 'cat2') ON CONFLICT DO NOTHING;
INSERT INTO chefs (id, name, description, image, rating, review_count, category_id) VALUES ('chef3', 'Kurla Tandoor', 'Restaurant quality tandoori', '/attached_assets/seed_images/chef-kurla.jpg', '4.7', 98, 'cat3') ON CONFLICT DO NOTHING;

-- Data for table: products
DELETE FROM products;
INSERT INTO products (id, name, description, price, image, rating, review_count, is_veg, is_customizable, category_id, chef_id, stock_quantity, low_stock_threshold, is_available) VALUES ('prod1', 'Butter Roti', 'Soft butter roti made with whole wheat', 8, '/attached_assets/seed_images/roti-category.jpg', '4.8', 45, false, false, 'cat1', 'chef1', 100, 20, false) ON CONFLICT DO NOTHING;
INSERT INTO products (id, name, description, price, image, rating, review_count, is_veg, is_customizable, category_id, chef_id, stock_quantity, low_stock_threshold, is_available) VALUES ('prod2', 'Tandoori Roti', 'Traditional tandoori roti', 10, '/attached_assets/seed_images/tandoori-roti.jpg', '4.7', 38, false, false, 'cat1', 'chef1', 100, 20, false) ON CONFLICT DO NOTHING;
INSERT INTO products (id, name, description, price, image, rating, review_count, is_veg, is_customizable, category_id, chef_id, stock_quantity, low_stock_threshold, is_available) VALUES ('prod3', 'Dal Chawal Combo', 'Yellow dal with steamed rice', 80, '/attached_assets/seed_images/lunch-dinner-category.jpg', '4.9', 92, false, false, 'cat2', 'chef2', 100, 20, false) ON CONFLICT DO NOTHING;
INSERT INTO products (id, name, description, price, image, rating, review_count, is_veg, is_customizable, category_id, chef_id, stock_quantity, low_stock_threshold, is_available) VALUES ('prod4', 'Rajma Rice', 'Kidney beans curry with rice', 90, '/attached_assets/seed_images/hotel-specials-category.jpg', '4.8', 76, false, false, 'cat2', 'chef2', 100, 20, false) ON CONFLICT DO NOTHING;
INSERT INTO products (id, name, description, price, image, rating, review_count, is_veg, is_customizable, category_id, chef_id, stock_quantity, low_stock_threshold, is_available) VALUES ('prod5', 'Paneer Butter Masala', 'Cottage cheese in rich tomato gravy', 150, '/attached_assets/seed_images/paneer-butter-masala.jpg', '4.9', 134, false, false, 'cat3', 'chef3', 100, 20, false) ON CONFLICT DO NOTHING;
INSERT INTO products (id, name, description, price, image, rating, review_count, is_veg, is_customizable, category_id, chef_id, stock_quantity, low_stock_threshold, is_available) VALUES ('prod6', 'Butter Chicken', 'Tandoori chicken in creamy tomato sauce', 180, '/attached_assets/seed_images/butter-chicken.jpg', '4.8', 112, false, false, 'cat3', 'chef3', 100, 20, false) ON CONFLICT DO NOTHING;

-- Data for table: admin_users
DELETE FROM admin_users;
INSERT INTO admin_users (id, username, email, password_hash, role, last_login_at, created_at) VALUES ('admin1', 'admin', 'admin@rotihai.com', '$2b$10$cn4p1pGO83hOgNkNzuCxq.DbhHnEIZpj3T15g6aqDdpLeElD98M6m', 'super_admin', '2025-11-05T08:12:16.324Z', '2025-11-05T08:06:43.333887Z') ON CONFLICT DO NOTHING;

-- Data for table: subscription_plans
DELETE FROM subscription_plans;
INSERT INTO subscription_plans (id, name, description, category_id, frequency, price, delivery_days, items, is_active, created_at, updated_at) VALUES ('plan1', 'Daily Roti Pack', '10 fresh rotis delivered daily', 'cat1', 'daily', 200, '["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]', '[{"productId":"prod1","quantity":10}]', false, '2025-11-05T08:06:43.351591Z', '2025-11-05T08:06:43.351591Z') ON CONFLICT DO NOTHING;
INSERT INTO subscription_plans (id, name, description, category_id, frequency, price, delivery_days, items, is_active, created_at, updated_at) VALUES ('plan2', 'Weekly Meal Plan', 'Complete meals for a week', 'cat2', 'weekly', 1200, '["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]', '[{"productId":"prod3","quantity":4},{"productId":"prod4","quantity":3}]', false, '2025-11-05T08:06:43.351591Z', '2025-11-05T08:06:43.351591Z') ON CONFLICT DO NOTHING;
INSERT INTO subscription_plans (id, name, description, category_id, frequency, price, delivery_days, items, is_active, created_at, updated_at) VALUES ('plan3', 'Monthly Premium', 'Premium meal plan for a month', 'cat3', 'monthly', 4500, '["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]', '[{"productId":"prod5","quantity":10},{"productId":"prod6","quantity":8}]', false, '2025-11-05T08:06:43.351591Z', '2025-11-05T08:06:43.351591Z') ON CONFLICT DO NOTHING;

-- Data for table: orders
DELETE FROM orders;
INSERT INTO orders (id, customer_name, phone, email, address, items, subtotal, delivery_fee, total, status, payment_status, payment_qr_shown, chef_id, created_at, approved_by, approved_at, rejected_by, rejection_reason, assigned_to, assigned_at, picked_up_at, delivered_at) VALUES ('order2', 'Priya Patel', '+91 87654 32109', 'priya@example.com', '456 LBS Marg, Kurla East, Mumbai - 400024', '[{"id":"prod3","image":"/attached_assets/seed_images/lunch-dinner-category.jpg","name":"Dal Chawal Combo","price":80,"quantity":2},{"id":"prod4","image":"/attached_assets/seed_images/hotel-specials-category.jpg","name":"Rajma Rice","price":90,"quantity":1}]', 250, 60, 310, 'pending', 'confirmed', false, 'chef2', '2025-11-05T07:36:43.383Z', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO orders (id, customer_name, phone, email, address, items, subtotal, delivery_fee, total, status, payment_status, payment_qr_shown, chef_id, created_at, approved_by, approved_at, rejected_by, rejection_reason, assigned_to, assigned_at, picked_up_at, delivered_at) VALUES ('order3', 'Amit Kumar', '+91 76543 21098', 'amit@example.com', '789 CST Road, Kurla, Mumbai - 400098', '[{"id":"prod5","image":"/attached_assets/seed_images/paneer-butter-masala.jpg","name":"Paneer Butter Masala","price":150,"quantity":1},{"id":"prod1","image":"/attached_assets/seed_images/roti-category.jpg","name":"Butter Roti","price":8,"quantity":6}]', 198, 40, 238, 'confirmed', 'pending', false, 'chef3', '2025-11-05T07:06:43.383Z', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO orders (id, customer_name, phone, email, address, items, subtotal, delivery_fee, total, status, payment_status, payment_qr_shown, chef_id, created_at, approved_by, approved_at, rejected_by, rejection_reason, assigned_to, assigned_at, picked_up_at, delivered_at) VALUES ('order1', 'Rahul Sharma', '+91 98765 43210', 'rahul@example.com', '123 MG Road, Kurla West, Mumbai - 400070', '[{"id":"prod1","image":"/attached_assets/seed_images/roti-category.jpg","name":"Butter Roti","price":8,"quantity":10},{"id":"prod2","image":"/attached_assets/seed_images/tandoori-roti.jpg","name":"Tandoori Roti","price":10,"quantity":5}]', 130, 40, 170, 'completed', 'confirmed', false, 'chef1', '2025-11-05T08:06:43.383Z', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;

-- Data for table: delivery_settings
DELETE FROM delivery_settings;
INSERT INTO delivery_settings (id, name, min_distance, max_distance, price, is_active, created_at, updated_at) VALUES ('ds1', 'Local Area (0-3 km)', '0', '3', 40, false, '2025-11-05T08:06:43.41Z', '2025-11-05T08:06:43.41Z') ON CONFLICT DO NOTHING;
INSERT INTO delivery_settings (id, name, min_distance, max_distance, price, is_active, created_at, updated_at) VALUES ('ds2', 'Extended Area (3-5 km)', '3', '5', 60, false, '2025-11-05T08:06:43.41Z', '2025-11-05T08:06:43.41Z') ON CONFLICT DO NOTHING;
INSERT INTO delivery_settings (id, name, min_distance, max_distance, price, is_active, created_at, updated_at) VALUES ('ds3', 'Far Area (5-10 km)', '5', '10', 100, false, '2025-11-05T08:06:43.41Z', '2025-11-05T08:06:43.41Z') ON CONFLICT DO NOTHING;
INSERT INTO delivery_settings (id, name, min_distance, max_distance, price, is_active, created_at, updated_at) VALUES ('ds4', 'Very Far (10-15 km)', '10', '15', 150, false, '2025-11-05T08:06:43.41Z', '2025-11-05T08:06:43.41Z') ON CONFLICT DO NOTHING;
