import { type Subscription } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, TrendingUp, Star, AlertTriangle } from "lucide-react";

interface MetricsCardsProps {
  subscriptions: Subscription[];
}

export default function MetricsCards({ subscriptions }: MetricsCardsProps) {
  const metrics = {
    totalMonthly: subscriptions
      .filter(sub => sub.status === "active")
      .reduce((sum, sub) => {
        if (sub.billingCycle === "monthly") {
          return sum + parseFloat(sub.cost);
        } else if (sub.billingCycle === "annual") {
          return sum + (parseFloat(sub.cost) / 12);
        }
        return sum;
      }, 0),
    
    totalAnnual: subscriptions
      .filter(sub => sub.status === "active")
      .reduce((sum, sub) => {
        if (sub.billingCycle === "annual") {
          return sum + parseFloat(sub.cost);
        } else if (sub.billingCycle === "monthly") {
          return sum + (parseFloat(sub.cost) * 12);
        }
        return sum;
      }, 0),
    
    activeCount: subscriptions.filter(sub => sub.status === "active").length,
    
    expiringSoon: subscriptions.filter(sub => {
      if (sub.status !== "active") return false;
      const now = new Date();
      const renewalDate = new Date(sub.renewalDate);
      const daysDiff = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff <= 30 && daysDiff >= 0;
    }).length
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <Card className="bg-card rounded-lg border border-border shadow-sm" data-testid="card-total-monthly">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Total Monthly</p>
              <p className="text-3xl font-bold text-foreground" data-testid="text-total-monthly">
                ${metrics.totalMonthly.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Calendar className="text-primary text-xl" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-card rounded-lg border border-border shadow-sm" data-testid="card-total-annual">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Total Annual</p>
              <p className="text-3xl font-bold text-foreground" data-testid="text-total-annual">
                ${metrics.totalAnnual.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-success text-xl" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-card rounded-lg border border-border shadow-sm" data-testid="card-active-count">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Active Subscriptions</p>
              <p className="text-3xl font-bold text-foreground" data-testid="text-active-count">
                {metrics.activeCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
              <Star className="text-warning text-xl" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-card rounded-lg border border-border shadow-sm" data-testid="card-expiring-soon">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Expiring Soon</p>
              <p className="text-3xl font-bold text-destructive" data-testid="text-expiring-soon">
                {metrics.expiringSoon}
              </p>
            </div>
            <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-destructive text-xl" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
