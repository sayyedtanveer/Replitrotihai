# RotiHai - Food Delivery Application

A full-stack food delivery web application built with React, Express, and TypeScript.

## Features

- 🛒 Browse food items across multiple categories
- 🛍️ Shopping cart with real-time updates
- 📍 Location-based delivery fee calculation
- 👨‍💼 Admin panel with JWT authentication
- 📊 Dashboard with metrics and analytics
- 🔐 Role-based access control

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** - Fast development server and build tool
- **Wouter** - Lightweight routing
- **TanStack Query** - Server state management
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality React components
- **React Hook Form + Zod** - Form validation

### Backend
- **Express.js** - Node.js web framework
- **TypeScript** - Type-safe JavaScript
- **Drizzle ORM** - Type-safe database toolkit
- **PostgreSQL** - Production database (optional)
- **In-memory storage** - Development mode
- **JWT** - Admin authentication
- **bcrypt** - Password hashing

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v20 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** - [Download here](https://git-scm.com/)
- **VS Code** (recommended) - [Download here](https://code.visualstudio.com/)

## Getting Started

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd rotihai
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages for both frontend and backend.

### 3. Environment Setup (Optional)

Create a `.env` file in the root directory for custom configuration:

```env
# Server Port (default: 5000)
PORT=5000

# Admin JWT Secret (change in production)
JWT_SECRET=your-secret-key-here

# Database URL (optional - uses in-memory storage by default)
# DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Admin Credentials (optional - defaults to admin/admin123)
# ADMIN_USERNAME=admin
# ADMIN_PASSWORD=admin123
# ADMIN_EMAIL=admin@rotihai.com
```

### 4. Run the Development Server

```bash
npm run dev
```

This single command starts both:
- **Backend server** on `http://localhost:5000`
- **Frontend with HMR** (Hot Module Replacement)

The application will automatically open in your browser at `http://localhost:5000`

## Project Structure

```
rotihai/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities and configurations
│   │   └── App.tsx        # Main app component
│   └── index.html
├── server/                # Backend Express application
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API routes
│   ├── storage.ts        # Data storage layer
│   ├── adminAuth.ts      # Admin authentication
│   └── adminRoutes.ts    # Admin API routes
├── shared/               # Shared code between frontend/backend
│   └── schema.ts        # Database schema and types
├── scripts/             # Utility scripts
└── package.json         # Dependencies and scripts
```

## Available Scripts

### Development

```bash
npm run dev              # Start development server with HMR
```

### Production

```bash
npm run build           # Build for production
npm start               # Start production server
```

### Database

```bash
npm run db:push         # Sync database schema
npm run db:studio       # Open Drizzle Studio (database GUI)
npm run db:generate     # Generate migration files
```

### Code Quality

```bash
npm run type-check      # Run TypeScript type checking
```

## Usage Guide

### Customer Features

1. **Browse Products**
   - Visit `http://localhost:5000`
   - Browse categories and products without login
   - Add items to cart

2. **Place Order**
   - Click cart icon in header
   - Review items and proceed to checkout
   - Enter delivery details:
     - Full name
     - Phone number
     - Email (optional)
     - Delivery address (Kurla, Mumbai)
     - Location coordinates
   - Calculate delivery fee
   - Place order

### Admin Panel

1. **Access Admin Portal**
   - Visit `http://localhost:5000/admin/login`
   - Default credentials:
     - Username: `admin`
     - Password: `admin123`
   - **⚠️ Change default password after first login**

2. **Admin Features**
   - **Dashboard**: View metrics (users, orders, revenue)
   - **Orders**: View and manage customer orders
   - **Products**: Add, edit, delete products
   - **Categories**: Manage food categories
   - **Users**: View registered customers
   - **Chefs**: View partner restaurants
   - **Admin Management** (Super Admin only): Create admin users

3. **Admin Roles**
   - **Viewer**: Read-only access
   - **Manager**: Can create/update (not delete)
   - **Super Admin**: Full access including deletions

## Development Tips

### VS Code Extensions (Recommended)

Install these extensions for the best development experience:

1. **ESLint** - Code linting
2. **Prettier** - Code formatting
3. **Tailwind CSS IntelliSense** - Tailwind autocomplete
4. **TypeScript and JavaScript Language Features** - Built-in
5. **Auto Rename Tag** - HTML/JSX tag renaming
6. **Path Intellisense** - Autocomplete filenames

### Hot Module Replacement (HMR)

The development server supports HMR:
- Frontend changes reload instantly
- Backend changes restart the server automatically
- No manual refresh needed

### Debugging in VS Code

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

Then press F5 to start debugging.

## Database Setup

### Using In-Memory Storage (Default)

No setup required. The application uses in-memory storage by default, perfect for development.

### Using PostgreSQL (Production)

1. Install PostgreSQL on your machine
2. Create a database:
   ```sql
   CREATE DATABASE rotihai;
   ```
3. Add `DATABASE_URL` to your `.env` file:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/rotihai
   ```
4. Push the schema:
   ```bash
   npm run db:push
   ```

## Deployment

### Build for Production

```bash
npm run build
```

This creates optimized production files in `dist/`.

### Deploy to Replit

1. Push code to GitHub
2. Import repository in Replit
3. Click "Deploy" button
4. Configure environment variables in Replit Secrets

### Deploy to Other Platforms

The application works on any Node.js hosting platform:
- **Vercel**: Add `vercel.json` configuration
- **Netlify**: Configure build settings
- **Heroku**: Use Procfile
- **Railway**: Auto-detects Node.js
- **DigitalOcean**: Deploy as Node.js app

## Troubleshooting

### Port Already in Use

If port 5000 is occupied:

```bash
# Change port in .env
PORT=3000
```

Or kill the process:
```bash
# Find process
lsof -ti:5000

# Kill process (Mac/Linux)
kill -9 $(lsof -ti:5000)

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Dependencies Installation Failed

Clear cache and reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors

Run type check to see all errors:

```bash
npm run type-check
```

### Build Errors

Clear Vite cache:

```bash
rm -rf dist
npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## Security

- Admin passwords are hashed with bcrypt
- JWT tokens for admin authentication
- HTTP-only cookies for refresh tokens
- Role-based access control
- Input validation with Zod

**⚠️ Important Security Notes:**
- Change default admin credentials immediately
- Use strong JWT_SECRET in production
- Enable HTTPS in production
- Configure CORS properly
- Never commit secrets to Git

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review code comments

## Acknowledgments

- Built with [Vite](https://vitejs.dev/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)
- State management with [TanStack Query](https://tanstack.com/query)

---

**Happy Coding! 🚀**
