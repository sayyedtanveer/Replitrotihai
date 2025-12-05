RotiHai - Food Delivery Application Overview RotiHai is a full-stack food delivery web application that enables users to browse food items, manage a real-time cart, and place orders. It features authentication via Replit's OpenID Connect, a referral program with wallet rewards, and a responsive design for various devices. The project aims to capture a significant share of the food delivery market by offering a seamless and engaging user experience.

User Preferences Preferred communication style: Simple, everyday language.

System Architecture Technology Stack:

Frontend: React 18 with TypeScript, Vite, Wouter for routing, TanStack Query for server state, Tailwind CSS with shadcn/ui. Backend: Express.js on Node.js with TypeScript, session-based authentication using express-session. Design System:

Custom Tailwind CSS configuration with shadcn/ui (New York style), inspired by leading food delivery platforms. Consistent typography and spacing units. Responsive grid layouts for desktop, tablet, and mobile. Authentication & Authorization:

Customer Authentication: OpenID Connect via Replit using Passport.js, session management, protected routes, automatic token refresh. Admin Authentication: JWT-based system with username/password, bcrypt hashing, access and refresh tokens, httpOnly cookies, and role-based access control (super_admin, manager, viewer). Session Management: 7-day TTL, HTTP-only cookies, secure flag in production. Data Layer Architecture:

Schema Design: Drizzle ORM defining entities for Users, Admin Users, Categories, Products, Orders, Sessions, and Chefs. Storage Abstraction: IStorage interface with an in-memory MemStorage implementation for easy migration to PostgreSQL. API Architecture:

Customer API: Endpoints for user profiles, categories, products, orders, chefs, and delivery fee calculation. Admin API: Endpoints for admin login/logout, dashboard metrics, and comprehensive management of orders, products, categories, users, chefs, and admin accounts with role-based access control. Request/Response: JSON payloads, Zod validation, structured error responses, and request logging. State Management Strategy:

Server State: TanStack Query for data fetching, caching, and optimistic updates. Client State: React useState for local UI state and cart management. Authentication State: Custom useAuth hook for managing user authentication status. Component Architecture:

Page Components: Landing, Home, NotFound. Feature Components: Header, Hero, CategoryCard, ProductCard, CartSidebar, CheckoutDialog, MenuDrawer, Footer. UI Components: 40+ shadcn/ui components, consistent design tokens, dark mode support, and interactive effects. Admin Panel:

Comprehensive management interface with role-based access control. Features: Dashboard metrics, order management (status updates), product management (CRUD, images, categories), category management, user management, chef/restaurant management, and admin user management (super admin only). Security: JWT authentication, role-based authorization, secure session management, CSRF protection. External Dependencies Third-Party Services:

Replit Authentication Service: OIDC provider at https://replit.com/oidc for user identity. Database:

Drizzle ORM: Schema-first ORM with TypeScript support for PostgreSQL. Driver: @neondatabase/serverless for PostgreSQL connection. Environment: Requires DATABASE_URL for production (currently using in-memory storage). UI Component Libraries:

Radix UI Primitives: 25+ unstyled, accessible components. Additional UI: cmdk, lucide-react, react-day-picker, embla-carousel-react, recharts, vaul. Form & Validation:

React Hook Form: Performant form state management. Zod: Runtime type validation and schema generation. Styling & Utilities:

Tailwind CSS: JIT compiler, PostCSS, custom color system. Class Utilities: clsx, tailwind-merge, class-variance-authority. Development Tools:

Replit-Specific: @replit/vite-plugin-cartographer, @replit/vite-plugin-dev-banner, @replit/vite-plugin-runtime-error-modal. Session Storage:

connect-pg-simple: PostgreSQL session store for express-session.

Recent Changes (December 2024)

Referral System Enhancements:

Added Admin Referrals page (/admin/referrals) for viewing and managing all referral records
Added Admin Wallet Logs page (/admin/wallet-logs) for transaction monitoring
Created User Invite & Earn page (/invite) with referral code sharing via WhatsApp/SMS
Implemented backend API routes for referral stats, status updates, and wallet transactions
Added public referral settings endpoint for displaying bonus amounts and limits
Storage methods: getAllReferrals, getReferralById, updateReferralStatus, getAllWalletTransactions
Subscription Flow:

User creates subscription → Admin confirms payment → Chef assigned via load balancing
Chef prepares order → Delivery boy accepts → Out for delivery → Delivered
remainingDeliveries automatically decremented on successful delivery
Real-time WebSocket notifications between chef, delivery, and admin
Important Routes:

Admin Referrals: /admin/referrals
Admin Wallet Logs: /admin/wallet-logs
User Invite & Earn: /invite
API: /api/admin/referrals, /api/admin/wallet-transactions, /api/referral-settings