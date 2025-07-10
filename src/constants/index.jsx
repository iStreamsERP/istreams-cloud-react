import {
  CalendarClock,
  ClipboardListIcon,
  FileCheck2,
  FileSearch,
  FileText,
  Home,
  Landmark,
  LayoutDashboard,
  LayoutGrid,
  LibraryBig,
  NotebookPen,
  ShieldUser,
  Upload,
  UploadCloud,
  UserCog,
  Users,
} from "lucide-react";

export const getNavbarLinks = (isAdmin) => [
  ...(isAdmin
    ? [
        {
          title: "MAIN",
          links: [
            {
              label: "Dashboard",
              icon: Home,
              children: [
                {
                  label: "Finance",
                  icon: Landmark,
                  path: "/dashboard-module/Finance",
                },
                {
                  label: "HRMS",
                  icon: Users,
                  path: "/dashboard-module/HRMS",
                },
                {
                  label: "Production",
                  icon: UserCog,
                  path: "/dashboard-module/Production",
                },
              ],
            },
          ],
        },
      ]
    : []),
  {
    title: "AI Integration",
    links: [
      {
        label: "Invoice Booking",
        icon: NotebookPen,
        path: "/new-invoice",
      },
    ],
  },
];
