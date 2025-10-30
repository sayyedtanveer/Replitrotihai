import ProductCard from '../ProductCard';
import rotiImage from '@assets/generated_images/Fresh_tandoori_rotis_stack_1dcda2c7.png';

export default function ProductCardExample() {
  return (
    <div className="max-w-sm">
      <ProductCard
        id="butter-naan"
        name="Butter Naan"
        description="Soft and fluffy naan brushed with butter, freshly baked in tandoor"
        price={45}
        image={rotiImage}
        rating={4.7}
        reviewCount={128}
        isVeg={true}
        isCustomizable={true}
        onAddToCart={(qty) => console.log('Added to cart, quantity:', qty)}
      />
    </div>
  );
}
