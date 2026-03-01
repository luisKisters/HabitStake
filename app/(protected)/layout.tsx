import { Sidebar } from "@/components/nav/sidebar";
import { BottomTabBar } from "@/components/nav/bottom-tab-bar";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh">
      <Sidebar />
      <main className="flex-1 pb-16 md:pb-0">
        <div className="mx-auto max-w-3xl p-4 md:p-8">{children}</div>
      </main>
      <BottomTabBar />
    </div>
  );
}
