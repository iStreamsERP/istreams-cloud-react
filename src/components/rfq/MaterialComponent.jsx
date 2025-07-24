import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, PackageSearch, Trash2Icon } from "lucide-react";

export default function MaterialComponent({
  materialFormData,
  materials,
  selectedVendors,
  isEditMode,
  loading,
  handleChange,
  handleQuotationForChange,
  handleMaterialSelect,
  handleRemoveMaterial,
  setEditingQuantityId,
  editingQuantityId,
  handleQuantityChange,
  openMaterialPopup,
  setOpenMaterialPopup,
  materialSearch,
  setMaterialSearch,
  rawMaterials = [],
  purchaseRequitions = [],
}) {
  const getCurrentMaterials = () => {
    return materialFormData.QUOTATION_FOR === "Raw"
      ? rawMaterials
      : purchaseRequitions;
  };

  return (
    <Card className="h-full w-full bg-white shadow-lg dark:bg-slate-950 md:h-[68vh] md:overflow-hidden">
      <CardHeader className="border-b px-4 pb-2 pt-3">
        <CardTitle className="flex flex-col justify-between gap-3 text-lg font-semibold xl:flex-row xl:items-center">
          <div className="text-base text-gray-800 dark:text-gray-200">
            {isEditMode ? "Edit" : "Create"} RFQ (Request For Quotation)
          </div>
          <div className="text-base text-gray-800 dark:text-gray-200">
            Quotation Ref No -{" "}
            <span className="text-purple-500">
              (
              {materialFormData.QUOTATION_REF_NO === -1
                ? "New"
                : materialFormData.QUOTATION_REF_NO}
              )
            </span>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex h-full flex-col space-y-2 overflow-hidden p-4 pt-2 md:h-[calc(75vh-100px)]">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex w-full items-center gap-2">
            <Label
              htmlFor="quotationfor"
              className="flex-shrink-0 text-xs font-medium"
            >
              Quotation For
            </Label>
            <div className="flex items-center gap-3 text-xs">
              <Checkbox
                id="rawmaterials"
                name="QUOTATION_FOR"
                checked={materialFormData.QUOTATION_FOR === "Raw"}
                onCheckedChange={() => handleQuotationForChange("Raw")}
              />
              <Label
                htmlFor="rawmaterials "
                className="whitespace-nowrap text-xs"
              >
                Raw Materials
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="purchaserequisition"
                name="QUOTATION_FOR"
                checked={materialFormData.QUOTATION_FOR === "Purchase"}
                onCheckedChange={() => handleQuotationForChange("Purchase")}
              />
              <Label
                htmlFor="purchaserequisition"
                className="whitespace-nowrap text-xs"
              >
                Purchase Requisition
              </Label>
            </div>
          </div>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex w-full flex-col gap-1 sm:min-w-[180px] lg:min-w-[200px]">
              <div className="flex items-center gap-2">
                <Label
                  className="flex-shrink-0 whitespace-nowrap text-xs"
                  htmlFor="referencedate"
                >
                  Quote Ref Date
                </Label>
                <Input
                  id="referencedate"
                  name="QUOTATION_REF_DATE"
                  type="date"
                  value={materialFormData.QUOTATION_REF_DATE}
                  onChange={handleChange}
                  className="h-6 flex-1 rounded-none border-0 border-b border-gray-500 bg-white px-0 py-0.5 text-xs focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-slate-950"
                />
              </div>
            </div>
            <div className="flex w-full flex-col gap-1 sm:min-w-[180px] lg:min-w-[200px]">
              <div className="flex items-center gap-2">
                <Label
                  className="flex-shrink-0 whitespace-nowrap text-xs"
                  htmlFor="expecteddate"
                >
                  Expected Date
                </Label>
                <Input
                  id="expecteddate"
                  name="EXPECTED_DATE"
                  type="date"
                  value={materialFormData.EXPECTED_DATE}
                  onChange={handleChange}
                  className="flex-1 rounded-none border-0 border-b border-gray-500 bg-white px-0 py-1 text-xs focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-slate-950"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Popover for material selection */}
        <Popover open={openMaterialPopup} onOpenChange={setOpenMaterialPopup}>
  <PopoverTrigger asChild>
    <Button
      variant="outline"
      role="combobox"
      className="h-8 w-full justify-between bg-white text-xs dark:bg-slate-950"
      disabled={loading} // Disable button when loading
    >
      {loading ? (
        "Loading materials..."
      ) : materials.length > 0 ? (
        `${materials[0].ITEM_CODE} - ${materials[0].ITEM_NAME}${
          materials[0].SUB_MATERIAL_NO
            ? ` - ${materials[0].SUB_MATERIAL_NO}`
            : ""
        }`
      ) : (
        "Select material..."
      )}
      <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-[400px] bg-white p-0 dark:bg-slate-950 md:w-[750px]">
    <Command className="bg-white dark:bg-slate-950">
      <CommandInput
        placeholder="Search material..."
        className="h-9"
        value={materialSearch}
        onValueChange={setMaterialSearch}
        disabled={loading} // Disable input when loading
      />
      <CommandList>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"></div>
            <span className="ml-2">Loading materials...</span>
          </div>
        ) : (
          <>
            <CommandEmpty>No material found.</CommandEmpty>
            <CommandGroup>
              {getCurrentMaterials()
                .filter((material) => {
                  const search = materialSearch.toLowerCase();
                  return (
                    String(material.ITEM_NAME || "")
                      .toLowerCase()
                      .includes(search) ||
                    String(material.ITEM_CODE || "")
                      .toLowerCase()
                      .includes(search) ||
                    String(material.UOM || "")
                      .toLowerCase()
                      .includes(search) ||
                    String(material.UOM_STOCK || "")
                      .toLowerCase()
                      .includes(search) ||
                    String(material.SUB_MATERIAL_NO || "")
                      .toLowerCase()
                      .includes(search)
                  );
                })
                .map((material) => (
                  <CommandItem
                    key={`${material.ITEM_CODE}-${
                      material.SUB_MATERIAL_NO || "0"
                    }`}
                    value={`${material.ITEM_NAME || ""} ${
                      material.ITEM_CODE || ""
                    } ${material.UOM_STOCK || ""} ${
                      material.SUB_MATERIAL_NO || ""
                    }`}
                    onSelect={() => handleMaterialSelect(material)}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{material.ITEM_NAME}</span>
                      <div className="flex gap-2 text-xs text-gray-500">
                        <span>Code: {material.ITEM_CODE}</span>
                        <span>•</span>
                        <span>UOM: {material.UOM_STOCK}</span>
                        {material.SUB_MATERIAL_NO && (
                          <>
                            <span>•</span>
                            <span>
                              Sub Material: {material.SUB_MATERIAL_NO}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        materials.some(
                          (m) =>
                            m.ITEM_CODE === material.ITEM_CODE &&
                            m.SUB_MATERIAL_NO === material.SUB_MATERIAL_NO
                        )
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>

        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-auto">
            <Table className="text-xs">
              <TableHeader className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-800">
                <TableRow className="h-8">
                  <TableHead className="w-16 px-2 py-1 text-center">
                    S.No
                  </TableHead>
                  <TableHead className="min-w-[100px] px-2 py-1">
                    Item Code
                  </TableHead>
                  <TableHead className="min-w-[200px] px-2 py-1">
                    Description
                  </TableHead>
                  <TableHead className="w-20 px-2 py-1 text-right">
                    UOM
                  </TableHead>
                  <TableHead className="w-24 px-2 py-1 text-right">
                    Quantity
                  </TableHead>
                  <TableHead className="w-24 px-2 py-1 text-center">
                    Sub Material
                  </TableHead>
                  <TableHead className="w-16 px-2 py-1 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.length > 0 ? (
                  materials.map((m, index) => (
                    <TableRow
                      key={`${m.ITEM_CODE}-${
                        m.SUB_MATERIAL_NO || "0"
                      }-${index}`}
                      className="h-8"
                    >
                      <TableCell className="px-2 py-1 text-center">
                        {index + 1}
                      </TableCell>
                      <TableCell className="px-2 py-1">{m.ITEM_CODE}</TableCell>
                      <TableCell className="px-2 py-1">
                        {m.ITEM_NAME || m.DESCRIPTION || "-"}
                      </TableCell>
                      <TableCell className="px-2 py-1 text-right">
                         {m.UOM || m.UOM_STOCK || "-"}
                      </TableCell>
                      <TableCell className="px-2 py-1 text-right">
                        {editingQuantityId === m.ITEM_CODE ? (
                          <Input
                            type="number"
                            min="1"
                            autoFocus
                            defaultValue={m.QTY || 1}
                            onBlur={(e) => {
                              handleQuantityChange(
                                m.ITEM_CODE,
                                Number(e.target.value)
                              );
                              setEditingQuantityId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleQuantityChange(
                                  m.ITEM_CODE,
                                  Number(e.target.value)
                                );
                                setEditingQuantityId(null);
                              }
                            }}
                            className="h-6 w-20 text-right"
                          />
                        ) : (
                          <div
                            className="flex h-6 w-20 cursor-pointer items-center justify-end px-2"
                            onClick={() => setEditingQuantityId(m.ITEM_CODE)}
                          >
                            {m.QTY || 1}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="px-2 py-1 text-center">
                        {m.SUB_MATERIAL_NO ? m.SUB_MATERIAL_NO : "-"}
                      </TableCell>
                      <TableCell className="px-2 py-1 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={(e) => handleRemoveMaterial(m.ITEM_CODE, e)}
                          className="h-6 w-6 rounded-full hover:bg-red-100 dark:hover:bg-red-800"
                        >
                          <Trash2Icon className="h-3 w-3 rounded-full text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="h-8">
                    <TableCell
                      colSpan={7}
                      className="h-full py-4 text-center text-gray-400 md:h-[35vh]"
                    >
                      <PackageSearch className="mx-auto mb-3 h-24 w-24 opacity-50" />
                      No materials selected. Please select materials to add to
                      the quotation.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
