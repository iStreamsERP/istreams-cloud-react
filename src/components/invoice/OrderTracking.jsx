import { useState } from "react";
import { Badge } from "@/components/ui/badge";

const OrderTracking = ({ invoice }) => {
  const [openSections, setOpenSections] = useState({
    one: false,
    two: false,
    three: false,
    four: false,
    five: false,
  });

  const toggleSection = (section) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const statusItems = [
    {
      key: "one",
      icon: "https://png.pngtree.com/png-vector/20241030/ourmid/pngtree-blue-shopping-cart-icon-png-image_14194383.png",
      title: "Order Placed",
      date: invoice.OrderDate,
      time: invoice.Ordertime,
      content: (
        <div className="text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="mb-1">
            Order placed successfully by{" "}
            <span className="font-semibold text-blue-500">
              {invoice.USER_NAME}
            </span>
          </p>
          <span className="text-gray-400 text-xs">
            {invoice.OrderDate}, {invoice.Ordertime}
          </span>
        </div>
      ),
    },
    {
      key: "two",
      icon: invoice.Grnno
        ? "https://cdn2.iconfinder.com/data/icons/greenline/512/check-512.png"
        : "https://cdn-icons-png.flaticon.com/512/148/148767.png",
      title: invoice.Grnno ? "Delivered" : "Not Delivered",
      date: invoice.Grnno ? invoice.Grndate : "Pending",
      time: invoice.Grnno ? "15:10" : "",
      content: invoice.Grnno ? (
        <div className="text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex sm:flex-col flex-row  gap-2 items-center mb-1">
            <Badge className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
              {invoice.Grnno}
            </Badge>
            <Badge className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded ">
              GRN Value - {invoice.Grnval}
            </Badge>
          </div>
          <p className="mb-1">
            Your order has been Delivered{" "}
            <span className="font-semibold">Successfully</span>
          </p>
          <span className="text-gray-400 text-xs">{invoice.Grndate}</span>
        </div>
      ) : (
        <div className="text-xs p-2 bg-gray-50 rounded-lg">
          <p className="mb-1">Your order has not been delivered</p>
          <span className="text-gray-400 text-xs">Pending</span>
        </div>
      ),
    },
    {
      key: "three",
      icon: invoice.Orderval
        ? "https://cdn2.iconfinder.com/data/icons/greenline/512/check-512.png"
        : "https://img.freepik.com/premium-vector/delivery-truck-logo-template-orange-circle-premium-vector_533403-134.jpg",
      title: invoice.Orderval ? "Previously Booked" : "No Previously Booked",
      date: invoice.PreGrndate || "N/A",
      time: "15:10",
      content: invoice.Orderval ? (
        <div className="text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex sm:flex-col flex-row gap-2 items-center mb-1">
            <Badge className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded me-2">
              {invoice.PreGrnval}
            </Badge>
            <Badge className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
              Balance - {invoice.Balance}
            </Badge>
          </div>
          <p className="mb-1">
            Arrived USA <span className="font-semibold">SGS</span>
          </p>
          <span className="text-gray-400 text-xs">
            {invoice.PreGrndate} 15:36
          </span>
        </div>
      ) : (
        <div className="text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="mb-1">
            No previous booking <span className="font-semibold">--None--</span>
          </p>
          <span className="text-gray-400 text-xs">N/A</span>
        </div>
      ),
    },
    {
      key: "four",
      icon: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTYz1ZplLBfJJTY7SAAKxAiZ3WBMhHc7flQ4g&s",
      title: "Payments",
      date: "Nov 03",
      time: "15:10 (expected)",
      content: (
        <div className="text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Badge className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded mb-1">
            <span className="font-semibold">Paid -</span>{" "}
            {invoice.InvoiceAmount?.toLocaleString()}
          </Badge>
          <p className="mb-1">Your payment has been successfully processed</p>
          <span className="text-gray-400 text-xs">
            Mar 07, 2025, 12:35 (confirmed)
          </span>
        </div>
      ),
    },
    {
      key: "five",
      icon: "https://cdn2.iconfinder.com/data/icons/greenline/512/check-512.png",
      title: "Status",
      date: "Nov 03",
      time: "18:42",
      content: (
        <div className="text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="mb-1">Your request has been completed successfully</p>
          <span className="text-gray-400 text-xs">Nov 03, 2022, 18:42</span>
        </div>
      ),
    },
  ];

  return (
    <div className="h-full overflow-y-auto text-sm bg-white rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 dark:bg-slate-950 space-y-2  p-2">
      <div className="pb-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center  rounded-t-lg">
        <h2 className="text-sm font-semibold ">Order Tracking</h2>
        <Badge
          variant={"secondary"}
          className="text-green-600 bg-green-100 text-xs font-medium"
        >
          {invoice.REF_ORDER_NO}
        </Badge>
      </div>

      <div className="relative">
        {statusItems.map((item, index) => ( 
          <div key={item.key} className="mb-6 relative z-10">
            <div
              className="cursor-pointer  rounded-lg transition-colors"
              onClick={() => toggleSection(item.key)}
            >
              <div className="flex items-center text-sm">
                <div className="mr-3 relative">
                  <div className="w-12 h-12 rounded-full bg-white  border-2 border-white flex items-center justify-center shadow-sm">
                    <img
                      src={item.icon}
                      alt={item.title}
                      className="w-10 h-10 rounded-full object-contain"
                    />
                  </div>
                  {index !== statusItems.length - 1 && (
                    <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 w-0 h-4 border-l border-dashed border-gray-500"></div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex flex-col justify-between  text-gray-600 dark:text-gray-300 items-start">
                    <p className="font-medium">{item.title}</p>
                    <span className="text-xs ">
                      {item.date}
                      {item.time && ` • ${item.time}`}
                    </span>
                  </div>
                  {openSections[item.key] && (
                    <div className="mt-1">{item.content}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderTracking;
