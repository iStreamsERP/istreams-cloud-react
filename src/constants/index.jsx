import {
  BriefcaseBusiness,
  CalendarCheck2,
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
  {
    title: "SaaS Product",
    links: [
      {
        label: "DMS",
        icon: FileSearch,
        path: "https://dms.istreams-erp.com/",
      },
      {
        label: "CRM",
        icon: BriefcaseBusiness,
        path: "https://crm.istreams-erp.com/",
      },
      {
        label: "Task Management",
        icon: CalendarCheck2,
        path: "https://task.istreams-erp.com/",
      },
    ],
  },
];
