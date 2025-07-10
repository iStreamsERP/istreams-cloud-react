import Notification from "@/components/Notification";
import { useTheme } from "@/components/theme-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import {
  Bell,
  BellOff,
  BriefcaseBusiness,
  CalendarCheck2,
  CloudMoon,
  CloudSun,
  FileSearch,
  LayoutGrid,
  LogOut,
  Maximize,
  Minimize,
  PanelLeftClose,
  Settings2,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export const Header = ({ collapsed, setCollapsed }) => {
  const { userData, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotification, setShowNotification] = useState(false); // Start as hidden

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const toggleNotification = () => {
    setShowNotification(!showNotification);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const apps = [
    {
      label: "DMS",
      icon: <FileSearch className="w-6 h-6 text-[#4FC3F7]" />,
      path: "https://dms.istreams-erp.com/",
    },
    {
      label: "CRM",
      icon: <BriefcaseBusiness className="w-6 h-6 text-[#81C784]" />,
      path: "https://crm.istreams-erp.com/",
    },
    {
      label: "Task Management",
      icon: <CalendarCheck2 className="w-6 h-6 text-[#FFD54F]" />,
      path: "https://task.istreams-erp.com/",
    },
  ];

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-3 py-2 bg-white shadow-sm dark:bg-slate-900">
      {/* Left: Logo and Collapse */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 p-0"
          onClick={() => setCollapsed(!collapsed)}
        >
          <PanelLeftClose
            className={`h-5 w-5 transition-transform ${
              collapsed ? "rotate-180" : ""
            }`}
          />
        </Button>

        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/"
            className="text-sm font-semibold whitespace-nowrap hover:text-primary transition-colors"
          >
            iStreams cloud
          </Link>
        </div>
      </div>

      {/* Right: Controls */}
      <nav className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 relative"
          onClick={toggleNotification}
          title={showNotification ? "Hide notifications" : "Show notifications"}
        >
          {showNotification ? (
            <Bell className="h-5 w-5" />
          ) : (
            <BellOff className="h-5 w-5 text-gray-400" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title="Toggle theme"
        >
          {theme === "dark" ? (
            <CloudSun className="h-5 w-5" />
          ) : (
            <CloudMoon className="h-5 w-5" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 hidden md:flex"
          onClick={toggleFullScreen}
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? (
            <Minimize className="h-5 w-5" />
          ) : (
            <Maximize className="h-5 w-5" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <LayoutGrid className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-80 p-4 grid grid-cols-3 gap-4 rounded-xl"
            align="end"
          >
            {apps.map((app) => (
              <div
                key={app.label}
                className="flex flex-col items-center justify-center text-center rounded-lg p-3 cursor-pointer transition-all duration-200 hover:bg-gray-100 dark:hover:bg-slate-800"
                onClick={() => window.open(app.path, "_blank")}
                title={app.label}
              >
                <div className="relative">{app.icon}</div>
                <span className="text-xs font-medium mt-2 max-w-[72px] overflow-hidden text-ellipsis whitespace-nowrap">
                  {app.label}
                </span>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 focus:outline-none">
            <Avatar className="h-9 w-9">
              <AvatarImage
                src={userData?.userAvatar}
                alt={userData?.userName}
              />
              <AvatarFallback>
                {userData?.userName?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:flex flex-col items-start leading-tight">
              <span className="text-sm font-medium truncate max-w-[120px]">
                {userData?.userName}
              </span>
              <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                {userData?.userEmail}
              </span>
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-64 mt-2" align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium truncate">
                  {userData?.userName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {userData?.userEmail}
                </p>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                Profile
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => navigate("/account-settings")}>
                <div className="flex justify-between items-center w-full">
                  Account Settings <Settings2 size={16} />
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 focus:text-red-700"
              >
                <div className="flex justify-between items-center w-full">
                  Log out <LogOut size={16} />
                </div>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem className="p-0">
              <Button className="w-full h-9 text-sm">Upgrade to Pro</Button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notification component */}
        {showNotification && (
          <Notification onClose={() => setShowNotification(false)} />
        )}
      </nav>
    </header>
  );
};
