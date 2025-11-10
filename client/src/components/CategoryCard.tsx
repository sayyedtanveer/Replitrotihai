
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

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
  return (
    <Card
      id={id}
      className="overflow-hidden border-0 shadow-sm hover:shadow-xl cursor-pointer group bg-transparent"
      onClick={onBrowse}
      data-testid={`card-category-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {/* Circular Image Container */}
      <div className="flex flex-col items-center p-6">
        <div className="relative mb-4">
          <div className="w-40 h-40 rounded-full overflow-hidden ring-4 ring-primary/10 group-hover:ring-primary/30 transition-all duration-300 group-active:scale-95">
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40 group-hover:to-black/30 transition-all duration-300" />
          </div>
          
          {/* Floating Icon Badge */}
          {icon && (
            <div className="absolute -bottom-2 -right-2 p-2.5 bg-white shadow-lg rounded-full border-4 border-background group-hover:scale-110 transition-transform duration-300">
              {icon}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="text-center space-y-2 w-full">
          <h3 
            className="text-xl font-bold group-hover:text-primary transition-colors duration-300" 
            data-testid={`text-category-title-${title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {title}
          </h3>
          
          <p 
            className="text-sm text-muted-foreground line-clamp-2 px-2" 
            data-testid="text-category-description"
          >
            {description}
          </p>
          
          <div className="flex items-center justify-center gap-2 pt-2">
            <span 
              className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full" 
              data-testid="text-item-count"
            >
              {itemCount}
            </span>
          </div>

          <Button 
            variant="ghost" 
            size="sm"
            className="gap-2 group-hover:gap-3 transition-all mt-3 text-primary hover:text-primary hover:bg-primary/10" 
            data-testid="button-browse"
          >
            Explore
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
