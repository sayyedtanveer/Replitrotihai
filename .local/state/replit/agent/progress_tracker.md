[x] 1. Install the required packages
[x] 2. Restart the workflow to see if the project is working
[x] 3. Verify the project is working using the feedback tool
[x] 4. Inform user the import is completed and they can start building, mark the import as completed using the complete_project_import tool
[x] 5. Implementing admin panel with JWT authentication
  - [x] Database schema with admin_users table and role enum
  - [x] JWT authentication with refresh tokens
  - [x] Admin API routes for all CRUD operations
  - [x] Dashboard with metrics (user count, order count, revenue, etc.)
  - [x] Management pages for products, categories, orders, users, chefs
  - [x] Role-based access control (super_admin, manager, viewer)
  - [x] Admin guard for protected routes
  - [x] Automatic token refresh on expiry
  - [x] Default admin user created (username: admin, password: admin123)
[x] 6. Fixed admin login and implemented guest browsing
  - [x] Admin login now working with default credentials (username: admin, password: admin123)
  - [x] Guest users can browse products without logging in
  - [x] Checkout flow collects customer info (name, phone, optional email, address)
  - [x] Fixed security issue: No plaintext credentials in logs
  - [x] Simplified checkout - removed incomplete account creation feature
[x] 7. Completed project import migration
  - [x] Workflow configured with webview output on port 5000
  - [x] Server running successfully
  - [x] Homepage verified and loading correctly
  - [x] All tasks marked as complete
[x] 8. Final migration completion (Nov 4, 2025)
  - [x] PostgreSQL database provisioned
  - [x] Database schema pushed successfully
  - [x] Default admin user created successfully
  - [x] Workflow restarted and verified working
  - [x] Homepage loading correctly with location selector
  - [x] All API endpoints responding correctly
  - [x] Project ready for use