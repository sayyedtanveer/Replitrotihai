
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Sparkles } from "lucide-react";

interface CategoryCardProps {
  id?: string;
  title: string;
  description: string;
  itemCount: string;
  image: string;
  icon?: React.ReactNode;
  onBrowse?: () => void;
}

export default function CategoryCard({
  id,
  title,
  description,
  itemCount,
  image,
  icon,
  onBrowse,
}: CategoryCardProps) {
  // This component is kept for backward compatibility but not used in main home page
  return (
    <Card
      id={id}
      className="relative overflow-hidden border-0 shadow-lg hover:shadow-2xl cursor-pointer group bg-gradient-to-br from-card via-card to-card/80 backdrop-blur-sm transition-all duration-500 active:scale-[0.98] touch-feedback"
      onClick={onBrowse}
      data-testid={`card-category-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Shimmer effect on hover */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="relative flex flex-col items-center p-4 sm:p-6">
        {/* Image Container with enhanced effects */}
        <div className="relative mb-4 sm:mb-5">
          {/* Glow effect */}
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl scale-0 group-hover:scale-110 transition-transform duration-700" />
          
          <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden ring-4 ring-primary/10 group-hover:ring-primary/40 group-hover:ring-8 transition-all duration-500 shadow-xl group-hover:shadow-2xl">
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover transition-all duration-700 group-hover:scale-125 group-hover:rotate-2"
            />
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50 group-hover:to-black/30 transition-all duration-500" />
            
            {/* Sparkle effect on hover */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:scale-110">
              <Sparkles className="h-5 w-5 text-yellow-300 animate-pulse" />
            </div>
          </div>
          
          {/* Floating Icon Badge with enhanced animation */}
          {icon && (
            <div className="absolute -bottom-2 -right-2 p-2 sm:p-2.5 bg-white dark:bg-card shadow-xl rounded-full border-4 border-background group-hover:scale-125 group-hover:rotate-12 transition-all duration-500">
              <div className="text-primary group-hover:animate-pulse">
                {icon}
              </div>
            </div>
          )}
        </div>

        {/* Content with staggered animations */}
        <div className="text-center space-y-2 sm:space-y-2.5 w-full">
          <h3 
            className="text-lg sm:text-xl font-bold text-foreground group-hover:text-primary transition-all duration-300 group-hover:scale-105" 
            data-testid={`text-category-title-${title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {title}
          </h3>
          
          <p 
            className="text-xs sm:text-sm text-muted-foreground line-clamp-2 px-2 transition-all duration-300 group-hover:text-foreground/80" 
            data-testid="text-category-description"
          >
            {description}
          </p>
          
          <div className="flex items-center justify-center gap-2 pt-1 sm:pt-2">
            <span 
              className="text-xs font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-full group-hover:bg-primary/20 group-hover:scale-105 transition-all duration-300 shadow-sm" 
              data-testid="text-item-count"
            >
              {itemCount}
            </span>
          </div>

          <Button 
            variant="ghost" 
            size="sm"
            className="gap-2 group-hover:gap-3 transition-all duration-300 mt-2 sm:mt-3 text-primary hover:text-primary hover:bg-primary/15 font-semibold group-hover:scale-105" 
            data-testid="button-browse"
          >
            Explore Now
            <ArrowRight className="h-4 w-4 group-hover:translate-x-2 transition-transform duration-300" />
          </Button>
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
    </Card>
  );
}
