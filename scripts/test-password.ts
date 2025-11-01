
import bcrypt from "bcryptjs";

async function testPassword() {
  const password = "admin123";
  const hash = await bcrypt.hash(password, 10);
  console.log("Generated hash:", hash);
  
  const isValid = await bcrypt.compare(password, hash);
  console.log("Password verification:", isValid);
  
  // Test with the actual admin password hash from database
  const { storage } = await import("../server/storage");
  const admin = await storage.getAdminByUsername("admin");
  
  if (admin) {
    console.log("\nAdmin found in database");
    console.log("Stored hash:", admin.passwordHash);
    const isStoredValid = await bcrypt.compare(password, admin.passwordHash);
    console.log("Stored password verification:", isStoredValid);
  } else {
    console.log("No admin found in database");
  }
}

testPassword();
