import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { WorkspaceEffects } from '@/components/app/WorkspaceEffects';

export function Layout() {
  const isSidebarOpen = useAppStore((state) => state.isSidebarOpen);

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-[var(--appBg)] text-[var(--appText)] font-sans">
      <WorkspaceEffects />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_30%),linear-gradient(135deg,transparent,rgba(255,255,255,0.04))]" />
      <Sidebar />
      <main 
        className={cn(
          "relative flex-1 flex flex-col h-full transition-all duration-300 ease-in-out",
          isSidebarOpen ? "ml-64" : "ml-0"
        )}
      >
        <Outlet />
      </main>
    </div>
  );
}
