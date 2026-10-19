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
  const rows = (data ?? []).filter((r) => enumKey(r.account.status) !== "draft");
  const shown = filter === "all" ? rows : rows.filter((r) => enumKey(r.account.status) === filter);

  return (
    <div className="space-y-20">
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h1 className="text-[44px] font-semibold leading-[1.05] tracking-tight text-white sm:text-[58px]">
            Capital that
            <br />
            <span className="text-neutral-500">settles itself.</span>
          </h1>
          <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-neutral-400">
            A crowdfunding protocol on Solana. Contributions are held in a vault controlled by the program, released to the
            founder only when milestones are approved, and automatically refunded if the target is not met.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/create" className="btn btn-primary">Launch a campaign</Link>
            <a href="#campaigns" className="btn btn-ghost">Browse campaigns</a>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="panel p-6">
            <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Founders</div>
            <h3 className="mt-3 text-xl font-semibold text-white">Raise with proof</h3>
            <p className="mt-2 text-sm text-neutral-400">Present your company and launch a milestone-based campaign on Devnet.</p>
            <ul className="mt-5 space-y-2.5 text-sm text-neutral-300">
              <li>Create a campaign with a token and milestones</li>
              <li>Submit proof for each milestone</li>
              <li>Funds released only after approval</li>
            </ul>
            <Link href="/create" className="btn btn-ghost mt-6 w-full">Connect wallet as founder</Link>
          </div>
          <div className="panel p-6">
            <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Contributors</div>
            <h3 className="mt-3 text-xl font-semibold text-white">Back with protection</h3>
            <p className="mt-2 text-sm text-neutral-400">Discover and fund campaigns with on-chain guarantees.</p>
            <ul className="mt-5 space-y-2.5 text-sm text-neutral-300">
              <li>Vote on each milestone, weighted by stake</li>
              <li>Receive a non-transferable receipt NFT</li>
              <li>Automatic refunds if the target is missed</li>
            </ul>
            <a href="#campaigns" className="btn btn-primary mt-6 w-full">Connect wallet as contributor</a>
          </div>
        </div>
      </section>

      <section id="campaigns" className="scroll-mt-24">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">Campaigns</h2>
            <p className="mt-1 text-sm text-neutral-500">Live on Solana Devnet. Read directly from chain.</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3.5 py-1.5 text-xs capitalize transition ${
                  filter === f ? "bg-white text-black" : "border border-white/10 text-neutral-400 hover:text-white"
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
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((r) => (
            <CampaignCard key={r.address.toBase58()} row={r} />
          ))}
        </div>
      </section>
    </div>
  );
}
