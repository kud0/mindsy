"use client";

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Crown, Check, X, Sparkles } from 'lucide-react';

interface SubscriptionTabProps {
  currentTier: 'free' | 'student' | 'premium';
}

export function SubscriptionTab({ currentTier }: SubscriptionTabProps) {
  const plans = [
    {
      id: 'free',
      name: 'Free',
      icon: Sparkles,
      price: '$0',
      period: 'forever',
      description: 'Perfect for getting started',
      features: [
        { name: 'Up to 10 lectures per month', included: true },
        { name: 'Basic AI study tools', included: true },
        { name: 'Quiz generation', included: true },
        { name: 'Mobile access', included: true },
        { name: 'Advanced AI features', included: false },
        { name: 'Unlimited lectures', included: false },
        { name: 'Priority support', included: false },
      ],
    },
    {
      id: 'student',
      name: 'Student',
      icon: Crown,
      price: '$9.99',
      period: 'per month',
      description: 'Everything you need to excel',
      features: [
        { name: 'Unlimited lectures', included: true },
        { name: 'Advanced AI study tools', included: true },
        { name: 'Custom quiz generation', included: true },
        { name: 'Mobile access', included: true },
        { name: 'PDF exports', included: true },
        { name: 'Pomodoro timer', included: true },
        { name: 'Priority support', included: false },
      ],
      badge: 'Popular',
    },
    {
      id: 'premium',
      name: 'Premium',
      icon: Crown,
      price: '$19.99',
      period: 'per month',
      description: 'For power users',
      features: [
        { name: 'Everything in Student', included: true },
        { name: 'Priority AI processing', included: true },
        { name: 'Advanced analytics', included: true },
        { name: 'Custom branding', included: true },
        { name: 'API access', included: true },
        { name: '24/7 priority support', included: true },
        { name: 'Early access to features', included: true },
      ],
    },
  ];

  const currentPlan = plans.find((p) => p.id === currentTier) || plans[0];

  return (
    <div className="space-y-6">
      {/* Current Plan Header */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex-1">
            <h3 className="text-base md:text-lg font-semibold text-foreground flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Current Plan: {currentPlan.name}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {currentPlan.description}
            </p>
          </div>
          <div className="text-left md:text-right">
            <div className="text-2xl font-bold text-foreground">{currentPlan.price}</div>
            <div className="text-xs text-muted-foreground">{currentPlan.period}</div>
          </div>
        </div>
      </div>

      {/* Plan Comparison */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Available Plans</h3>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = plan.id === currentTier;

            return (
              <Card
                key={plan.id}
                className={`relative rounded-lg border-2 p-4 md:p-6 transition-all hover:border-primary/50 ${
                  isCurrent
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-full">
                      {plan.badge}
                    </span>
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute top-3 right-3 md:top-4 md:right-4">
                    <span className="bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-1 rounded-md">
                      Current
                    </span>
                  </div>
                )}

                <div className="text-center mb-4 md:mb-6">
                  <Icon className={`w-10 h-10 mx-auto mb-3 ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`} />
                  <h4 className="text-xl font-bold text-foreground">{plan.name}</h4>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">/{plan.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                </div>

                <ul className="space-y-2.5 mb-4 md:mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm">
                      {feature.included ? (
                        <Check className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      )}
                      <span className={feature.included ? 'text-foreground' : 'text-muted-foreground'}>
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={isCurrent ? 'outline' : plan.id === 'student' ? 'default' : 'outline'}
                  className="w-full h-12 text-base font-semibold rounded-lg min-h-[44px]"
                  disabled={isCurrent}
                >
                  {isCurrent ? 'Current Plan' : 'Upgrade'}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Billing Information (for paid plans) */}
      {currentTier !== 'free' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Billing Information</h3>
          <Card className="border rounded-lg p-4 md:p-6 bg-card">
            <div className="space-y-3 text-sm md:text-base">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Billing Period:</span>
                <span className="font-medium text-foreground">Monthly</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Next Billing Date:</span>
                <span className="font-medium text-foreground">Coming Soon</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Payment Method:</span>
                <span className="font-medium text-foreground">Coming Soon</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button
                variant="outline"
                className="w-full h-12 text-base rounded-lg min-h-[44px]"
                disabled
              >
                Manage Billing (Coming Soon)
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
