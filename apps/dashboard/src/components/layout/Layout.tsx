import { createContext, useContext, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useApp } from '../../lib/app-context';
import { Sidebar } from './Sidebar';
import { Icon } from '../ui/Icon';

const MenuContext = createContext<{ open: () => void }>({ open: () => {} });
export const useMenu = () => useContext(MenuContext);

export function Layout() {
  const { t, dir, theme } = useApp();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  // Effects must return nothing or a cleanup function — keep bodies in braces.
  useEffect(() => {
    setDrawerOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  return (
    <MenuContext.Provider value={{ open: () => setDrawerOpen(true) }}>
      <div className="flex min-h-screen bg-canvas text-ink">
        <aside className="sticky top-0 hidden h-screen w-[260px] flex-none overflow-y-auto lg:block">
          <Sidebar />
        </aside>

        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-navy-ink/60" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
            <aside className="absolute inset-y-0 start-0 w-[280px] max-w-[85vw] overflow-y-auto shadow-pop">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label={t.closeMenu}
                className="absolute end-3 top-3 z-10 inline-flex size-11 cursor-pointer items-center justify-center rounded-xl border-0 bg-white/[.08] text-on-dark"
              >
                <Icon name="close" />
              </button>
              <Sidebar onNavigate={() => setDrawerOpen(false)} />
            </aside>
          </div>
        )}

        <main className="flex min-w-0 flex-1 flex-col">
          <Outlet />
        </main>
      </div>

      <Toaster
        dir={dir}
        position="bottom-center"
        offset={{ bottom: 104 }}
        mobileOffset={{ bottom: 150 }}
        theme={theme}
        toastOptions={{
          classNames: {
            toast: '!bg-navy !text-white !border !border-white/[.12] !rounded-2xl !font-sans !text-sm !font-bold !shadow-pop',
            actionButton: '!bg-gold !text-navy-ink !font-extrabold !rounded-[10px] !h-9 !px-3.5',
            closeButton: '!bg-navy !text-white !border-white/20',
          },
        }}
        closeButton
      />
    </MenuContext.Provider>
  );
}
