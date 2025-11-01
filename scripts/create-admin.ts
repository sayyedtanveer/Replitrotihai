import { storage } from "../server/storage";
import { hashPassword } from "../server/adminAuth";

async function createDefaultAdmin() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const email = process.env.ADMIN_EMAIL || "admin@foodexpress.com";

  try {
    const existingAdmin = await storage.getAdminByUsername(username);
    if (existingAdmin) {
      console.log("Admin user already exists!");
      return;
    }

    const passwordHash = await hashPassword(password);
    const admin = await storage.createAdmin({
      username,
      email,
      role: "super_admin",
      password,
      passwordHash,
    });

    console.log("Default admin user created successfully!");
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    console.log(`Role: ${admin.role}`);
    console.log("\nPlease change the default password after first login.");
  } catch (error) {
    console.error("Failed to create admin user:", error);
  }
}

createDefaultAdmin();
