import { cookies } from "next/headers";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { ToastProvider } from "@/components/async-boundary";
import { HydrateStore } from "@/components/hydrate-store";
import { KeepAlive } from "@/components/keep-alive";
import { SESSION_COOKIE } from "@/lib/auth-session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const authEnabled = cookieStore.has(SESSION_COOKIE);
  return (
    <ToastProvider>
      <HydrateStore />
      <KeepAlive />
      <div className="flex h-screen overflow-hidden">
        <Sidebar authEnabled={authEnabled} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
