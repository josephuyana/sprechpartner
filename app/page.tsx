import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100">
      <Link
        href="/conversation"
        className="flex items-center justify-center px-8 h-12 rounded-full border border-zinc-300 bg-white text-zinc-700 text-sm font-medium hover:bg-zinc-50 hover:border-zinc-400 transition-colors"
      >
        Start conversation
      </Link>
    </div>
  );
}
