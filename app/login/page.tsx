"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardCheck,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  Mail,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail.endsWith("@milanlaser.com")) {
      setErrorMessage(
        "Please use your Milan Laser company email address.",
      );
      return;
    }

    setIsSigningIn(true);
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      setErrorMessage(
        error.message === "Invalid login credentials"
          ? "The email address or password is incorrect."
          : error.message,
      );

      setIsSigningIn(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#374151] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#04b0b9] shadow-lg">
            <ClipboardCheck size={32} />
          </div>

          <h1 className="mt-5 text-2xl font-bold">
            Milan Laser
          </h1>

          <p className="mt-1 text-slate-300">
            Construction Punch List
          </p>
        </div>

        <section className="rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#238bac]/10 text-[#238bac]">
              <LockKeyhole size={20} />
            </div>

            <div>
              <h2 className="font-bold text-[#374151]">
                Employee Sign In
              </h2>

              <p className="text-sm text-slate-500">
                Use your Milan company account.
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Company Email
              </label>

              <div className="relative">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />

                <input
                  type="email"
                  value={email}
                  required
                  autoComplete="email"
                  placeholder="name@milanlaser.com"
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  className="min-h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm outline-none focus:border-[#238bac] focus:ring-4 focus:ring-[#238bac]/10"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Password
              </label>

              <div className="relative">
                <LockKeyhole
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />

                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  required
                  autoComplete="current-password"
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  className="min-h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-12 text-sm outline-none focus:border-[#238bac] focus:ring-4 focus:ring-[#238bac]/10"
                />

                <button
                  type="button"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  onClick={() =>
                    setShowPassword((current) => !current)
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSigningIn}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#238bac] px-5 font-bold text-white transition hover:bg-[#0086aa] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSigningIn ? (
                <>
                  <LoaderCircle
                    className="animate-spin"
                    size={19}
                  />
                  Signing In...
                </>
              ) : (
                <>
                  <LogIn size={19} />
                  Sign In
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-5 text-slate-400">
            Access is limited to authorized Milan Laser employees.
          </p>
        </section>
      </div>
    </main>
  );
}