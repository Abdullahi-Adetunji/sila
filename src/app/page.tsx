"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "./lib/session";

export default function Home() {
  const { user, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/couple" : "/login");
  }, [user, loading, router]);

  return (
    <main className="mx-auto max-w-sm px-4 pt-16 text-sm text-muted">Loading Sila…</main>
  );
}
