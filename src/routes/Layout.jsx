import { Outlet } from "react-router-dom";
import { Header } from "../layouts/Header";
import { Sidebar } from "../layouts/Sidebar";
import { cn } from "../utils/cn";
import { useMediaQuery } from "@uidotdev/usehooks";
import { useEffect, useRef, useState } from "react";
import { useClickOutside } from "../hooks/use-click-outside";
import Footer from "@/layouts/Footer";
import { Toaster } from "@/components/ui/toaster";
import ChatbotUI from "@/components/ChatbotUI";

const Layout = () => {
  const isDesktopDevice = useMediaQuery("(min-width: 768px)");
  const [collapsed, setCollapsed] = useState(!isDesktopDevice);

  const sidebarRef = useRef(null);

  useEffect(() => {
    setCollapsed(!isDesktopDevice);
  }, [isDesktopDevice]);

  useClickOutside([sidebarRef], () => {
    if (!isDesktopDevice && !collapsed) setCollapsed(true);
  });

  return (
    <div className="min-h-screen bg-slate-100 text-2xl transition-colors dark:bg-slate-950">
      <div
        className={cn(
          "pointer-events-none fixed inset-0 -z-10 bg-black opacity-0 transition-opacity",
          !collapsed &&
            "max-md:pointer-events-auto max-md:z-50 max-md:opacity-30"
        )}
      />
      <Sidebar ref={sidebarRef} collapsed={collapsed} />
      <div
        className={cn(
          "transition-[margin] duration-300",
          collapsed ? "md:ml-[50px]" : "md:ml-[180px]"
        )}
      >
        <Header collapsed={collapsed} setCollapsed={setCollapsed} />
        <main className="h-[calc(100vh-10vh)] overflow-y-auto overflow-x-hidden p-4">
          <Outlet />
          <Toaster />
        </main>
      </div>
      <ChatbotUI />
    </div>
  );
};

export default Layout;
