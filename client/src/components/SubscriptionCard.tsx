
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import type { SubscriptionPlan } from "@shared/schema";

interface SubscriptionCardProps {
  plan: SubscriptionPlan;
  onSubscribe: (planId: string) => void;
  isSubscribed?: boolean;
}

export function SubscriptionCard({ plan, onSubscribe, isSubscribed }: SubscriptionCardProps) {
  const deliveryDays = plan.deliveryDays as string[];
  
  return (
    <Card className={isSubscribed ? "border-primary" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{plan.name}</CardTitle>
          {isSubscribed && <Badge>Subscribed</Badge>}
        </div>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">₹{plan.price}</span>
          <span className="text-muted-foreground">/{plan.frequency}</span>
        </div>
        
        <div>
          <p className="text-sm font-semibold mb-2">Delivery Days:</p>
          <div className="flex flex-wrap gap-2">
            {deliveryDays.map(day => (
              <Badge key={day} variant="secondary" className="capitalize">
                {day}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-primary" />
            <span>Fresh daily delivery</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-primary" />
            <span>Flexible - Pause and resume anytime</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-primary" />
            <span>Quality guaranteed</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={() => onSubscribe(plan.id)}
          disabled={isSubscribed || !plan.isActive}
        >
          {isSubscribed ? "Already Subscribed" : `Subscribe - ₹${plan.price}/${plan.frequency}`}
        </Button>
      </CardFooter>
    </Card>
  );
}
