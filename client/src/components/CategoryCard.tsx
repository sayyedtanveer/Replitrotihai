import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

interface CategoryCardProps {
  title: string;
  description: string;
  itemCount: string;
  image: string;
  icon?: React.ReactNode;
  onBrowse?: () => void;
}

export default function CategoryCard({
  title,
  description,
  itemCount,
  image,
  icon,
  onBrowse,
}: CategoryCardProps) {
  return (
    <Card
      className="overflow-hidden hover-elevate active-elevate-2 cursor-pointer group"
      onClick={onBrowse}
      data-testid={`card-category-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        {icon && (
          <div className="absolute top-4 left-4 p-3 bg-white/90 backdrop-blur-sm rounded-lg">
            {icon}
          </div>
        )}
      </div>
      
      <div className="p-6">
        <h3 className="text-2xl font-bold mb-2" data-testid={`text-category-title-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {title}
        </h3>
        <p className="text-muted-foreground mb-4" data-testid="text-category-description">
          {description}
        </p>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <span className="text-sm font-medium text-primary" data-testid="text-item-count">
            {itemCount}
          </span>
          <Button variant="ghost" className="gap-2 group-hover:gap-3 transition-all" data-testid="button-browse">
            Browse
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
