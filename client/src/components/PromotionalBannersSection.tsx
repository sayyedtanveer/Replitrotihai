
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import type { PromotionalBanner } from "@shared/schema";

interface PromotionalBannersSectionProps {
  onSubscriptionClick: () => void;
  onCategoryClick: (categoryId: string) => void;
}

export default function PromotionalBannersSection({
  onSubscriptionClick,
  onCategoryClick,
}: PromotionalBannersSectionProps) {
  const { data: banners = [] } = useQuery<PromotionalBanner[]>({
    queryKey: ["/api/promotional-banners"],
  });

  if (banners.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-3 py-4 space-y-4">
      {banners.map((banner) => (
        <div
          key={banner.id}
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-${banner.gradientFrom} via-${banner.gradientVia} to-${banner.gradientTo} p-4 sm:p-6`}
        >
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-2 left-4 text-6xl">{banner.emoji1}</div>
            <div className="absolute bottom-2 right-8 text-5xl">{banner.emoji2}</div>
            <div className="absolute top-1/2 right-1/4 text-4xl">{banner.emoji3}</div>
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">
                {banner.title}
              </h3>
              <p className="text-sm text-white/80">{banner.subtitle}</p>
            </div>
            <Button
              onClick={() => {
                if (banner.actionType === "subscription") {
                  onSubscriptionClick();
                } else if (banner.actionType === "category" && banner.actionValue) {
                  onCategoryClick(banner.actionValue);
                } else if (banner.actionType === "url" && banner.actionValue) {
                  window.open(banner.actionValue, "_blank");
                }
              }}
              className="bg-white text-orange-600 hover:bg-white/90 font-semibold shadow-lg"
            >
              {banner.buttonText}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      ))}
    </section>
  );
}
