import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { callSoapService } from "@/api/callSoapService";
import DataTable from "@/components/DataTable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { convertServiceDate } from "@/utils/dateUtils";

const InvoiceListPage = () => {
  const [tableList, setTableList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rowSelection, setRowSelection] = useState({});

  const { userData } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        DataModelName: "ACC_INVOICE_BOOKING",
        WhereCondition: "",
        Orderby: "REF_SERIAL_NO DESC",
      };

      const response = await callSoapService(
        userData.clientURL,
        "DataModel_GetData",
        payload
      );
      setTableList(response);
    } catch (error) {
      setError(error?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [userData]);

  const handleDelete = useCallback(
    async (invoice) => {
      const result = window.confirm(
        "Are you sure you want to delete this rfq? This action cannot be undone."
      );
      if (!result) return;

      try {
        // Delete master records
        const payload = {
          DataModelName: "ACC_INVOICE_BOOKING",
          WhereCondition: `REF_SERIAL_NO = ${invoice.REF_SERIAL_NO}`,
        };

        const response = await callSoapService(
          userData.clientURL,
          "DataModel_DeleteData",
          payload
        );
        if (response) {
          setTableList((prev) =>
            prev.filter(
              (rfq) => invoice.REF_SERIAL_NO !== invoice.REF_SERIAL_NO
            )
          );
        }

        toast({
          variant: "destructive",
          title: "rfq deleted successfully",
        });

        fetchInvoices();
      } catch (error) {
        toast({
          variant: "destructive",
          title: error?.message || "Failed to delete rfq",
        });
      }
    },
    [userData]
  );

  const columns = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "REF_SERIAL_NO",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0"
          >
            Ref Serial No
            <ArrowUpDown />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="capitalize">{row.getValue("REF_SERIAL_NO") || "-"}</div>
      ),
    },
    {
      accessorKey: "VENDOR_NAME",
      header: "Vendor Name",
      cell: ({ row }) => (
        <div className="capitalize">
          {row.getValue("VENDOR_NAME") || row.getValue("VENDOR_NAME") || "-"}
        </div>
      ),
    },
    {
      accessorKey: "INVOICE_DATE",
      header: () => <div>Invoice Date</div>,
      cell: ({ row }) => (
        <div>
          {convertServiceDate(row.getValue("INVOICE_DATE") || "-") || "-"}
        </div>
      ),
    },
    {
      accessorKey: "RECEIVED_DATE",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0"
          >
            Received Date
            <ArrowUpDown />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div>
          {convertServiceDate(row.getValue("RECEIVED_DATE") || "-") ||
            row.getValue("RECEIVED_DATE") ||
            "-"}
        </div>
      ),
    },
    {
      accessorKey: "CURRENCY_NAME",
      header: () => <div>Currency</div>,
      cell: ({ row }) => <div>{row.getValue("CURRENCY_NAME") || "-"}</div>,
    },
    {
      accessorKey: "INVOICE_AMOUNT",
      header: () => <div>Invoice Amount</div>,
      cell: ({ row }) => <div>{row.getValue("INVOICE_AMOUNT") || "-"}</div>,
    },
    {
      accessorKey: "EXCHANGE_RATE",
      header: () => <div>Exchange Rate</div>,
      cell: ({ row }) => <div>{row.getValue("EXCHANGE_RATE") || "-"}</div>,
    },
    {
      accessorKey: "PAYMENT_DATE",
      header: () => <div> Payment Date</div>,
      cell: ({ row }) => (
        <div>{convertServiceDate(row.getValue("PAYMENT_DATE")) || "-"}</div>
      ),
    },
    {
      accessorKey: "USER_NAME",
      header: () => <div>Created By</div>,
      cell: ({ row }) => <div>{row.getValue("USER_NAME") || "-"}</div>,
    },
    {
      accessorKey: "action",
      header: () => <div>Action</div>,
      id: "actions",
      cell: ({ row }) => {
        const invoice = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  navigate(`/edit-invoice/${invoice.REF_SERIAL_NO}`)
                } // Navigate to rfq details
                className="flex items-center gap-1"
              >
                <Pencil /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center gap-1 text-red-600"
                onClick={() => handleDelete(invoice)}
              >
                {" "}
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const additionalButtons = (
    <Button
      variant="destructive"
      disabled={Object.keys(rowSelection).length === 0}
      onClick={() => {
        const selectedClientIds = Object.keys(rowSelection);
        const selectedItems = tableList.filter((row) =>
          selectedClientIds.includes(row.REF_SERIAL_NO.toString())
        );
        selectedItems.forEach((item) => handleDelete(item));
      }}
    >
      Delete Selected
    </Button>
  );

  return (
    <DataTable
      title="All Invoices"
      columns={columns}
      data={tableList}
      loading={loading}
      error={error}
      onCreate={() => navigate("/new-invoice")}
      noResultsText="No invoice found."
      additionalToolbarButtons={additionalButtons}
      rowSelection={rowSelection}
      onRowSelectionChange={setRowSelection}
      getRowId={(originalRow) => originalRow.REF_SERIAL_NO.toString()}
    />
  );
};

export default InvoiceListPage;
