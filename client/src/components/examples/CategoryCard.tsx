import CategoryCard from '../CategoryCard';
import { UtensilsCrossed } from 'lucide-react';
import rotiImage from '@assets/generated_images/Fresh_tandoori_rotis_stack_1dcda2c7.png';

export default function CategoryCardExample() {
  return (
    <div className="max-w-sm">
      <CategoryCard
        title="Fresh Rotis & Breads"
        description="Tandoori rotis, naan, and more freshly baked"
        itemCount="20+ varieties"
        image={rotiImage}
        icon={<UtensilsCrossed className="h-6 w-6 text-primary" />}
        onBrowse={() => console.log('Browse rotis')}
      />
    </div>
  );
}
