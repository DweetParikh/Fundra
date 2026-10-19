"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { useFundraProgram } from "@/hooks/useFundraProgram";
import { shortKey } from "@/lib/format";

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const links = [
  { href: "/", label: "Overview" },
  { href: "/#protocol", label: "Protocol" },
];

export default function Nav({ network }: { network: "devnet" | "checking" | "error" }) {
  const path = usePathname();
  const { publicKey } = useFundraProgram();
  const pillTone =
    network === "devnet" ? "text-neutral-200" : network === "checking" ? "text-neutral-500" : "text-neutral-400";

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#050506]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-5 py-3.5">
        <div className="flex items-center gap-10">
          <Link href="/" className="text-[17px] font-semibold tracking-tight text-white">
            Fundra
          </Link>
          <nav className="hidden items-center gap-7 md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`text-sm transition ${path === l.href ? "text-white" : "text-neutral-400 hover:text-white"}`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          <span className={`pill ${pillTone}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${network === "devnet" ? "bg-white" : "bg-neutral-600"}`} />
            Devnet only
          </span>
          {publicKey && (
            <>
              <Link href="/dashboard/maker" className="pill hidden hover:text-white sm:inline-flex">
                Founder / {shortKey(publicKey, 4)}
              </Link>
              <Link href="/dashboard/contributor" className="pill hidden hover:text-white sm:inline-flex">
                Contributor
              </Link>
            </>
          )}
          <WalletMultiButton />
        </div>
      </div>
    </header>
  );
}
