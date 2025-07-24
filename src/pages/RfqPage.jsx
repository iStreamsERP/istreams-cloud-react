import { callSoapService } from "@/api/callSoapService";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { convertDataModelToStringData } from "@/utils/dataModelConverter";
import { Loader2, UploadIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PrintPreviewDialog } from "../components/rfq/PrintPreviewDialog";
import VendorComponent from "../components/rfq/VendorComponent";

import { convertServiceDate } from "@/utils/dateUtils";
import MaterialComponent from "@/components/rfq/MaterialComponent";

export default function RfqPage() {
  const { id } = useParams(); // Get the id from the URL
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { toast } = useToast();
  // console.log(id, "ID from params");
  const initialMaterial = {
    COMPANY_CODE: 1,
    BRANCH_CODE: 1,
    QUOTATION_REF_NO: id || -1,
    QUOTATION_REF_DATE: new Date().toISOString().split("T")[0],
    SERIAL_NO: 1,
    ITEM_CODE: "",
    ITEM_NAME: "",
    UOM_STOCK: "",
    QTY: 1,
    RECEIVED_STATUS: false,
    CLOSED_STATUS: false,
    USER_NAME: "",
    ENT_DATE: "",
    EXPECTED_DATE: new Date().toISOString().split("T")[0],
    WORK_REF_SERIAL_NO: "",
    EST_EXT_COMPONENTS_SNO: null,
    SPECIFICATION: "",
    SUPPLIER_REF: "",
    SELECTED_RATE: 0,
    SELECTED_VENDOR: "",
    SELECTED_VENDOR_NAME: "",
    SUGGESTED_VENDOR_ID: null,
    SUGGESTED_VENDOR_NAME: "",
    SUGGESTED_RATE: 0,
    REVIEWED_USER_NAME: "",
    REVIEWED_DATE: "",
    MR_REQUISITION_NO: "",
    MR_REQUISITION_DATE: null,
    MR_REQUISITION_SERIAL_NO: null,
    SUB_MATERIAL_NO: null,
    MR_REF_NO: null,
    QUOTATION_FOR: "Raw",
  };

  const initialVendor = {
    COMPANY_CODE: 1,
    BRANCH_CODE: 1,
    QUOTATION_REF_NO: initialMaterial.QUOTATION_REF_NO,
    QUOTATION_REF_DATE: initialMaterial.QUOTATION_REF_DATE,
    QUOTATION_SERIAL_NO: 1,
    VENDOR_ID: "",
    ITEM_CODE: "",
    QTY: 0.0,
    RATE: 0.0,
    DISCOUNT_RATE: 0.0,
    EXPECTED_DATE: "",
    RECEIVED_DATE: "",
    VENDOR_OFFER: "",
    RECEIVED_STATUS: false,
    SELECTED_STATUS: false,
    CLOSED_STATUS: false,
    USER_NAME: "",
    ENT_DATE: "",
    WORK_REF_SERIAL_NO: null,
    EST_EXT_COMPONENTS_SNO: null,
    QUOTATION_STATUS: null,
    VENDOR_NAME: null,
    COUNTRY_NAME: null,
    CREDIT_DAYS: null,
    NO_OF_PAYMENTS: null,
    DELIVERY_DAYS: null,
    DISCOUNT_PTG: null,
    ATTN_TO: null,
    EMAIL_ADDRESS: null,
    DESCRIPTION: null,
    UOM: null,
    FILE_PATH: null,
    FILE_NAME: null,
    VALUE: null,
    TOTAL_VALUE: null,
    DISCOUNT_VALUE: null,
    NET_VALUE: null,
    FILE_PATH_PDF: null,
    FILE_NAME_PDF: null,
  };

  const [vendors, setVendors] = useState([]);
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [vendorOpen, setVendorOpen] = useState(false);
  const [openVendorPopup, setOpenVendorPopup] = useState(false);
  const [openMaterialPopup, setOpenMaterialPopup] = useState(false);
  const [materialSearch, setMaterialSearch] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [materialFormData, setMaterialFormData] = useState(initialMaterial);
  const [materials, setMaterials] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [purchaseRequitions, setPurchaseRequisitions] = useState([]);
  const [vendorFormData, setVendorFormData] = useState(initialVendor);
  const [editingQuantityId, setEditingQuantityId] = useState(null);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [selectedVendorForPopup, setSelectedVendorForPopup] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextMaterialSerialNo, setNextMaterialSerialNo] = useState(1);
  const [nextVendorSerialNo, setNextVendorSerialNo] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    fetchVendors();
    if (id) {
      setIsEditMode(true);
      fetchQuotationData(id);
    }
  }, [id]);

  useEffect(() => {
    fetchRawMaterials();
    fetchPurchaseRequisitions();
  }, [userData]);

  const fetchVendors = async () => {
    try {
      const payload = {
        DataModelName: "VENDOR_MASTER",
        WhereCondition: "",
        Orderby: "",
      };
      const response = await callSoapService(
        userData.clientURL,
        "DataModel_GetData",
        payload
      );
      setVendors(response);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to fetch vendors",
        description: error.message,
      });
    }
  };

  const fetchRawMaterials = async () => {
    try {
      const payload = {
        DataModelName: "INVT_MATERIAL_MASTER_VIEW",
        WhereCondition: "",
        Orderby: "",
      };
      const response = await callSoapService(
        userData.clientURL,
        "DataModel_GetData",
        payload
      );
      setRawMaterials(response);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to fetch raw materials",
        description: error.message,
      });
    }
  };
  // console.log(" rawMaterials", rawMaterials);

  const fetchPurchaseRequisitions = async () => {
    try {
      const payload = {
        DataModelName: "INVT_PO_REQUISITIONLIST",
        WhereCondition: "",
        Orderby: "",
      };
      const response = await callSoapService(
        userData.clientURL,
        "DataModel_GetData",
        payload
      );
      setPurchaseRequisitions(response);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to fetch purchase requisitions",
        description: error.message,
      });
    }
  };

  // console.log(" purchaseRequitions", purchaseRequitions);
  const fetchQuotationData = async (quotationId) => {
    setLoading(true);
    try {
      const masterPayload = {
        DataModelName: "INVT_PURCHASE_QUOTMASTER",
        WhereCondition: `QUOTATION_REF_NO = '${quotationId}'`,
        Orderby: "",
      };

      const masterResponse = await callSoapService(
        userData.clientURL,
        "DataModel_GetData",
        masterPayload
      );

      if (masterResponse.length > 0) {
        const masterData = masterResponse[0];
        setMaterialFormData({
          ...masterData,
          QUOTATION_REF_DATE: convertServiceDate(masterData.QUOTATION_REF_DATE),
          EXPECTED_DATE: convertServiceDate(masterData.EXPECTED_DATE),
          QUOTATION_FOR: masterData.QUOTATION_FOR || "Raw",
          SPECIFICATION: masterData.SPECIFICATION || "",
          SUB_MATERIAL_NO: masterData.SUB_MATERIAL_NO || null,
          ITEM_NAME: masterData.DESCRIPTION || "",
          UOM_STOCK: masterData.UOM || masterData.UOM_STOCK || "",
        });

        const detailsPayload = {
          DataModelName: "INVT_PURCHASE_QUOTDETAILS",
          WhereCondition: `QUOTATION_REF_NO = '${quotationId}'`,
          Orderby: "",
        };

        const detailsResponse = await callSoapService(
          userData.clientURL,
          "DataModel_GetData",
          detailsPayload
        );

        // Pass the master data to processEditData to get the SUB_MATERIAL_NO
        processEditData(masterResponse, detailsResponse);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error loading quotation",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const processEditData = (masterData, detailsData) => {
    const materialsMap = new Map();
    const vendorsMap = new Map();

    // Create a map of master data by ITEM_CODE for easy lookup
    const masterDataMap = {};
    masterData.forEach((master) => {
      masterDataMap[master.ITEM_CODE] = master;
    });

    detailsData.forEach((detail) => {
      const masterItem = masterDataMap[detail.ITEM_CODE] || {};

      if (!materialsMap.has(detail.ITEM_CODE)) {
        materialsMap.set(detail.ITEM_CODE, {
          ITEM_CODE: detail.ITEM_CODE,
          ITEM_NAME:
            detail.DESCRIPTION ||
            detail.ITEM_NAME ||
            masterItem.ITEM_NAME ||
            "",
          UOM_STOCK:
            detail.UOM ||
            detail.UOM_STOCK ||
            masterItem.UOM ||
            masterItem.UOM_STOCK ||
            "Kg", // Added proper UOM handling
          DESCRIPTION: detail.DESCRIPTION || "",
          UOM: detail.UOM || masterItem.UOM || "",
          QTY: detail.QTY,
          SPECIFICATION: detail.SPECIFICATION || "",
          SUGGESTED_VENDOR_ID: detail.VENDOR_ID,
          SUGGESTED_VENDOR_NAME: detail.VENDOR_NAME,
          SUGGESTED_RATE: detail.RATE,
          SERIAL_NO: detail.QUOTATION_SERIAL_NO,
          SUB_MATERIAL_NO: masterItem.SUB_MATERIAL_NO || null,
        });
      }

      if (!vendorsMap.has(detail.VENDOR_ID)) {
        vendorsMap.set(detail.VENDOR_ID, {
          VENDOR_ID: detail.VENDOR_ID,
          VENDOR_NAME: detail.VENDOR_NAME,
          COUNTRY_NAME: detail.COUNTRY_NAME,
          QUOTATION_SERIAL_NO: detail.QUOTATION_SERIAL_NO,
          materials: [],
        });
      }
    });

    detailsData.forEach((detail) => {
      const vendor = vendorsMap.get(detail.VENDOR_ID);
      if (vendor) {
        vendor.materials.push({
          ITEM_CODE: detail.ITEM_CODE,
          ITEM_NAME: detail.DESCRIPTION || detail.ITEM_NAME || "",
          DESCRIPTION: detail.DESCRIPTION || "",
          UOM_STOCK: detail.UOM || detail.UOM_STOCK || "",
          UOM: detail.UOM || "",
          QTY: detail.QTY,
          RATE: detail.RATE,
          DISCOUNT_RATE: detail.DISCOUNT_RATE,
          EXPECTED_DATE: detail.EXPECTED_DATE,
          SUB_MATERIAL_NO: detail.SUB_MATERIAL_NO || null,
        });
      }
    });

    setMaterials(Array.from(materialsMap.values()));
    setSelectedVendors(Array.from(vendorsMap.values()));
    setNextMaterialSerialNo(materialsMap.size + 1);
    setNextVendorSerialNo(vendorsMap.size + 1);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setMaterialFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleQuotationForChange = (type) => {
    setMaterialFormData((prev) => ({
      ...prev,
      QUOTATION_FOR: type,
    }));
    setMaterials([]);
    setSelectedVendors([]);
  };

  const handleMaterialSelect = (material) => {
    const isAlreadyAdded = materials.some(
      (m) => m.ITEM_CODE === material.ITEM_CODE
    );

    if (isAlreadyAdded) {
      toast({
        variant: "destructive",
        title: "Material already added",
        description: "This material is already in your list",
      });
      return;
    }

    setSelectedMaterial(material);

    const newMaterial = {
      ...material,
      ITEM_NAME: material.ITEM_NAME || material.DESCRIPTION || "", // Ensure name is populated
      DESCRIPTION: material.DESCRIPTION || material.ITEM_NAME || "", // Map both ways
      QTY: 1,
      SERIAL_NO: nextMaterialSerialNo,
      QUOTATION_REF_NO: materialFormData.QUOTATION_REF_NO,
      QUOTATION_REF_DATE: materialFormData.QUOTATION_REF_DATE,
      EXPECTED_DATE: materialFormData.EXPECTED_DATE,
    };

    setMaterials((prev) => [...prev, newMaterial]);
    setNextMaterialSerialNo(nextMaterialSerialNo + 1);

    setSelectedVendors((prevSelected) => {
      return prevSelected.map((vendor) => ({
        ...vendor,
        materials: [
          ...vendor.materials,
          {
            ...newMaterial,
            VENDOR_ID: vendor.VENDOR_ID,
            VENDOR_NAME: vendor.VENDOR_NAME,
            RATE: newMaterial.SUGGESTED_RATE,
            DISCOUNT_RATE: 0,
            EXPECTED_DATE: materialFormData.EXPECTED_DATE,
          },
        ],
      }));
    });

    setOpenMaterialPopup(false);
    setMaterialSearch("");
  };

  const handleRemoveMaterial = (itemCode) => {
    try {
      if (isEditMode && id) {
        // console.log(`Removing material ${itemCode} from quotation ${id}`);

        const payload = {
          UserName: userData.userName,
          DataModelName: "INVT_PURCHASE_QUOTDETAILS",
          WhereCondition: `QUOTATION_REF_NO = '${materialFormData.QUOTATION_REF_NO}' AND ITEM_CODE = '${itemCode}'`,
        };

        callSoapService(userData.clientURL, "DataModel_DeleteData", payload);

        const masterPayload = {
          UserName: userData.userName,
          DataModelName: "INVT_PURCHASE_QUOTMASTER",
          WhereCondition: `QUOTATION_REF_NO = '${materialFormData.QUOTATION_REF_NO}'`,
        };

        callSoapService(
          userData.clientURL,
          "DataModel_DeleteData",
          masterPayload
        );
      }
      setMaterials((prev) => {
        const updated = prev.filter((m) => m.ITEM_CODE !== itemCode);
        return updated.map((m, index) => ({
          ...m,
          SERIAL_NO: index + 1,
        }));
      });

      setNextMaterialSerialNo(materials.length);

      setSelectedVendors((prev) =>
        prev
          .map((vendor) => ({
            ...vendor,
            materials: vendor.materials.filter((m) => m.ITEM_CODE !== itemCode),
          }))
          .filter((vendor) => vendor.materials.length > 0)
      );
    } catch (error) {
      console.log(error);
    }
  };

  const handleRemoveVendorMaterial = async (material) => {
    if (!selectedVendorForPopup) return;

    try {
      // If in edit mode and quotation exists, remove from service
      if (isEditMode && id) {
        console.log(
          `Removing material ${material.ITEM_CODE} from vendor ${selectedVendorForPopup.VENDOR_ID}`
        );

        // Remove specific vendor-material combination from quotation details
        const deleteDetailsPayload = {
          UserName: userData.userName,
          DataModelName: "INVT_PURCHASE_QUOTDETAILS",
          WhereCondition: `QUOTATION_REF_NO = '${id}' AND VENDOR_ID = '${selectedVendorForPopup.VENDOR_ID}' AND ITEM_CODE = '${material.ITEM_CODE}'`,
        };

        await callSoapService(
          userData.clientURL,
          "DataModel_DeleteData",
          deleteDetailsPayload
        );
        console.log(
          "Successfully removed vendor material from quotation details"
        );

        // Check if this material still exists with other vendors
        const remainingVendorsForMaterial = selectedVendors.filter(
          (vendor) =>
            vendor.VENDOR_ID !== selectedVendorForPopup.VENDOR_ID &&
            vendor.materials.some((m) => m.ITEM_CODE === material.ITEM_CODE)
        );

        // If no other vendors have this material, remove from master table as well
        if (remainingVendorsForMaterial.length === 0) {
          const deleteMasterPayload = {
            UserName: userData.userName,
            DataModelName: "INVT_PURCHASE_QUOTMASTER",
            WhereCondition: `QUOTATION_REF_NO = '${id}' AND ITEM_CODE = '${material.ITEM_CODE}'`,
          };

          await callSoapService(
            userData.clientURL,
            "DataModel_DeleteData",
            deleteMasterPayload
          );
          console.log("Successfully removed material from quotation master");
        }
      }

      // Update local state
      const updatedVendors = selectedVendors.map((vendor) => {
        if (vendor.VENDOR_ID === selectedVendorForPopup.VENDOR_ID) {
          return {
            ...vendor,
            materials: vendor.materials.filter(
              (m) => m.ITEM_CODE !== material.ITEM_CODE
            ),
          };
        }
        return vendor;
      });

      // Check if material exists in other vendors after removal
      const materialExistsInOtherVendors = updatedVendors.some((vendor) =>
        vendor.materials.some((m) => m.ITEM_CODE === material.ITEM_CODE)
      );

      // If material doesn't exist in any other vendor, remove it from materials list
      if (!materialExistsInOtherVendors) {
        setMaterials((prevMaterials) =>
          prevMaterials.filter((m) => m.ITEM_CODE !== material.ITEM_CODE)
        );
      }

      // Remove vendors that have no materials left
      setSelectedVendors(
        updatedVendors.filter((vendor) => vendor.materials.length > 0)
      );

      // Update the popup vendor data
      setSelectedVendorForPopup((prev) => ({
        ...prev,
        materials: prev.materials.filter(
          (m) => m.ITEM_CODE !== material.ITEM_CODE
        ),
      }));

      toast({
        title: "Material removed successfully",
        description: `Material ${material.ITEM_CODE} removed from vendor ${
          selectedVendorForPopup.VENDOR_NAME
        }${isEditMode ? " and database" : ""}`,
      });
    } catch (error) {
      console.error("Error removing vendor material:", error);
      toast({
        variant: "destructive",
        title: "Error removing material",
        description:
          error.message || "Failed to remove material from the system.",
      });
    }
  };

  const handleQuantityChange = (itemCode, quantity) => {
    const newMaterials = materials.map((m) =>
      m.ITEM_CODE === itemCode ? { ...m, QTY: quantity } : m
    );

    setMaterials(newMaterials);

    setSelectedVendors((prev) =>
      prev.map((vendor) => ({
        ...vendor,
        materials: vendor.materials.map((m) =>
          m.ITEM_CODE === itemCode ? { ...m, QTY: quantity } : m
        ),
      }))
    );
  };

  const handleVendorSelection = (vendor) => {
    const isAlreadySelected = selectedVendors.some(
      (v) => v.VENDOR_ID === vendor.VENDOR_ID
    );

    if (isAlreadySelected) {
      toast({
        variant: "destructive",
        title: "Vendor already added",
        description: "This vendor is already in your list",
      });
      return;
    }

    const vendorWithMaterials = {
      ...vendor,
      QUOTATION_SERIAL_NO: nextVendorSerialNo,
      materials: materials.map((m) => ({
        ...m,
        VENDOR_ID: vendor.VENDOR_ID,
        VENDOR_NAME: vendor.VENDOR_NAME,
        RATE: m.SUGGESTED_RATE || 0,
        DISCOUNT_RATE: 0,
        EXPECTED_DATE: materialFormData.EXPECTED_DATE,
      })),
    };

    setSelectedVendors((prevSelected) => [
      ...prevSelected,
      vendorWithMaterials,
    ]);
    setNextVendorSerialNo(nextVendorSerialNo + 1);
    setVendorOpen(false);
    setVendorSearch("");
  };

  const handleRemoveVendor = async (vendorId) => {
    try {
      // If in edit mode and quotation exists, remove from service
      if (isEditMode && id) {
        // Remove all vendor quotation details from the service
        const deletePayload = {
          UserName: userData.userName,
          DataModelName: "INVT_PURCHASE_QUOTDETAILS",
          WhereCondition: `QUOTATION_REF_NO = '${id}' AND VENDOR_ID = '${vendorId}'`,
        };

        await callSoapService(
          userData.clientURL,
          "DataModel_DeleteData",
          deletePayload
        );

        // Also remove from master table if this was the only vendor for those materials
        const remainingVendorsForMaterials = selectedVendors.filter(
          (v) => v.VENDOR_ID !== vendorId
        );

        // Find materials that will have no vendors after this removal
        const materialsToRemoveFromMaster = [];
        const vendorToRemove = selectedVendors.find(
          (v) => v.VENDOR_ID === vendorId
        );

        if (vendorToRemove) {
          vendorToRemove.materials.forEach((material) => {
            const hasOtherVendors = remainingVendorsForMaterials.some(
              (vendor) =>
                vendor.materials.some((m) => m.ITEM_CODE === material.ITEM_CODE)
            );

            if (!hasOtherVendors) {
              materialsToRemoveFromMaster.push(material.ITEM_CODE);
            }
          });
        }

        // Remove materials from master table if they have no vendors
        for (const itemCode of materialsToRemoveFromMaster) {
          const masterDeletePayload = {
            DataModelName: "INVT_PURCHASE_QUOTMASTER",
            WhereCondition: `QUOTATION_REF_NO = '${id}' AND ITEM_CODE = '${itemCode}'`,
          };

          await callSoapService(
            userData.clientURL,
            "DataModel_DeleteData",
            masterDeletePayload
          );
        }
      }

      // Update local state
      setSelectedVendors((prev) => {
        const updated = prev.filter((v) => v.VENDOR_ID !== vendorId);
        return updated.map((v, index) => ({
          ...v,
          QUOTATION_SERIAL_NO: index + 1,
        }));
      });

      // Update materials list to remove materials that no longer have any vendors
      const remainingVendors = selectedVendors.filter(
        (v) => v.VENDOR_ID !== vendorId
      );
      const vendorToRemove = selectedVendors.find(
        (v) => v.VENDOR_ID === vendorId
      );

      if (vendorToRemove) {
        const materialsToRemove = [];
        vendorToRemove.materials.forEach((material) => {
          const hasOtherVendors = remainingVendors.some((vendor) =>
            vendor.materials.some((m) => m.ITEM_CODE === material.ITEM_CODE)
          );

          if (!hasOtherVendors) {
            materialsToRemove.push(material.ITEM_CODE);
          }
        });

        if (materialsToRemove.length > 0) {
          setMaterials((prev) =>
            prev.filter((m) => !materialsToRemove.includes(m.ITEM_CODE))
          );
        }
      }

      setNextVendorSerialNo(selectedVendors.length);

      toast({
        title: "Vendor removed successfully",
        description: `Vendor has been removed from the quotation${
          isEditMode ? " and database" : ""
        }.`,
      });
    } catch (error) {
      console.error("Error removing vendor:", error);
      toast({
        variant: "destructive",
        title: "Error removing vendor",
        description:
          error.message || "Failed to remove vendor from the system.",
      });
    }
  };

  const handleBadgeClick = (vendor) => {
    setSelectedVendorForPopup(vendor);
    setOpenVendorPopup(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (isEditMode) {
        await updateQuotation();
      } else {
        await createQuotation();
      }

      toast({
        title: `Quotation ${isEditMode ? "updated" : "created"} successfully`,
        variant: "default",
      });
      navigate("/rfq-list");
    } catch (error) {
      toast({
        variant: "destructive",
        title: `Error ${isEditMode ? "updating" : "creating"} quotation`,
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const createQuotation = async () => {
    let materialSerialNo = 1;
    let vendorSerialNo = 1;
    let refno = -1;

    for (const material of materials) {
      for (const vendor of selectedVendors) {
        const vendorMaterial = vendor.materials.find(
          (m) => m.ITEM_CODE === material.ITEM_CODE
        );
        if (!vendorMaterial) continue;

        const materialData = {
          ...materialFormData,
          USER_NAME: userData.username,
          ENT_DATE: new Date().toISOString().split("T")[0],
          ITEM_CODE: material.ITEM_CODE,
          DESCRIPTION: material.ITEM_NAME,
          SERIAL_NO: materialSerialNo,
          QTY: material.QTY,
          UOM: material.UOM_STOCK,
          EXPECTED_DATE: material.EXPECTED_DATE,
          SPECIFICATION: material.SPECIFICATION,
          SUGGESTED_VENDOR_ID: material.SUGGESTED_VENDOR_ID,
          SUGGESTED_VENDOR_NAME: material.SUGGESTED_VENDOR_NAME,
          SUGGESTED_RATE: material.SUGGESTED_RATE,
          SELECTED_VENDOR: vendor.VENDOR_ID,
          SELECTED_VENDOR_NAME: vendor.VENDOR_NAME,
          SELECTED_RATE: vendorMaterial.RATE || material.SUGGESTED_RATE,
          QUOTATION_REF_NO: refno,
          SUB_MATERIAL_NO: material.SUB_MATERIAL_NO,
        };

        const convertedMaterialData = convertDataModelToStringData(
          "INVT_PURCHASE_QUOTMASTER",
          materialData
        );

        const payload = {
          UserName: userData.userEmail,
          DModelData: convertedMaterialData,
        };
        console.log("Payload for material:", payload);

        const response = await callSoapService(
          userData.clientURL,
          "DataModel_SaveData",
          payload
        );
        console.log("Response for material:", response);

        if (refno === -1 && response) {
          const parts = response.split(" ");
          const extractedRef = parts[6]?.trim().replace(/'/g, "");
          if (extractedRef) {
            refno = extractedRef;
          }
        }

        const vendorData = {
          ...initialVendor,
          QUOTATION_REF_NO: refno,
          QUOTATION_REF_DATE: materialData.QUOTATION_REF_DATE,
          QUOTATION_SERIAL_NO: materialData.SERIAL_NO,
          VENDOR_ID: vendor.VENDOR_ID,
          VENDOR_NAME: vendor.VENDOR_NAME,
          ITEM_CODE: material.ITEM_CODE,
          DESCRIPTION: material.ITEM_NAME,
          UOM: material.UOM,
          QTY: material.QTY,
          COUNTRY_NAME: vendor.COUNTRY_NAME,
          RATE: vendorMaterial.RATE || material.SUGGESTED_RATE,
          EXPECTED_DATE: materialFormData.EXPECTED_DATE,
          USER_NAME: userData.username,
          ENT_DATE: new Date().toISOString().split("T")[0],
        };

        const convertedVendorData = convertDataModelToStringData(
          "INVT_PURCHASE_QUOTDETAILS",
          vendorData
        );

        const vendorPayload = {
          UserName: userData.userEmail,
          DModelData: convertedVendorData,
        };

        console.log("Payload for vendor:", vendorPayload);
        const res = await callSoapService(
          userData.clientURL,
          "DataModel_SaveData",
          vendorPayload
        );
        console.log("Response for vendor:", res);

        materialSerialNo++;
      }
      vendorSerialNo++;
    }
  };

  const updateQuotation = async () => {
    let materialSerialNo = 1;
    let refno = id || -1;

    try {
      // Step 1: Delete all existing records for this quotation
      if (isEditMode && refno !== -1) {
        // console.log("Deleting existing records for quotation:", refno);

        // Delete quotation details first (child records)
        const deleteDetailsPayload = {
          DataModelName: "INVT_PURCHASE_QUOTDETAILS",
          WhereCondition: `QUOTATION_REF_NO = '${refno}'`,
        };

        try {
          await callSoapService(
            userData.clientURL,
            "DataModel_DeleteData",
            deleteDetailsPayload
          );
          console.log("Successfully deleted quotation details");
        } catch (error) {
          console.error("Error deleting quotation details:", error);
          // Continue with master deletion even if details deletion fails
        }

        // Delete quotation master records (parent records)
        const deleteMasterPayload = {
          DataModelName: "INVT_PURCHASE_QUOTMASTER",
          WhereCondition: `QUOTATION_REF_NO = '${refno}'`,
        };

        try {
          await callSoapService(
            userData.clientURL,
            "DataModel_DeleteData",
            deleteMasterPayload
          );
          console.log("Successfully deleted quotation master");
        } catch (error) {
          console.error("Error deleting quotation master:", error);
          // Continue with creation even if deletion fails
        }

        // Add a small delay to ensure deletion is processed
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // console.log("Starting to create new records");
      // console.log("Materials:", materials);
      // console.log("Selected Vendors:", selectedVendors);

      // Step 2: Create new records with current data
      const processedCombinations = new Set(); // Track processed combinations to avoid duplicates

      for (const material of materials) {
        for (const vendor of selectedVendors) {
          const vendorMaterial = vendor.materials.find(
            (m) => m.ITEM_CODE === material.ITEM_CODE
          );
          if (!vendorMaterial) continue;

          // Create unique key to prevent duplicate processing
          const combinationKey = `${material.ITEM_CODE}-${vendor.VENDOR_ID}`;
          if (processedCombinations.has(combinationKey)) {
            console.log(`Skipping duplicate combination: ${combinationKey}`);
            continue;
          }
          processedCombinations.add(combinationKey);

          console.log(`Processing combination: ${combinationKey}`);

          // Create master record
          const materialData = {
            ...materialFormData,
            USER_NAME: userData.userName || userData.username,
            ENT_DATE: new Date().toISOString().split("T")[0],
            ITEM_CODE: material.ITEM_CODE,
            DESCRIPTION: material.ITEM_NAME,
            SERIAL_NO: materialSerialNo,
            QTY: material.QTY,
            UOM: material.UOM_STOCK,
            SUB_MATERIAL_NO: material.SUB_MATERIAL_NO,
            EXPECTED_DATE:
              material.EXPECTED_DATE || materialFormData.EXPECTED_DATE,
            SPECIFICATION:
              material.SPECIFICATION || materialFormData.SPECIFICATION,
            SUGGESTED_VENDOR_ID: material.SUGGESTED_VENDOR_ID,
            SUGGESTED_VENDOR_NAME: material.SUGGESTED_VENDOR_NAME,
            SUGGESTED_RATE: material.SUGGESTED_RATE,
            SELECTED_VENDOR: vendor.VENDOR_ID,
            SELECTED_VENDOR_NAME: vendor.VENDOR_NAME,
            SELECTED_RATE: vendorMaterial.RATE || material.SUGGESTED_RATE,
            QUOTATION_REF_NO: refno,
          };

          const convertedMaterialData = convertDataModelToStringData(
            "INVT_PURCHASE_QUOTMASTER",
            materialData
          );

          const masterPayload = {
            UserName: userData.userEmail,
            DModelData: convertedMaterialData,
          };

          console.log("Creating master record:", masterPayload);
          const masterResponse = await callSoapService(
            userData.clientURL,
            "DataModel_SaveData",
            masterPayload
          );
          console.log("Master record response:", masterResponse);

          // Create detail record
          const vendorData = {
            ...initialVendor,
            QUOTATION_REF_NO: refno,
            QUOTATION_REF_DATE: materialFormData.QUOTATION_REF_DATE,
            QUOTATION_SERIAL_NO: materialSerialNo,
            VENDOR_ID: vendor.VENDOR_ID,
            VENDOR_NAME: vendor.VENDOR_NAME,
            ITEM_CODE: material.ITEM_CODE,
            DESCRIPTION: material.DESCRIPTION,
            UOM: material.UOM,
            QTY: material.QTY,
            COUNTRY_NAME: vendor.COUNTRY_NAME,
            RATE: vendorMaterial.RATE || material.SUGGESTED_RATE,
            DISCOUNT_RATE: vendorMaterial.DISCOUNT_RATE || 0,
            EXPECTED_DATE: materialFormData.EXPECTED_DATE,
            USER_NAME: userData.userName || userData.username,
            ENT_DATE: new Date().toISOString().split("T")[0],
          };

          const convertedVendorData = convertDataModelToStringData(
            "INVT_PURCHASE_QUOTDETAILS",
            vendorData
          );

          const detailPayload = {
            UserName: userData.userEmail,
            DModelData: convertedVendorData,
          };

          console.log("Creating detail record:", detailPayload);
          const detailResponse = await callSoapService(
            userData.clientURL,
            "DataModel_SaveData",
            detailPayload
          );
          console.log("Detail record response:", detailResponse);

          materialSerialNo++;
        }
      }

      console.log("Update quotation completed successfully");
    } catch (error) {
      console.error("Error in updateQuotation:", error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div className="flex w-full flex-col justify-between gap-2 lg:flex-row">
          {/* Left Column */}
          <div className="flex  w-full flex-col gap-4 lg:w-[75%]">
            <MaterialComponent
              materialFormData={materialFormData}
              materials={materials}
              selectedVendors={selectedVendors}
              isEditMode={isEditMode}
              loading={loading}
              handleChange={handleChange}
              handleQuotationForChange={handleQuotationForChange}
              handleMaterialSelect={handleMaterialSelect}
              handleRemoveMaterial={handleRemoveMaterial}
              setEditingQuantityId={setEditingQuantityId}
              editingQuantityId={editingQuantityId}
              handleQuantityChange={handleQuantityChange}
              openMaterialPopup={openMaterialPopup}
              setOpenMaterialPopup={setOpenMaterialPopup}
              materialSearch={materialSearch}
              setMaterialSearch={setMaterialSearch}
              rawMaterials={rawMaterials} // Changed from RAW_MATERIALS
              purchaseRequitions={purchaseRequitions} // Changed from PURCHASE_ITEMS
            />
          </div>

          {/* Right Column */}
          <div className="w-full lg:w-[25%]">
            <VendorComponent
              vendors={vendors}
              selectedVendors={selectedVendors}
              vendorOpen={vendorOpen}
              setVendorOpen={setVendorOpen}
              openVendorPopup={openVendorPopup}
              setOpenVendorPopup={setOpenVendorPopup}
              vendorSearch={vendorSearch}
              setVendorSearch={setVendorSearch}
              materialFormData={materialFormData}
              materials={materials}
              handleVendorSelection={handleVendorSelection}
              handleRemoveVendor={handleRemoveVendor}
              handleBadgeClick={handleBadgeClick}
              selectedVendorForPopup={selectedVendorForPopup}
              handleRemoveVendorMaterial={handleRemoveVendorMaterial}
              isEditMode={isEditMode}
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <PrintPreviewDialog
              masterData={materialFormData}
              materials={materials}
              vendors={selectedVendors}
            >
              <Button className="px-6">
                Export To PDF <UploadIcon className="ml-2 h-4 w-4" />
              </Button>
            </PrintPreviewDialog>

            <Button
              className="px-6"
              disabled={
                materials.length === 0 ||
                selectedVendors.length === 0 ||
                isSubmitting
              }
            >
              Export To Excel <UploadIcon className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <Button
            type="submit"
            className="px-6"
            disabled={
              materials.length === 0 ||
              selectedVendors.length === 0 ||
              isSubmitting
            }
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UploadIcon className="mr-2 h-4 w-4" />
            )}
            Submit
          </Button>
        </div>
      </form>
    </div>
  );
}
