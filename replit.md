#RotiHai - Food Delivery Application

## Overview

RotiHai is a full-stack food delivery web application that allows users to browse food items across multiple categories (Rotis, Lunch & Dinner, Hotel Specials), add items to their cart, and place orders. The application features authentication via Replit's OpenID Connect, real-time cart management, and a responsive design optimized for both desktop and mobile devices.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Technology Stack

**Frontend:**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for client-side routing (lightweight alternative to React Router)
- TanStack Query (React Query) for server state management and data fetching
- Tailwind CSS with custom design system based on shadcn/ui components
- React Hook Form with Zod for form validation

**Backend:**
- Express.js running on Node.js
- TypeScript for type safety across the entire stack
- Session-based authentication using express-session

**Design System:**
- Custom Tailwind configuration with shadcn/ui (New York style)
- Design inspired by leading food delivery platforms (Uber Eats, DoorDash, Swiggy, Zomato)
- Typography using Inter/DM Sans with consistent spacing units (4, 6, 8, 12, 16, 20, 24)
- Responsive grid layouts: 3-4 columns desktop, 2 tablet, 1 mobile

### Authentication & Authorization

**Customer Authentication (OpenID Connect via Replit):**
- Passport.js strategy for OIDC authentication
- Session management with configurable session stores (in-memory for development)
- User data synchronized from OIDC claims to local user records
- Protected routes require authentication via `isAuthenticated` middleware
- Automatic token refresh handling

**Admin Authentication (JWT-based):**
- Separate authentication system for admin users using JWT tokens
- Username and password-based login with bcrypt password hashing
- Access tokens (15-minute expiry) and refresh tokens (7-day expiry)
- Refresh tokens stored in httpOnly cookies for security
- Automatic token refresh when access token expires
- Role-based access control with three roles: `super_admin`, `manager`, `viewer`
- Protected admin routes with AdminGuard component

**Session Management:**
- 7-day session TTL (time-to-live)
- HTTP-only cookies for security
- Secure flag enabled in production environments
- Session secret configurable via environment variables

### Data Layer Architecture

**Schema Design:**
The application uses a shared schema (`shared/schema.ts`) with Drizzle ORM defining six main entities:

1. **Users** - Stores customer profile information from OIDC provider
2. **Admin Users** - Stores admin accounts with username, email, password hash, and role
3. **Categories** - Product categorization (Rotis, Lunch & Dinner, Hotel Specials)
4. **Products** - Food items with pricing, images, ratings, and dietary flags (vegetarian)
5. **Orders** - Customer orders with delivery details and itemized products
6. **Sessions** - PostgreSQL-based session persistence
7. **Chefs** - Partner chefs and restaurants with ratings and reviews

**Storage Abstraction:**
- `IStorage` interface defines all data operations
- `MemStorage` class provides in-memory implementation with seed data
- Designed for easy migration to PostgreSQL implementation
- All storage methods are async to support future database integration

### API Architecture

**Customer API Endpoints:**
- `GET /api/auth/user` - Fetch authenticated user profile (protected)
- `GET /api/categories` - List all food categories
- `GET /api/products` - List all products (supports `?categoryId` filter)
- `GET /api/products/:id` - Get single product details
- `POST /api/orders` - Create new order (protected, validated with Zod)
- `GET /api/orders/:id` - Retrieve order details (protected)
- `GET /api/chefs` - List all chefs/restaurants
- `GET /api/chefs/:categoryId` - Get chefs by category
- `POST /api/calculate-delivery` - Calculate delivery fee based on location

**Admin API Endpoints:**
- `POST /api/admin/auth/login` - Admin login with username/password
- `POST /api/admin/auth/logout` - Admin logout
- `POST /api/admin/auth/refresh` - Refresh access token using refresh token
- `GET /api/admin/dashboard/metrics` - Dashboard metrics (user count, orders, revenue, etc.)
- `GET /api/admin/orders` - List all orders
- `PATCH /api/admin/orders/:id/status` - Update order status (manager+)
- `GET /api/admin/categories` - List all categories
- `POST /api/admin/categories` - Create category (manager+)
- `PATCH /api/admin/categories/:id` - Update category (manager+)
- `DELETE /api/admin/categories/:id` - Delete category (super_admin)
- `GET /api/admin/products` - List all products
- `POST /api/admin/products` - Create product (manager+)
- `PATCH /api/admin/products/:id` - Update product (manager+)
- `DELETE /api/admin/products/:id` - Delete product (super_admin)
- `GET /api/admin/users` - List all customer users
- `GET /api/admin/chefs` - List all chefs
- `GET /api/admin/admins` - List all admin users (super_admin)
- `POST /api/admin/admins` - Create new admin user (super_admin)

**Request/Response Pattern:**
- JSON payloads for all API communications
- Zod schema validation on order creation
- Structured error responses with appropriate HTTP status codes
- Request logging middleware for debugging API calls

### State Management Strategy

**Server State (TanStack Query):**
- Centralized query client configuration
- Custom `queryFn` with 401 unauthorized handling
- Infinite stale time and disabled refetching for stable data
- Optimistic updates for cart operations

**Client State (React useState):**
- Cart items managed in Home component
- UI state (modals, drawers) managed locally in components
- Search query state for product filtering

**Authentication State:**
- Custom `useAuth` hook wrapping TanStack Query
- Returns user object, loading state, and authentication status
- Separate routing logic for authenticated vs. unauthenticated users

### Component Architecture

**Page Components:**
- `Landing.tsx` - Unauthenticated welcome page with feature highlights
- `Home.tsx` - Main authenticated dashboard with categories, products, and cart
- `NotFound.tsx` - 404 error page

**Feature Components:**
- `Header` - Sticky navigation with search, cart badge, user menu
- `Hero` - Full-width banner with location input and search
- `CategoryCard` - Visual card for browsing food categories
- `ProductCard` - Food item card with add-to-cart controls
- `CartSidebar` - Slide-out cart with quantity controls and checkout
- `CheckoutDialog` - Modal form for order placement
- `MenuDrawer` - Mobile-friendly navigation drawer
- `Footer` - Links and newsletter signup

**UI Components:**
- 40+ shadcn/ui components (buttons, forms, dialogs, etc.)
- Consistent design tokens via CSS variables
- Dark mode support structure in place
- Hover and active state elevation effects

### Build & Development Configuration

**Vite Configuration:**
- Development server with HMR (Hot Module Replacement)
- Path aliases: `@/` for client code, `@shared/` for shared schemas, `@assets/` for images
- Conditional Replit-specific plugins (cartographer, dev banner, runtime error overlay)
- Production build outputs to `dist/public`

**TypeScript Configuration:**
- Strict mode enabled for type safety
- ESNext module resolution with bundler strategy
- Incremental compilation with build info caching
- Shared types between client and server via `@shared` alias

**Development vs. Production:**
- Development: Vite dev server proxies API requests to Express
- Production: Express serves pre-built static assets from `dist/public`
- Environment-specific configurations for sessions and cookies

## External Dependencies

### Third-Party Services

**Replit Authentication Service:**
- OIDC provider at `https://replit.com/oidc`
- Provides user identity without password management
- Returns standardized claims (sub, email, name, profile image)

### Database (Configured for PostgreSQL)

**Drizzle ORM:**
- Schema-first ORM with TypeScript support
- PostgreSQL dialect configured in `drizzle.config.ts`
- Migration files stored in `./migrations`
- Connection via `@neondatabase/serverless` driver (supports Neon and standard Postgres)
- Schema uses `gen_random_uuid()` for primary key generation

**Environment Requirements:**
- `DATABASE_URL` - PostgreSQL connection string (required for production)
- Currently using in-memory storage; database setup needed for persistence

### UI Component Libraries

**Radix UI Primitives:**
- 25+ unstyled, accessible component primitives
- Includes dialogs, dropdowns, tooltips, accordions, navigation menus
- Full keyboard navigation and ARIA compliance

**Additional UI Dependencies:**
- `cmdk` - Command palette component
- `lucide-react` - Icon library (250+ icons)
- `react-day-picker` - Calendar/date picker
- `embla-carousel-react` - Touch-enabled carousels
- `recharts` - Data visualization (chart components)
- `vaul` - Mobile drawer component

### Form & Validation

**React Hook Form:**
- Performant form state management
- Integration with Zod via `@hookform/resolvers`

**Zod:**
- Runtime type validation
- Schema generation from Drizzle tables via `drizzle-zod`

### Styling & Utilities

**Tailwind CSS:**
- JIT compiler for optimized CSS
- PostCSS for autoprefixing
- Custom color system with HSL variables
- Utility classes for elevation effects

**Class Utilities:**
- `clsx` and `tailwind-merge` for conditional class merging
- `class-variance-authority` for component variant patterns

### Development Tools

**Replit-Specific:**
- `@replit/vite-plugin-cartographer` - Code navigation
- `@replit/vite-plugin-dev-banner` - Development mode indicator
- `@replit/vite-plugin-runtime-error-modal` - Error overlay

### Session Storage

**connect-pg-simple:**
- PostgreSQL session store for express-session
- Enables session persistence across server restarts
- Automatic session cleanup based on expiration## Admin Panel\n\n### Overview\nThe admin panel provides a comprehensive management interface for the RotiHai platform with role-based access control.\n\n### Access\n- **URL:** Visit `/admin/login` to access the admin panel\n- **Default Credentials:**\n  - Username: `admin`\n  - Password: `admin123`\n  - **Important:** Change the default password after first login\n\n### Features\n\n**Dashboard:**\n- Real-time metrics display:\n  - Total users count\n  - Total orders count\n  - Total revenue\n  - Pending orders count\n  - Completed orders count\n- Quick overview of platform statistics\n\n**Order Management:**\n- View all customer orders\n- Update order status (pending → confirmed → preparing → out_for_delivery → delivered)\n- View order details including items, customer info, and delivery address\n- Filter and sort orders by status\n\n**Product Management:**\n- Add, edit, and delete products\n- Set product pricing and descriptions\n- Upload product images\n- Mark products as vegetarian or customizable\n- Assign products to categories and chefs\n\n**Category Management:**\n- View all food categories\n- Add new categories (manager+)\n- Edit category details (manager+)\n- Delete categories (super_admin only)\n\n**User Management:**\n- View all registered customer users\n- See user registration dates and profile information\n- Monitor platform growth\n\n**Chef/Restaurant Management:**\n- View all partner chefs and restaurants\n- See ratings and review counts\n- Manage chef partnerships\n\n**Admin User Management (Super Admin Only):**\n- Create new admin users\n- Assign roles (super_admin, manager, viewer)\n- View all admin accounts\n\n### Role-Based Access Control\n\n**Viewer:**\n- Read-only access to all data\n- Can view dashboard, orders, products, categories, users, and chefs\n- Cannot create, update, or delete any data\n\n**Manager:**\n- All viewer permissions\n- Can create and update products\n- Can create and update categories\n- Can update order statuses\n- Cannot delete products/categories\n- Cannot manage admin users\n\n**Super Admin:**\n- All manager permissions\n- Can delete products and categories\n- Can create and manage admin users\n- Full access to all features\n\n### Security Features\n\n**Authentication:**\n- JWT-based authentication with short-lived access tokens (15 minutes)\n- Long-lived refresh tokens (7 days) stored in httpOnly cookies\n- Automatic token refresh before expiry\n- Secure password hashing using bcrypt\n\n**Authorization:**\n- Role-based access control enforced on both frontend and backend\n- Protected routes redirect unauthorized users to login\n- API endpoints validate JWT tokens and user roles\n- Different permission levels for different operations\n\n**Session Management:**\n- Automatic logout on token expiry\n- Secure cookie storage for refresh tokens\n- Protection against XSS attacks\n- CSRF protection with SameSite cookies
