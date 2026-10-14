"use client";
import { useState } from "react";
import Link from "next/link";
import { useCampaigns } from "@/hooks/useCampaigns";
import CampaignCard from "@/components/CampaignCard";
import { Empty } from "@/components/ui";
import { enumKey } from "@/lib/status";

const FILTERS = ["all", "active", "funded", "milestones", "completed", "failed"] as const;

export default function HomePage() {
  const { data, error, loading } = useCampaigns();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");

  // Drafts are only editable by their maker, so they stay out of the public list.
  const rows = (data ?? []).filter((r) => enumKey(r.account.status) !== "draft");
  const shown = filter === "all" ? rows : rows.filter((r) => enumKey(r.account.status) === filter);

  return (
    <div className="space-y-8">
      <section className="glass p-8 sm:p-10">
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Crowdfunding where the money is released by milestones, not by trust.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-neutral-400">
          Contributions go into a program-controlled escrow. The maker receives funds one tranche at a time, only after
          contributors approve each milestone. No private key controls the vault, and a missed goal means full refunds.
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/create" className="btn btn-primary">Create a campaign</Link>
          <a href="#campaigns" className="btn btn-ghost">Browse campaigns</a>
        </div>
      </section>

      <section id="campaigns">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-400">Campaigns</h2>
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs capitalize transition ${
                  filter === f ? "bg-white/10 text-white" : "text-neutral-500 hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        {loading && !data && <p className="text-sm text-neutral-500">Loading campaigns from Devnet...</p>}
        {error && <Empty>Could not load campaigns: {error}</Empty>}
        {data && shown.length === 0 && <Empty>No campaigns here yet.</Empty>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((r) => (
            <CampaignCard key={r.address.toBase58()} row={r} />
          ))}
        </div>
      </section>
    </div>
  );
}
