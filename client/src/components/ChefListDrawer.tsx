
import { X, Star, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Chef, Category } from "@shared/schema";

interface ChefListDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
  chefs: Chef[];
  onChefClick: (chef: Chef) => void;
}

export default function ChefListDrawer({ 
  isOpen, 
  onClose, 
  category,
  chefs,
  onChefClick
}: ChefListDrawerProps) {
  if (!isOpen || !category) return null;

  const categoryChefs = chefs.filter(chef => chef.categoryId === category.id);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
        data-testid="chef-list-backdrop"
      />

      <div
        className="fixed top-0 left-0 h-full w-full sm:w-[500px] bg-background z-50 shadow-lg transform transition-transform duration-300 ease-in-out"
        data-testid="chef-list-drawer"
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <h2 className="text-xl font-bold text-primary" data-testid="text-chef-list-title">
                {category.name}
              </h2>
              <p className="text-sm text-muted-foreground">Choose your chef or restaurant</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              data-testid="button-close-chef-list"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {categoryChefs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8" data-testid="text-no-chefs">
                  No chefs or restaurants available in this category
                </p>
              ) : (
                categoryChefs.map((chef) => (
                  <div
                    key={chef.id}
                    className="border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow hover:border-primary"
                    onClick={() => {
                      onChefClick(chef);
                      onClose();
                    }}
                    data-testid={`chef-card-${chef.id}`}
                  >
                    <div className="flex gap-4">
                      <img
                        src={chef.image}
                        alt={chef.name}
                        className="w-20 h-20 rounded-lg object-cover"
                        data-testid={`img-chef-${chef.id}`}
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1" data-testid={`text-chef-name-${chef.id}`}>
                              {chef.name}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-2" data-testid={`text-chef-description-${chef.id}`}>
                              {chef.description}
                            </p>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm font-medium">{chef.rating}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                ({chef.reviewCount} reviews)
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  );
}
