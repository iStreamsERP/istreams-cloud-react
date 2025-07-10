import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

const OrderTracking = ({ invoice }) => {
  const [openSections, setOpenSections] = useState({
    one: false,
    two: false,
    three: false,
    four: false,
    five: false
  });

  const toggleSection = (section) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const statusItems = [
    {
      key: 'one',
      icon: 'https://png.pngtree.com/png-vector/20241030/ourmid/pngtree-blue-shopping-cart-icon-png-image_14194383.png',
      title: 'Order Placed',
      date: invoice.OrderDate,
      time: invoice.Ordertime,
      content: (
        <div className="text-xs">
          <p className="mb-0">
            Order placed successfully by <span className="font-semibold text-blue-500">{invoice.Currentname}</span>
          </p>
          <span className="text-gray-400">{invoice.OrderDate}, {invoice.Ordertime}</span>
        </div>
      )
    },
    {
      key: 'two',
      icon: invoice.Grnno ? 
        "https://cdn2.iconfinder.com/data/icons/greenline/512/check-512.png" : 
        "https://cdn-icons-png.flaticon.com/512/148/148767.png",
      title: invoice.Grnno ? 'Delivered' : 'Not Delivered',
      date: invoice.Grnno ? invoice.Grndate : 'Pending',
      time: invoice.Grnno ? '15:10' : '',
      content: invoice.Grnno ? (
        <div className="text-xs">
          <Badge className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded mb-1">
            {invoice.Grnno}
          </Badge>  
          <Badge className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded ml-1">
            GRN Value - {invoice.Grnval}
          </Badge>
          <p className="mb-0">Your order has been Delivered <span className="font-semibold">Successfully</span></p>
          <span className="text-gray-400">{invoice.Grndate}</span>
        </div>
      ) : (
        <div className="text-xs">
          <p className="mb-0">Your order has not been delivered</p>
          <span className="text-gray-400">Pending</span>
        </div>
      )
    },
    {
      key: 'three',
      icon: invoice.Orderval ? 
        "https://cdn2.iconfinder.com/data/icons/greenline/512/check-512.png" : 
        "https://img.freepik.com/premium-vector/delivery-truck-logo-template-orange-circle-premium-vector_533403-134.jpg",
      title: invoice.Orderval ? 'Previously Booked' : 'No Previously Booked',
      date: invoice.PreGrndate || 'N/A',
      time: '15:10',
      content: invoice.Orderval ? (
        <div className="text-xs">
          <Badge className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded mb-1 me-2">
            {invoice.PreGrnval}
          </Badge>
          <Badge className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded ">
            Balance - {invoice.Balance}
          </Badge>
          <p className="mb-0">
            Arrived USA <span className="font-semibold">SGS   </span>
          </p>
          <span className="text-gray-400">{invoice.PreGrndate} 15:36</span>
        </div>
      ) : (
        <div className="text-xs">
          <p className="mb-0">
            No previous booking <span className="font-semibold">--None--</span>
          </p>
          <span className="text-gray-400">N/A</span>
        </div>
      )
    },
    {
      key: 'four',
      icon: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTYz1ZplLBfJJTY7SAAKxAiZ3WBMhHc7flQ4g&s",
      title: 'Payments',
      date: 'Nov 03',
      time: '15:10 (expected)',
      content: (
        <div className="text-xs">
          <Badge className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded mb-1">
            <span className="font-semibold">Paid -</span> {invoice.InvoiceAmount?.toLocaleString()}
          </Badge>
          <p className="mb-0">Your payment has been successfully processed</p>
          <span className="text-gray-400">Mar 07, 2025, 12:35 (confirmed)</span>
        </div>
      )
    },
    {
      key: 'five',
      icon: "https://cdn2.iconfinder.com/data/icons/greenline/512/check-512.png",
      title: 'Status',
      date: 'Nov 03',
      time: '18:42',
      content: (
        <div className="text-xs">
          <p className="mb-0">Your request has been completed successfully</p>
          <span className="text-gray-400">Nov 03, 2022, 18:42</span>
        </div>
      )
    }
  ];

  return (
    <div className="h-full overflow-y-auto text-xs bg-white rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 dark:bg-slate-950">
      <div className="px-3 py-[8.5px] border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-xs font-semibold">Order Tracking</h2>
        <Badge variant={"secondary"} className="text-green-500 text-xs">{invoice.REF_ORDER_NO}</Badge>
      </div>

      <div className="p-3">
        {statusItems.map((item) => (
          <div key={item.key} className="mb-4">
            <div 
              className="cursor-pointer"
              onClick={() => toggleSection(item.key)}
            >
              <div className="flex items-center text-xs mb-2">
                <div className="mr-2 z-100  ">
                  <img 
                    src={item.icon} 
                    alt={item.title} 
                    className="w-10 h-10 z-100 rounded-full"
                  />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-xs">{item.title}</p>
                  <span className="text-xs font-medium text-gray-500">
                    {item.date}{item.time && `, ${item.time}`}
                  </span>
                </div>
              </div>
            </div>

            {openSections[item.key] && (
              <div className="pl-12 pt-0">
                {item.content}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderTracking;