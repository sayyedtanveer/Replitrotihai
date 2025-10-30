# FoodExpress - Food Delivery Application

## Overview

FoodExpress is a full-stack food delivery web application built with React, Express, and TypeScript. The platform enables users to browse food categories (Rotis & Breads, Lunch & Dinner, Hotel Specials), add items to cart, and place orders. The application features a modern, visually appealing interface inspired by leading food delivery platforms like Uber Eats and DoorDash, with emphasis on appetite appeal and intuitive navigation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server with HMR (Hot Module Replacement)
- Wouter for lightweight client-side routing
- Single-page application (SPA) architecture

**UI Component System**
- Shadcn UI component library (New York style variant) with Radix UI primitives
- Tailwind CSS for utility-first styling with custom design tokens
- Design system follows spacing units of 4, 6, 8, 12, 16, 20, 24 for consistency
- Responsive grid layouts: 3-4 columns desktop, 2 columns tablet, 1 column mobile
- Custom CSS variables for theming (light/dark mode support)

**State Management & Data Fetching**
- TanStack React Query (v5) for server state management and caching
- Local React state (useState) for UI state like cart management
- Query client configured with infinite stale time and disabled auto-refetch for optimized performance

**Form Handling & Validation**
- React Hook Form for performant form management
- Zod for runtime schema validation
- @hookform/resolvers for seamless integration between the two

### Backend Architecture

**Server Framework**
- Express.js with TypeScript for type-safe server-side code
- ESM (ECMAScript Modules) throughout the codebase
- RESTful API design pattern

**API Structure**
- `/api/categories` - GET all food categories
- `/api/products` - GET all products with optional category filtering
- `/api/products/:id` - GET single product details
- `/api/orders` - POST to create new orders

**Storage Layer**
- In-memory storage implementation (MemStorage class) with seeded sample data
- Interface-based design (IStorage) allows for easy migration to database persistence
- Data models: Categories, Products, Orders with UUID-based identifiers

**Development Features**
- Custom logging middleware for API requests with timing and response capture
- Request body buffering for raw body access
- Error handling with appropriate HTTP status codes

### Data Storage Solutions

**Database Schema (Drizzle ORM)**
- PostgreSQL-compatible schema using Drizzle ORM
- Three main tables:
  - **categories**: id, name, description, image, iconName, itemCount
  - **products**: id, name, description, price, image, rating, reviewCount, isVeg, isCustomizable, categoryId
  - **orders**: id, customerName, phone, address, items (JSONB), subtotal, deliveryFee, total, status, createdAt
- UUID primary keys with auto-generation via `gen_random_uuid()`
- Type-safe schema validation using drizzle-zod

**Current Implementation**
- In-memory storage for development with pre-seeded data
- Ready for migration to PostgreSQL via Drizzle ORM connection
- Database configuration expects `DATABASE_URL` environment variable

### External Dependencies

**UI & Styling**
- Radix UI primitives (30+ components) for accessible, unstyled UI primitives
- Tailwind CSS v3 with PostCSS and Autoprefixer
- class-variance-authority for variant-based component styling
- lucide-react for icon system
- Google Fonts: Inter/DM Sans (primary), Architects Daughter, Fira Code, Geist Mono

**Database & ORM**
- Drizzle ORM v0.39+ for type-safe SQL queries and migrations
- @neondatabase/serverless for PostgreSQL serverless driver
- connect-pg-simple for session storage (currently unused)

**Development Tools**
- tsx for TypeScript execution in development
- esbuild for production server bundling
- Replit-specific plugins (cartographer, dev-banner, runtime-error-modal) for enhanced development experience
- Vite plugins for React and error overlay

**Utilities**
- date-fns for date manipulation
- clsx and tailwind-merge for className utilities
- nanoid for generating unique identifiers
- embla-carousel-react for carousel functionality (if needed)

**Type Safety**
- Zod for runtime type validation
- TypeScript with strict mode enabled
- Shared types between client and server via `/shared` directory