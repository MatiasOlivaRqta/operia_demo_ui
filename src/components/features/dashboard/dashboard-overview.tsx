"use client";

import { HomeGreeting } from "@/components/features/dashboard/home-greeting";
import { QuickActions } from "@/components/features/dashboard/quick-actions";
import { RecentActivity } from "@/components/features/dashboard/recent-activity";
import { StockReview, shouldShowStockReview } from "@/components/features/dashboard/stock-review";
import { SummaryCards } from "@/components/features/dashboard/summary-cards";
import { useProducts } from "@/data/queries";

export function DashboardOverview() {
  const lowStock = useProducts({ lowStock: true, pageSize: 3 });
  const showStockReview = shouldShowStockReview(lowStock);
  return (
    <main
      id="contenido"
      tabIndex={-1}
      className="mx-auto w-full max-w-[90rem] px-4 py-7 sm:px-6 lg:px-8"
    >
      <HomeGreeting />
      <QuickActions />
      <SummaryCards />
      <section
        className={`mt-8 grid gap-5 ${showStockReview ? "xl:grid-cols-[1.55fr_0.95fr]" : ""}`}
      >
        <RecentActivity />
        {showStockReview && <StockReview products={lowStock} />}
      </section>
    </main>
  );
}
