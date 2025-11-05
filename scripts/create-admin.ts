
import { storage } from "../server/storage";
import { hashPassword } from "../server/adminAuth";

async function createDefaultAdmin() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const email = process.env.ADMIN_EMAIL || "admin@foodexpress.com";

  try {
    // First, ensure tables are initialized
    console.log("Checking database connection...");
    
    const existingAdmin = await storage.getAdminByUsername(username);
    if (existingAdmin) {
      console.log("Admin user already exists!");
      console.log(`Username: ${username}`);
      console.log(`Role: ${existingAdmin.role}`);
      return;
    }

    console.log("Creating new admin user...");
    const passwordHash = await hashPassword(password);
    const admin = await storage.createAdmin({
      username,
      email,
      role: "super_admin",
      passwordHash,
    });

    console.log("✓ Default admin user created successfully!");
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    console.log(`Role: ${admin.role}`);
    console.log("\nPlease change the default password after first login.");
  } catch (error) {
    console.error("Failed to create admin user:", error);
    console.error("\nPlease ensure:");
    console.error("1. Database connection is configured correctly");
    console.error("2. DATABASE_URL environment variable is set");
    console.error("3. Database tables have been created");
    process.exit(1);
  }
}

createDefaultAdmin();
