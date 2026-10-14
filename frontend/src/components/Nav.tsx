"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

// The wallet button touches window; load it on the client only.
const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const links = [
  { href: "/", label: "Campaigns" },
  { href: "/create", label: "Create" },
  { href: "/dashboard/maker", label: "Maker" },
  { href: "/dashboard/contributor", label: "Contributor" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <header className="border-b border-white/5">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-lg font-semibold tracking-tight text-white">
            Fundra
          </Link>
          <nav className="flex gap-1">
            {links.map((l) => {
              const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-lg px-3 py-1.5 text-sm transition ${
                    active ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <WalletMultiButton />
      </div>
    </header>
  );
}
