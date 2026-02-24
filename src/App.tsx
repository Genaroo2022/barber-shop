import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy, type ReactElement, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { isAuthenticated } from "./lib/auth";
import { ADMIN_ROUTE, LOGIN_ROUTE } from "./lib/routes";

const queryClient = new QueryClient();
const Login = lazy(() => import("./pages/Login"));
const Admin = lazy(() => import("./pages/Admin"));
const MIN_SCROLL_DURATION_MS = 280;
const MAX_SCROLL_DURATION_MS = 900;
const DURATION_PER_PIXEL = 0.45;

const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const getNavbarOffset = (): number => {
  const nav = document.querySelector("nav.fixed");
  if (!nav) return 64;
  const navHeight = nav.getBoundingClientRect().height;
  return Math.max(56, Math.ceil(navHeight + 4));
};

const RequireAuth = ({ children }: { children: ReactElement }) => {
  if (!isAuthenticated()) {
    return <Navigate to={LOGIN_ROUTE} replace />;
  }
  return children;
};

const RouteLoadingFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="h-7 w-7 rounded-full border-2 border-gold/30 border-t-gold animate-spin" aria-label="Cargando" />
  </div>
);

const App = () => {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest('a[href^="#"]') as HTMLAnchorElement | null;
      if (!anchor) return;
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || href === "#") return;
      const id = href.slice(1);
      const element = document.getElementById(id);
      if (!element) return;

      event.preventDefault();

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reducedMotion) {
        element.scrollIntoView({ behavior: "auto", block: "start" });
        return;
      }

      const startY = window.scrollY;
      const targetY = Math.max(0, element.getBoundingClientRect().top + window.scrollY - getNavbarOffset());
      const delta = targetY - startY;
      const durationMs = Math.min(
        MAX_SCROLL_DURATION_MS,
        Math.max(MIN_SCROLL_DURATION_MS, Math.abs(delta) * DURATION_PER_PIXEL)
      );
      const startTime = performance.now();

      const tick = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / durationMs);
        const eased = easeInOutCubic(progress);
        window.scrollTo({ top: startY + delta * eased, behavior: "auto" });
        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          history.replaceState(null, "", `#${id}`);
        }
      };

      requestAnimationFrame(tick);
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            <Route path="/" element={<Index />} />
            <Route
              path={LOGIN_ROUTE}
              element={
                <Suspense fallback={<RouteLoadingFallback />}>
                  <Login />
                </Suspense>
              }
            />
            <Route
              path={ADMIN_ROUTE}
              element={
                <RequireAuth>
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <Admin />
                  </Suspense>
                </RequireAuth>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
