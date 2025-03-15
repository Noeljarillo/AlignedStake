'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, PieChart, ArrowRight, TrendingUp, GitFork, LineChart } from 'lucide-react';

const analyticsFeatures = [
  {
    title: "Delegation Flow Analysis",
    description: "Visualize delegation flows to validators over time with Gantt charts",
    icon: GitFork,
    href: "/analytics/delegation-flow",
    color: "bg-blue-500",
    isNew: true
  },
  {
    title: "Validator Performance Metrics",
    description: "Coming soon: Compare validator performance metrics, staking rewards, and APR statistics",
    icon: TrendingUp,
    href: "#",
    color: "bg-green-500",
    isComingSoon: true
  },
  {
    title: "Staking Distribution Charts",
    description: "Coming soon: Analyze staking distribution and concentration among validators with interactive charts",
    icon: PieChart,
    href: "#",
    color: "bg-purple-500",
    isComingSoon: true
  },
  {
    title: "Staking Growth Trends",
    description: "Coming soon: View historical trends and metrics on staking participation and delegator growth",
    icon: LineChart,
    href: "#",
    color: "bg-amber-500",
    isComingSoon: true
  }
];

export default function AnalyticsIndex() {
  return (
    <div className="container py-10">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Staking Analytics & Metrics</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Comprehensive analytics tools to visualize staking trends, delegation flows, 
          validator performance metrics, and detailed charts on the Starknet network.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {analyticsFeatures.map((feature) => (
          <Card key={feature.title} className="overflow-hidden border border-muted">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${feature.color} bg-opacity-10`}>
                  <feature.icon className={`h-6 w-6 ${feature.color} text-white`} />
                </div>
                {feature.isNew && (
                  <span className="px-2 py-1 text-xs rounded-full bg-blue-500 text-white">
                    New
                  </span>
                )}
                {feature.isComingSoon && (
                  <span className="px-2 py-1 text-xs rounded-full bg-amber-500 text-white">
                    Coming Soon
                  </span>
                )}
              </div>
              <CardTitle className="text-xl mt-2">{feature.title}</CardTitle>
              <CardDescription className="text-muted-foreground">
                {feature.description}
              </CardDescription>
            </CardHeader>
            <CardFooter className="pt-4 pb-6">
              {feature.isComingSoon ? (
                <Button variant="outline" disabled className="w-full">
                  Coming Soon
                </Button>
              ) : (
                <Link href={feature.href} className="w-full">
                  <Button className="w-full">
                    Explore Analytics
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
} 