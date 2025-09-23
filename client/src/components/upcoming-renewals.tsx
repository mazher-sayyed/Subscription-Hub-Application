import { type Subscription } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";

interface UpcomingRenewalsProps {
  subscriptions: Subscription[];
}

export default function UpcomingRenewals({ subscriptions }: UpcomingRenewalsProps) {
  const upcomingRenewals = subscriptions
    .filter(sub => sub.status === "active")
    .filter(sub => {
      const now = new Date();
      const renewalDate = new Date(sub.renewalDate);
      const daysDiff = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff <= 30 && daysDiff >= 0;
    })
    .sort((a, b) => new Date(a.renewalDate).getTime() - new Date(b.renewalDate).getTime())
    .slice(0, 6);

  if (upcomingRenewals.length === 0) {
    return null;
  }

  const getDaysUntilRenewal = (renewalDate: Date) => {
    const now = new Date();
    const renewal = new Date(renewalDate);
    const daysDiff = Math.ceil((renewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysDiff);
  };

  return (
    <div className="bg-gradient-to-r from-warning/10 to-destructive/10 rounded-lg border border-warning/20 p-6" data-testid="upcoming-renewals-section">
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
        <Clock className="text-warning mr-2" />
        Upcoming Renewals (Next 30 Days)
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {upcomingRenewals.map((subscription) => {
          const daysUntil = getDaysUntilRenewal(subscription.renewalDate);
          return (
            <Card key={subscription.id} className="bg-card rounded-lg border border-border" data-testid={`renewal-card-${subscription.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  {subscription.logoUrl && (
                    <img 
                      src={subscription.logoUrl} 
                      alt={subscription.name}
                      className="w-12 h-8 object-contain rounded"
                      data-testid={`img-logo-${subscription.id}`}
                    />
                  )}
                  <span 
                    className="countdown-timer text-xs px-2 py-1 rounded text-white font-medium"
                    data-testid={`countdown-${subscription.id}`}
                  >
                    {daysUntil === 0 ? "Today" : daysUntil === 1 ? "1 day" : `${daysUntil} days`}
                  </span>
                </div>
                <p className="font-medium text-foreground" data-testid={`text-name-${subscription.id}`}>
                  {subscription.name}
                </p>
                <p className="text-sm text-muted-foreground" data-testid={`text-cost-${subscription.id}`}>
                  ${subscription.cost}/{subscription.billingCycle}
                </p>
                <p className="text-xs text-muted-foreground" data-testid={`text-renewal-date-${subscription.id}`}>
                  Renews: {new Date(subscription.renewalDate).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
