import logoDark from "@/assets/logo-dark.png";
import logoLight from "@/assets/logo-light.png";
import { navbarLinks } from "@/constants";
import PropTypes from "prop-types";
import React, { forwardRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "../utils/cn";
import { ChevronDown, ChevronRight } from "lucide-react";

export const Sidebar = forwardRef(({ collapsed }, ref) => {
  const [expandedGroups, setExpandedGroups] = useState(() => {
    // Initialize all groups as expanded by default
    return navbarLinks.reduce((acc, group) => {
      acc[group.title] = true;
      return acc;
    }, {});
  });

  const toggleGroup = (title) => {
    setExpandedGroups(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  return (
    <aside
      ref={ref}
      className={cn(
        "fixed z-[100] md:z-[40] flex h-full flex-col overflow-x-hidden border-r bg-white transition-all dark:border-slate-700 dark:bg-slate-900",
        collapsed ? "md:w-[70px] md:items-center " : "w-60",
        collapsed ? "max-md:-left-full" : "max-md:left-0"
      )}
    >
      <div className="flex gap-x-3 p-3 mx-auto">
        <img
          src={logoLight}
          alt="iStreamsCloud"
          className="h-8 dark:hidden"
        />
        <img
          src={logoDark}
          alt="iStreamsCloud"
          className="hidden h-8 dark:block"
        />
      </div>
      <div className="flex w-full flex-col gap-y-1 overflow-y-auto overflow-x-hidden p-2 scrollbar-thin">
        {navbarLinks.map((navbarLink) => {
          // Get the first available icon or use a default one
          const groupIcon = navbarLink.links.length > 0 
            ? navbarLink.links[0].icon 
            : ChevronDown; // Fallback icon
          
          return (
            <div
              key={navbarLink.title}
              className={cn("flex flex-col gap-1", collapsed && "md:items-center")}
            >
              {!collapsed ? (
                <button
                  onClick={() => toggleGroup(navbarLink.title)}
                  className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <span>{navbarLink.title}</span>
                  {expandedGroups[navbarLink.title] ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              ) : (
                <button
                  onClick={() => toggleGroup(navbarLink.title)}
                  className="flex items-center justify-center w-full p-2 rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <groupIcon className="h-4 w-4" />
                </button>
              )}

              {(!collapsed || expandedGroups[navbarLink.title]) && (
                <div
                  className={cn(
                    "flex flex-col gap-1",
                    collapsed && "md:items-center",
                    !expandedGroups[navbarLink.title] && "hidden"
                  )}
                >
                  {navbarLink.links.map((link) => (
                    <NavLink
                      key={link.label}
                      to={link.path}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white",
                          collapsed && "md:justify-center md:px-3 md:py-3"
                        )
                      }
                    >
                      <link.icon className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && <span>{link.label}</span>}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
});

Sidebar.displayName = "Sidebar";

Sidebar.propTypes = {
  collapsed: PropTypes.bool,
};