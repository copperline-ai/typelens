import { cookies } from "next/headers";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { ToastProvider } from "@/components/async-boundary";
import { HydrateStore } from "@/components/hydrate-store";
import { KeepAlive } from "@/components/keep-alive";
import { SwipeNav } from "@/components/swipe-nav";
import { DemoSessionBanner } from "@/components/demo-session-banner";
import { OnboardingCheckpoint } from "@/components/onboarding-checkpoint";
import { decodeSessionToken, SESSION_COOKIE } from "@/lib/auth-session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await decodeSessionToken(token) : null;
  const authEnabled = !!session;
  return (
    <ToastProvider>
      <HydrateStore isDemo={session?.isDemo ?? false} />
      <KeepAlive />
      <div className="flex h-dvh flex-col overflow-hidden">
        {session?.isDemo && <DemoSessionBanner expiresAt={session.exp * 1000} />}
        <div className="flex flex-1 overflow-hidden">
          <SwipeNav />
          <Sidebar authEnabled={authEnabled} />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header authEnabled={authEnabled} />
            <main className="flex-1 overflow-auto p-4 sm:p-6">
              <OnboardingCheckpoint />
              {children}
            </main>
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}
