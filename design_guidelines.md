# Food Delivery Application - Design Guidelines

## Design Approach
**Reference-Based Approach** inspired by leading food delivery platforms (Uber Eats, DoorDash, Swiggy, Zomato). This approach emphasizes visual appetite appeal, intuitive categorization, and seamless ordering flow optimized for quick decision-making and conversions.

## Typography System
- **Primary Font**: Inter or DM Sans (Google Fonts)
- **Headings**: Bold weights (700) for category titles and section headers
- **Body Text**: Regular (400) and Medium (500) for descriptions and pricing
- **Scale**: text-4xl/5xl for hero headlines, text-2xl/3xl for category headers, text-lg for product names, text-base for descriptions, text-sm for metadata

## Layout & Spacing System
**Tailwind Spacing Units**: Consistently use 4, 6, 8, 12, 16, 20, 24 for margins and padding (m-4, p-6, gap-8, etc.)

**Container Strategy**:
- Full-width sections with max-w-7xl inner containers
- Category grids: 3-4 columns on desktop, 2 on tablet, 1 on mobile
- Product cards: 2-4 column responsive grids

## Component Library

### Navigation Header
- Sticky top navigation with logo, location selector, search bar, cart icon with badge counter
- Primary CTA: "Sign In" or user profile avatar
- Mobile: Collapsible hamburger menu with category quick-access

### Hero Section
- Full-width banner (60-70vh) with appetizing food photography
- Overlay gradient for text readability
- Centered headline: "Delicious Meals Delivered to Your Door"
- Search bar with category filters prominently placed
- Delivery time estimate and location input

### Category Divisions (Home Page Focus)
**Three Main Category Cards** arranged horizontally (desktop) or vertically stacked (mobile):

1. **Roti Section**:
   - Card with tandoor/roti imagery
   - Title: "Fresh Rotis & Breads"
   - Quick stats: "20+ varieties"
   - Browse button

2. **Lunch & Dinner Section**:
   - Card with complete meal platter imagery
   - Title: "Complete Meals"
   - Quick stats: "50+ dishes"
   - Browse button

3. **Hotel Section**:
   - Card with restaurant/fine dining imagery
   - Title: "Restaurant Specials"
   - Quick stats: "30+ partners"
   - Browse button

Each card includes: background image with subtle overlay, icon, category name, item count, and prominent action button.

### Product Cards
- High-quality food photography (square or 4:3 aspect ratio)
- Product name and brief description
- Price prominently displayed
- Customization indicator (e.g., "Customize available")
- Add to cart button with quantity selector
- Ratings and review count
- Dietary badges (veg/non-veg indicators common in Indian food apps)
- Quick view/hover state showing more details

### Shopping Cart (Sidebar or Modal)
- Slide-in panel from right side
- Cart items list with thumbnails
- Quantity adjusters (+/- buttons)
- Item customization summary
- Subtotal, delivery fee, taxes breakdown
- Prominent checkout button
- Empty cart state with illustration

### Order Form
- Step-based multi-page form or single-page with sections
- Delivery address with map integration placeholder
- Contact information
- Delivery time selection (ASAP or scheduled)
- Payment method selection
- Order summary sidebar
- Special instructions textarea

### Footer
- Multiple columns: About, Categories, Customer Support, Download App
- Social media links
- Newsletter signup with food imagery
- Payment methods accepted icons
- Copyright and legal links

## Product Listing Pages

### Category Pages (Roti, Lunch & Dinner, Hotel)
- Breadcrumb navigation
- Category banner with description
- Filtering sidebar: Price range, dietary preferences, cuisine type, ratings
- Sort options: Popular, Price (low-high), Ratings, Delivery time
- Grid layout for product cards (responsive)
- Load more or infinite scroll

### Individual Product Page
- Large product image gallery (3-5 images)
- Product name and detailed description
- Customization options (size, add-ons, spice level, etc.)
- Ingredient list
- Nutritional information (expandable section)
- Customer reviews and ratings section
- Similar products carousel
- Sticky add-to-cart section on mobile

## Interactive Elements

### Buttons
- Primary: Solid fill for main CTAs (Add to Cart, Checkout)
- Secondary: Outlined for Browse/View More
- Cart buttons: Icon + counter badge
- Sizing: Large for hero CTAs, medium for product cards, small for quantity adjusters

### Cards
- Slight elevation (shadow-md)
- Rounded corners (rounded-lg to rounded-xl)
- Hover state: Subtle lift effect (shadow-lg transition)
- Click area optimization for mobile

### Forms
- Floating labels or top-aligned labels
- Input validation with inline error messages
- Clear focus states with border emphasis
- Auto-complete for addresses
- Dropdown menus for selection options

## Images

### Hero Section
**Large hero image**: Full-width banner showing a diverse spread of delicious Indian food - rotis, curry bowls, rice dishes, arranged appetizingly on a table with warm lighting. Should evoke hunger and comfort.

### Category Cards
- **Roti Card**: Close-up of freshly baked tandoori rotis stacked on a plate with visible texture
- **Lunch & Dinner Card**: Complete thali or meal platter with multiple dishes
- **Hotel Card**: Fine dining setup with elegant plating or restaurant ambiance

### Product Cards
Each food item requires high-quality, well-lit photography showing the dish in its best presentation. Consistent styling across all product images (similar backgrounds, lighting).

## Responsive Behavior

### Desktop (lg: 1024px+)
- Multi-column category grid (3 columns)
- Sidebar cart panel
- Hover interactions on product cards
- Mega-menu navigation with category previews

### Tablet (md: 768px)
- 2-column product grids
- Condensed navigation
- Modal cart instead of sidebar

### Mobile (base: <768px)
- Single column layout
- Bottom navigation bar with Home, Categories, Cart, Profile
- Sticky category filters
- Full-screen cart modal
- Simplified search with drawer

## SEO Implementation Features

### Technical SEO Elements
- Semantic HTML5 structure with proper heading hierarchy
- Meta descriptions for each category and product page
- Open Graph tags for social sharing
- Schema.org markup for products (Product, Offer, AggregateRating)
- Optimized image alt texts describing dishes
- Sitemap generation structure
- Breadcrumb markup

### Content Strategy
- Category page descriptions with target keywords
- Product descriptions with relevant food terminology
- Blog section for recipes and food stories
- FAQ section for common delivery queries
- Location-based landing pages

## Performance Considerations
- Lazy loading for product images
- Optimized image formats (WebP with fallbacks)
- Infinite scroll with pagination fallback
- Cached category data
- Progressive web app capabilities for mobile

This design creates a visually appetizing, conversion-optimized food delivery experience that balances beautiful imagery with functional efficiency, ensuring users can quickly browse categories, customize orders, and complete purchases seamlessly across all devices.