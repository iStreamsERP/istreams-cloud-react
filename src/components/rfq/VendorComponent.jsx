import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronsUpDown, Trash2Icon, Users } from "lucide-react";

export default function VendorComponent({
  vendors,
  selectedVendors,
  vendorOpen,
  setVendorOpen,
  openVendorPopup,
  setOpenVendorPopup,
  vendorSearch,
  setVendorSearch,
  materialFormData,
  materials,
  handleVendorSelection,
  handleRemoveVendor,
  handleBadgeClick,
  selectedVendorForPopup,
  handleRemoveVendorMaterial,
  isEditMode,
}) {
  return (
    <Card className="h-[68vh] w-full overflow-hidden bg-white shadow-lg dark:bg-slate-950">
      <CardHeader className="border-b px-4 py-[10px]">
        <div className="flex items-center justify-between space-x-4">
          <CardTitle className="whitespace-nowrap text-base font-semibold">Vendor Selection</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex h-[calc(75vh-80px)] flex-col overflow-hidden p-4 pt-2">
        <div className="flex-shrink-0 space-y-2">
          <Popover
            open={vendorOpen}
            onOpenChange={setVendorOpen}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="h-8 w-full justify-between truncate bg-white text-xs dark:bg-slate-950"
                disabled={materials.length === 0}
              >
                {selectedVendors.length > 0 ? selectedVendors[selectedVendors.length - 1].VENDOR_NAME : "Select a vendor"}
                <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command className="bg-white dark:bg-slate-950">
                <CommandInput
                  placeholder="Search vendors..."
                  value={vendorSearch}
                  onValueChange={setVendorSearch}
                  className="h-9"
                />
                <CommandList>
                  <CommandEmpty>No vendor found.</CommandEmpty>
                  <CommandGroup>
                    {vendors
                      .filter((vendor) => {
                        const search = vendorSearch.toLowerCase();
                        const vendorName = vendor.VENDOR_NAME ? vendor.VENDOR_NAME.toLowerCase() : "";
                        const countryName = vendor.COUNTRY_NAME ? vendor.COUNTRY_NAME.toLowerCase() : "";

                        return vendorName.includes(search) || countryName.includes(search) || vendor.VENDOR_ID.toString().includes(search);
                      })
                      .map((vendor) => (
                        <CommandItem
                          key={vendor.VENDOR_ID}
                          value={`${vendor.VENDOR_NAME}-${vendor.COUNTRY_NAME}-${vendor.VENDOR_ID}`}
                          className="text-sm"
                          onSelect={() => handleVendorSelection(vendor)}
                        >
                          <div>
                            <div className="font-sm">{vendor.VENDOR_NAME}</div>
                            <div className="flex items-center gap-3 text-xs">
                              <p> {vendor.COUNTRY_NAME}</p>
                              <Badge variant={"secondary"}>{vendor.VENDOR_ID}</Badge>
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="mb-12 mt-4 flex-1 overflow-auto">
          {selectedVendors.length > 0 ? (
            <div className="space-y-2">
              {selectedVendors.map((vendor) => (
                <div
                  key={vendor.VENDOR_ID}
                  className="flex items-center justify-between rounded-md border p-2"
                >
                  <div>
                    <div className="text-xs font-medium">{vendor.VENDOR_NAME}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      {vendor.COUNTRY_NAME}
                      {" , "}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className="cursor-pointer truncate rounded-full border px-2 py-1 text-xs"
                      variant={"secondary"}
                      onClick={() => handleBadgeClick(vendor)}
                    >
                      {vendor.materials?.length || 0} {vendor.materials?.length === 1 ? "Item" : "Items"}
                    </Badge>

                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={(e) => handleRemoveVendor(vendor.VENDOR_ID,e)}
                      className="rounded-full p-2 hover:bg-red-100 dark:hover:bg-red-800"
                    >
                      <Trash2Icon className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500">
              <Users className="mx-auto mb-3 h-12 w-12 opacity-50" />
              <p className="font-medium">No vendors selected</p>
              <p className="text-sm">{materials.length === 0 ? "Select materials first" : "Select vendors to proceed with quotation"}</p>
            </div>
          )}
        </div>

        <Dialog
          open={openVendorPopup}
          onOpenChange={setOpenVendorPopup}
        >
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>Vendor Details - {selectedVendorForPopup?.VENDOR_NAME}</DialogTitle>
              <DialogDescription>Materials assigned to this vendor</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-800">
                  <TableRow>
                    <TableHead className="w-16 text-center">S.No</TableHead>
                    <TableHead className="min-w-[100px]">Item Code</TableHead>
                    <TableHead className="min-w-[200px]">Description</TableHead>
                    <TableHead className="w-20 text-right">UOM</TableHead>
                    <TableHead className="w-24 text-right">Qty</TableHead>
                    <TableHead className="w-24 text-right">Rate</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedVendorForPopup?.materials?.length > 0 ? (
                    selectedVendorForPopup.materials.map((m, index) => (
                      <TableRow key={m.ITEM_CODE}>
                        <TableCell className="text-center">{index + 1}</TableCell>
                        <TableCell>{m.ITEM_CODE}</TableCell>
                        <TableCell>{m.DESCRIPTION}</TableCell>
                        <TableCell className="text-right">{m.UOM}</TableCell>
                        <TableCell className="text-right">{m.QTY}</TableCell>
                        <TableCell className="text-right">{m.SUGGESTED_RATE ? m.SUGGESTED_RATE.toFixed(2) : "0.00"}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-full p-2 hover:bg-red-100 dark:hover:bg-red-800"
                            onClick={() => handleRemoveVendorMaterial(m)}
                          >
                            <Trash2Icon className="h-3 w-3 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-8 text-center text-gray-500"
                      >
                        No materials assigned to this vendor.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}