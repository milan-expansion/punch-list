import Link from "next/link";
import {
  Building2,
  Camera,
  ClipboardCheck,
  FileCheck2,
  LayoutDashboard,
  Menu,
  Settings,
  TriangleAlert,
} from "lucide-react";
import LogoutButton from "@/components/LogoutButton";

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Clinics",
    href: "/projects",
    icon: Building2,
  },
  {
    name: "Deficiencies",
    href: "/deficiencies",
    icon: TriangleAlert,
  },
  {
    name: "Photos",
    href: "/photos",
    icon: Camera,
  },
  {
    name: "Closeout",
    href: "/closeout",
    icon: FileCheck2,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

type AppShellProps = {
  children: React.ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm lg:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#238bac] text-white">
            <ClipboardCheck size={20} />
          </div>

          <div>
            <p className="font-bold leading-tight text-[#374151]">
              Milan Laser
            </p>

            <p className="text-xs text-slate-500">
              Punch List
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-label="Open navigation"
          className="rounded-lg border border-slate-200 p-2 text-slate-600"
        >
          <Menu size={21} />
        </button>
      </header>

      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col bg-[#374151] text-white lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#04b0b9] text-white shadow-lg">
            <ClipboardCheck size={24} />
          </div>

          <div>
            <p className="text-lg font-bold leading-tight">
              Milan Laser
            </p>

            <p className="text-sm text-slate-300">
              Construction Punch List
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-2 px-4 py-6">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
              >
                <Icon size={20} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <LogoutButton />

          <div className="mt-2 rounded-xl bg-white/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Field ready
            </p>

            <p className="mt-1 text-sm text-white">
              Optimized for phones and tablets
            </p>
          </div>
        </div>
      </aside>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}