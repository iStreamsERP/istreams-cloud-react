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


const RfqListPage = () => {
  const [tableList, setTableList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rowSelection, setRowSelection] = useState({});

  const { userData } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchAllRFQData = async () => { 
    setLoading(true);
    setError(null);
    try {
      const payload = {
        DataModelName: "INVT_PURCHASE_QUOTMASTER",
        WhereCondition: "",
        Orderby: "QUOTATION_REF_NO DESC",
      };

      const response = await callSoapService(userData.clientURL, "DataModel_GetData", payload);
      setTableList(response);
    } catch (error) {
      setError(error?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllRFQData();
  }, [userData]);

  const handleDelete = useCallback( async (rfq) => {
    const result = window.confirm("Are you sure you want to delete this rfq? This action cannot be undone.");
    if (!result) return;

    try {
      // Delete master records
      const masterDeletePayload = {
        DataModelName: "INVT_PURCHASE_QUOTMASTER",
        WhereCondition: `QUOTATION_REF_NO = '${rfq.QUOTATION_REF_NO}'`,
      };
      
      await callSoapService(
        userData.clientURL,
        "DataModel_DeleteData",
        masterDeletePayload
      );

      // Delete details records
      const detailsDeletePayload = {
        DataModelName: "INVT_PURCHASE_QUOTDETAILS",
        WhereCondition: `QUOTATION_REF_NO = '${rfq.QUOTATION_REF_NO}'`,
      };
      
      await callSoapService(
        userData.clientURL,
        "DataModel_DeleteData",
        detailsDeletePayload
      );

     toast({
          title: "rfq deleted successfully",
        });
      
    fetchAllRFQData();
    } catch (error) {
      toast({
          variant: "destructive",
          title: error?.message || "Failed to delete rfq",
        });
    }

  }, [userData]);

  const columns = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
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
      accessorKey: "QUOTATION_REF_NO",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0"
          >
            RFQ Number
            <ArrowUpDown />
          </Button>
        );
      },
      cell: ({ row }) => <div className="capitalize">{row.getValue("QUOTATION_REF_NO") || "-"}</div>,
    },
    {
      accessorKey: "ITEM_CODE",
      header: "Item Code",
      cell: ({ row }) => (
        <div className="capitalize">{(row.getValue("ITEM_CODE")) || row.getValue("QUOTATION_REF_DATE") || "-"}</div>
      ),
    },
    {
      accessorKey: "DESCRIPTION",
      header: () => <div>Description</div>,
      cell: ({ row }) => <div>{row.getValue("DESCRIPTION") || "-"}</div>,
    },
    {
      accessorKey: "UOM",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0"
          >
            UOM
            <ArrowUpDown />
          </Button>
        );
      },
      cell: ({ row }) => <div>{row.getValue("UOM") || "-"}</div>,
    },
    {
      accessorKey: "QTY",
      header: () => <div>Quantity</div>,
      cell: ({ row }) => <div>{row.getValue("QTY") || "-"}</div>,
    },
    {
      accessorKey: "QUOTATION_REF_DATE",
      header: () => <div>Ref Date</div>,
      cell: ({ row }) => <div>{convertServiceDate(row.getValue("QUOTATION_REF_DATE") || "-")}</div>,
    },
     {
      accessorKey: "EXPECTED_DATE",
      header: () => <div>Expected Date</div>,
      cell: ({ row }) => <div>{convertServiceDate(row.getValue("EXPECTED_DATE") || "-")}</div>,
    },
       {
      accessorKey: "SELECTED_VENDOR",
      header: () => <div> Vendor</div>,
      cell: ({ row }) => <div>{row.getValue("SELECTED_VENDOR") || "-"}</div>,
    },
    {
      accessorKey: "SELECTED_VENDOR_NAME",
      header: () => <div>Vendor Name</div>,
      cell: ({ row }) => <div>{row.getValue("SELECTED_VENDOR_NAME") || "-"}</div>,
    },
    {
      accessorKey: "action",
      header: () => <div>Action</div>,
      id: "actions",
      cell: ({ row }) => {
        const rfq = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0"
              >
                <span className="sr-only">Open menu</span>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => navigate(`/edit-rfq/${rfq.QUOTATION_REF_NO}`)} // Navigate to rfq details
                className="flex items-center gap-1"
              >
                <Pencil /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center gap-1 text-red-600"
                onClick={() => handleDelete(rfq)}
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
        const selectedItems = tableList.filter((row) => selectedClientIds.includes(row.QUOTATION_REF_NO.toString()));
        selectedItems.forEach((item) => handleDelete(item));
      }}
    >
      Delete Selected
    </Button>
  );

  return (
    <DataTable
      title="All RFQ"
      columns={columns}
      data={tableList}
      loading={loading}
      error={error}
      onCreate={() => navigate("/new-rfq")}
      noResultsText="No rfq found."
      additionalToolbarButtons={additionalButtons}
      rowSelection={rowSelection}
      onRowSelectionChange={setRowSelection}
      getRowId={(originalRow) => originalRow.QUOTATION_REF_NO.toString()}
    />
  );
};

export default RfqListPage;
