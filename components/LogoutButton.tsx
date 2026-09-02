"use client";

import { useRouter } from "next/navigation";
import { LoaderCircle, LogOut } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LogoutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    setIsSigningOut(true);

    await supabase.auth.signOut();

    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={isSigningOut}
      onClick={() => void signOut()}
      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white disabled:opacity-60"
    >
      {isSigningOut ? (
        <LoaderCircle className="animate-spin" size={20} />
      ) : (
        <LogOut size={20} />
      )}

      {isSigningOut ? "Signing Out..." : "Sign Out"}
    </button>
  );
}