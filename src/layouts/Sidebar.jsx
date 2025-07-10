import logoDark from "@/assets/logo-dark.png";
import logoLight from "@/assets/logo-light.png";
import { getNavbarLinks } from "@/constants";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "lucide-react"; // assuming this is used for the dropdown
import PropTypes from "prop-types";
import React, { forwardRef } from "react";
import { NavLink } from "react-router-dom";

export const Sidebar = forwardRef(({ collapsed }, ref) => {
  const [expandedMenu, setExpandedMenu] = React.useState(null);
  // const navbarLinks = getNavbarLinks(userData.isAdmin);
  const navbarLinks = getNavbarLinks(true);

  const toggleMenu = (label) => {
    setExpandedMenu((current) => (current === label ? null : label));
  };

  return (
    <aside
      ref={ref}
      className={cn(
        "fixed z-[50] flex h-full flex-col overflow-x-hidden border-r border-slate-300 bg-white transition-all duration-300 dark:border-slate-700 dark:bg-slate-900",
        collapsed ? "md:w-[50px] md:items-center" : "md:w-[180px]",
        collapsed ? "max-md:-left-full" : "max-md:left-0"
      )}
    >
      {/* Logo - Reduced padding in collapsed mode */}
      <div
        className={cn(
          "flex p-2 mx-auto",
          collapsed ? "py-2 px-0" : "gap-x-3 p-2"
        )}
      >
        <img
          src={logoLight}
          alt="iStreams ERP Solutions | CRM"
          className={cn(
            "dark:hidden object-contain",
            collapsed ? "h-8" : "h-10"
          )}
        />
        <img
          src={logoDark}
          alt="iStreams ERP Solutions | CRM"
          className={cn(
            "hidden dark:block object-contain",
            collapsed ? "h-8" : "h-10"
          )}
        />
      </div>

      <div className="p-2">
        <div className="flex flex-col gap-y-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
          {navbarLinks.map((navbarLink) => (
            <div key={navbarLink.title} className="w-full">
              {/* Hide group titles in collapsed view */}
              {!collapsed && (
                <p className="text-[10px] font-semibold uppercase leading-none text-slate-400 pr-3">
                  {navbarLink.title}
                </p>
              )}

              {navbarLink.links.map((link) => {
                const hasChildren = link.children && link.children.length > 0;
                return (
                  <React.Fragment key={link.label}>
                    {hasChildren ? (
                      <div className="w-full">
                        <button
                          onClick={() => toggleMenu(link.label)}
                          className={cn(
                            "sidebar-item",
                            collapsed ? "justify-center" : "justify-start"
                          )}
                        >
                          {/* Consistent icon size */}
                          <link.icon size={14} className="flex-shrink-0" />
                          {!collapsed && (
                            <>
                              <p className="whitespace-nowrap">{link.label}</p>
                              <ChevronDownIcon
                                className={cn(
                                  "ml-auto h-4 w-4 transition-transform",
                                  expandedMenu === link.label
                                    ? "rotate-180"
                                    : ""
                                )}
                              />
                            </>
                          )}
                        </button>
                        {expandedMenu === link.label && !collapsed && (
                          <div className="ml-4">
                            {link.children.map((child) => (
                              <NavLink
                                key={child.label}
                                to={child.path}
                                className={cn("sidebar-item")}
                              >
                                <child.icon size={14} className="flex-shrink-0" />
                                {!collapsed && (
                                  <p className="break-words max-w-full w-full leading-snug">
                                    {child.label}
                                  </p>
                                )}
                              </NavLink>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <NavLink
                        to={link.path}
                        className={({ isActive }) =>
                          cn(
                            "sidebar-item",
                            collapsed ? "justify-center" : "justify-start",
                            isActive && "active" // Ensure active state works
                          )
                        }
                        title={link.label}
                      >
                        {/* Consistent icon size */}
                        <link.icon size={14} className="flex-shrink-0" />
                        {!collapsed && (
                          <p className="break-words max-w-[calc(100%-1rem)] leading-snug">
                            {link.label}
                          </p>
                        )}
                      </NavLink>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
});

Sidebar.displayName = "Sidebar";