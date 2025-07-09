import { useTheme } from "@/components/theme-provider";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import {
  Bell,
  BellOff,
  CloudMoon,
  CloudSun,
  LogOut,
  Maximize,
  MenuIcon,
  Minimize,
  PanelLeftClose,
  Settings2,
} from "lucide-react";
import PropTypes from "prop-types";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Notification from "@/components/Notification";

export const Header = ({ collapsed, setCollapsed }) => {
  const { userData, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const navigate = useNavigate();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotification, setShowNotification] = useState(true); // Default notification is on

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const toggleNotification = () => {
    setShowNotification(!showNotification);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  
  return (
    <header className="relative z-10 flex p-3 items-center justify-between bg-white shadow-md transition-colors dark:bg-slate-900">
      <div className="flex items-center gap-x-2">
        <Button
          variant="ghost"
          onClick={() => setCollapsed(!collapsed)}
        >
          <MenuIcon className={collapsed ? "rotate-180 " : ""} />
        </Button>
        <Link to="/" className="hidden md:block text-sm font-semibold whitespace-nowrap cursor-pointer hover:text-gray-300">
          iStreamsCloud
        </Link>
      </div>

      <nav className="flex items-center justify-end w-full">
        <div className="flex items-center gap-2">
          {/* <div className="border border-gray-700 px-2 py-2 rounded-lg text-sm font-semibold hidden lg:block">
            {userData.organization}
          </div> */}

          {/* Notification Toggle Button */}
          <Button
            variant="ghost"
            onClick={toggleNotification}
            className="relative"
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
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <CloudSun />
            ) : (
              <CloudMoon />
            )}
          </Button>
          <DropdownMenu >
            <DropdownMenuTrigger className="flex items-start gap-2">
              <Avatar>
                <AvatarImage src={userData.userAvatar} alt={userData.userName} />
                <AvatarFallback>{userData.userName}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start">
                <span className="text-lg font-semibold leading-6">
                  {userData.userName}
                </span>
                <span className="text-xs text-gray-400">
                  {userData.userEmail}
                </span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[250px]">
              <DropdownMenuLabel className="flex flex-col justify-between items-start mb-2">
                <p className="text-md font-medium">
                  {userData.userName}
                </p>
                <p className="text-xs font-normal text-gray-400">
                  {userData.userEmail}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuGroup>
          
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 flex justify-between items-center cursor-pointer">
                  Log out <LogOut />
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {/* Conditionally render the Notification component */}
        {showNotification && <Notification />}
      </nav>
    </header>
  );
};

Header.propTypes = {
  collapsed: PropTypes.bool,
  setCollapsed: PropTypes.func,
};