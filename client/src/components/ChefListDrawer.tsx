import { X, Star, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Category, Chef as BaseChef } from "@shared/schema";

// ✅ Frontend-safe Chef type (adds optional coordinates)
type FrontendChef = BaseChef & {
  latitude?: number | null;
  longitude?: number | null;
};

interface ChefListDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
  chefs: FrontendChef[];
  onChefClick: (chef: FrontendChef) => void;
}

export default function ChefListDrawer({
  isOpen,
  onClose,
  category,
  chefs,
  onChefClick,
}: ChefListDrawerProps) {
  if (!isOpen || !category) return null;

  // Filter chefs by category and optionally show inactive chefs (but greyed out)
  const categoryChefs = chefs.filter((chef) => chef.categoryId === category.id);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed top-0 left-0 h-full w-full sm:w-[500px] bg-background z-50 shadow-lg transform transition-transform duration-300 ease-in-out">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <h2 className="text-xl font-bold text-primary">{category.name}</h2>
              <p className="text-sm text-muted-foreground">
                Choose your chef or restaurant
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {categoryChefs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No chefs or restaurants available in this category
                </p>
              ) : (
                categoryChefs.map((chef) => {
                  const isInactive = chef.isActive === false;
                  return (
                    <div
                      key={chef.id}
                      className={`border rounded-lg p-4 transition-shadow ${
                        isInactive 
                          ? 'opacity-50 cursor-not-allowed bg-muted/50' 
                          : 'cursor-pointer hover:shadow-md hover:border-primary'
                      }`}
                      onClick={() => {
                        if (!isInactive) {
                          onChefClick(chef);
                          onClose();
                        }
                      }}
                      data-testid={`chef-card-${chef.id}`}
                    >
                      <div className="flex gap-4">
                        <img
                          src={chef.image}
                          alt={chef.name}
                          className={`w-20 h-20 rounded-lg object-cover ${isInactive ? 'grayscale' : ''}`}
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-lg mb-1">
                                  {chef.name}
                                </h3>
                                {isInactive && (
                                  <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">
                                    Inactive
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {chef.description}
                              </p>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                  <span className="text-sm font-medium">
                                    {chef.rating}
                                  </span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  ({chef.reviewCount} reviews)
                                </span>
                              </div>
                            </div>
                            {!isInactive && (
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  );
}
