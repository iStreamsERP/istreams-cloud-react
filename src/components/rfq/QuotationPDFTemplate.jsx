import React from "react";
import { numberToWords, formatDate } from "@/utils/pdfUtils";
import { useAuth } from "@/contexts/AuthContext";

export const getCurrentDateTime = () => {
  return new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};


  
// Main template showing all vendors
export const QuotationPDFTemplate = ({ masterData, materials, vendors }) => {
  // Calculate totals
  const {userData} = useAuth();
  const totals = {};
  materials.forEach((material) => {
    vendors.forEach((vendor) => {
      const vendorMaterial = vendor.materials?.find((m) => m.ITEM_CODE === material.ITEM_CODE);
      if (vendorMaterial) {
        const total = (vendorMaterial.RATE || 0) * (material.QTY || 0);
        totals[vendor.VENDOR_ID] = (totals[vendor.VENDOR_ID] || 0) + total;
      }
    });
  });

  const overallTotal = Object.values(totals).reduce((sum, total) => sum + total, 0);


  return (
    <div className="w-[210mm] min-h-[297mm] max-w-[210mm] p-[10mm] mx-auto font-sans text-xs leading-snug bg-white text-black box-border relative">
         <style>
        {`
          @media print {
            body, html {
              margin: 0;
              padding: 0;
            }
            .page-break {
              page-break-after: always;
            }
            .avoid-break {
              page-break-inside: avoid;
            }
            table {
              page-break-inside: auto;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
          }
        `}
      </style>
        {/* Header */}

      <div className="grid grid-cols-3 mb-5 pb-2.5 justify-center items-center avoid-break">
        <div></div>
        <div className="flex flex-col items-center">
          <h2 className="m-0 text-black text-lg font-extrabold">{userData?.companyName}</h2>
          <p className="my-0 text-black">Bahrain</p>
        </div>
        <div className="flex w-full  ">
         {userData.companyLogo && (
          <img
            src={userData.companyLogo.startsWith('data:image') ? userData.companyLogo : `data:image/png;base64,${userData.companyLogo}`}
            alt="Company Logo"
            className="w-52 h-auto object-contain absolute top-8  right-10"
          />
        )}
        </div>
      </div>

      {/* Document Title */}
      <div className="mb-2 pb-2.5 avoid-break">
        <h2 className="m-0 text-black text-base font-bold underline">RFQ (Quotation Request)</h2>
      </div>

      {/* Supplier Information */}
      <table className="w-full border-collapse border border-black avoid-break mb-6">
        <tbody>
          <tr>
            <td className="w-1/5 p-1 align-top font-bold">To :-</td>
            <td className="w-3/10 p-1 align-top"></td>
            <td className="w-1/5 p-1 align-top"></td>
            <td className="w-3/10 p-1 align-top"></td>
          </tr>
          <tr>
            <td className="p-1 align-top font-bold">Supplier Name</td>
            <td className="p-1 align-top">: BAHRAIN POLYSTYRENE FACTORY</td>
            <td className="p-1 align-top font-bold">RFQ No</td>
            <td className="p-1 align-top">: {masterData.QUOTATION_REF_NO || 'N/A'}</td>
          </tr>
          <tr>
            <td className="p-1 align-top font-bold">Country</td>
            <td className="p-1 align-top">: Bahrain</td>
            <td className="p-1 align-top font-bold">Date</td>
            <td className="p-1 align-top">: {formatDate(masterData.QUOTATION_REF_DATE)}</td>
          </tr>
          <tr>
            <td className="p-1 align-top font-bold">Telephone No</td>
            <td className="p-1 align-top">: 17-735707</td>
            <td className="p-1 align-top font-bold">Expected Date</td>
            <td className="p-1 align-top">: {formatDate(masterData.EXPECTED_DATE)}</td>
          </tr>
          <tr>
            <td className="p-1 align-top font-bold">Fax No</td>
            <td className="p-1 align-top">: 17-735808</td>
            <td className="p-1 align-top"></td>
            <td className="p-1 align-top"></td>
          </tr>
          <tr>
            <td className="p-1 align-top font-bold">Attn. to</td>
            <td className="p-1 align-top">:</td>
            <td className="p-1 align-top font-bold">Page 1 of 1</td>
            <td className="p-1 align-top"></td>
          </tr>
          <tr>
            <td className="p-1 align-top font-bold">Email Address</td>
            <td className="p-1 align-top">:</td>
            <td className="p-1 align-top"></td>
            <td className="p-1 align-top"></td>
          </tr>
        </tbody>
      </table>

      {/* Quotation Details */}
      <div className="mb-4 avoid-break">
        <p className="mb-1">
          <span className="font-bold">Quotation For:</span> {masterData.QUOTATION_FOR === "Raw" ? "Raw Materials" : "Purchase Requisition"}
        </p>
        <p>
          <span className="font-bold">Expected Delivery Date:</span> {formatDate(masterData.EXPECTED_DATE)}
        </p>
      </div>

      {/* Materials Table */}
      <div className="mb-5 avoid-break">
        <h3 className="font-bold mb-2">Requested Materials</h3>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2 text-left">S.No.</th>
              <th className="border border-gray-300 p-2 text-left">Item Code</th>
              <th className="border border-gray-300 p-2 text-left">Description</th>
              <th className="border border-gray-300 p-2 text-right">UOM</th>
              <th className="border border-gray-300 p-2 text-right">Qty</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((material, index) => (
              <tr key={index}>
                <td className="border border-gray-300 p-2">{index + 1}</td>
                <td className="border border-gray-300 p-2">{material.ITEM_CODE}</td>
                <td className="border border-gray-300 p-2">{material.DESCRIPTION}</td>
                <td className="border border-gray-300 p-2 text-right">{material.UOM}</td>
                <td className="border border-gray-300 p-2 text-right">{material.QTY}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vendors Section */}
      <div className="mb-6">
        <h3 className="font-bold mb-3">Vendor Quotations</h3>
        {vendors.map((vendor, index) => (
          <div key={index} className="mb-5 border border-gray-300 p-3 rounded avoid-break">
            <h4 className="m-0 mb-3 font-semibold">
              {index + 1}. {vendor.VENDOR_NAME} ({vendor.VENDOR_ID})
            </h4>

            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left">Item</th>
                  <th className="border border-gray-300 p-2 text-right">Rate</th>
                  <th className="border border-gray-300 p-2 text-right">Qty</th>
                  <th className="border border-gray-300 p-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {vendor.materials?.map((material, matIndex) => (
                  <tr key={matIndex}>
                    <td className="border border-gray-300 p-2">{material.DESCRIPTION}</td>
                    <td className="border border-gray-300 p-2 text-right">{material.RATE?.toFixed(2)}</td>
                    <td className="border border-gray-300 p-2 text-right">{material.QTY}</td>
                    <td className="border border-gray-300 p-2 text-right">{(material.RATE * material.QTY).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td 
                    colSpan="3" 
                    className="border border-gray-300 p-2 text-right font-bold"
                  >
                    Total:
                  </td>
                  <td className="border border-gray-300 p-2 text-right font-bold">
                    {(totals[vendor.VENDOR_ID] || 0).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-5 p-3 bg-gray-50 border border-gray-300 rounded avoid-break">
        <p className="text-right m-0">
          <span className="font-bold">Grand Total: </span>
          {overallTotal.toFixed(2)} ({numberToWords(overallTotal)})
        </p>
      </div>

      {/* Footer Signatures */}
      <div className="mt-10 flex justify-between avoid-break">
        <div className="text-center w-[45%]">
            <div className="font-bold mb-1">{userData.userName}</div>
          <div className=" border-b border-black mb-1"></div>
          <p className="m-0">Prepared By</p>
        </div>
        <div className="text-center w-[45%]">
            <div className="font-bold mb-1">{getCurrentDateTime()}</div>
          <div className=" border-b border-black mb-1"></div>
          <p className="m-0">Quotation Generated On</p>
        </div>
      </div>

    
    </div>
  );
};

// Template for individual vendor PDFs
export const VendorQuotationPDFTemplate = ({ masterData, materials, vendor }) => {

    const {userData} = useAuth();
   // Filter materials to only include those that this vendor has
  const vendorMaterials = materials.filter(material => 
    vendor.materials?.some(vm => vm.ITEM_CODE === material.ITEM_CODE)
  );

  // Calculate total for this vendor using only their materials
  const vendorTotal = vendorMaterials.reduce((sum, material) => {
    const vendorMaterial = vendor.materials?.find(m => m.ITEM_CODE === material.ITEM_CODE);
    return sum + ((vendorMaterial?.RATE || 0) * (material.QTY || 0));
  }, 0);

  

  return (
    <div className="w-[210mm] min-h-[297mm] max-w-[210mm] p-[10mm] mx-auto font-sans text-xs leading-snug bg-white text-black box-border relative print-color-adjust-exact border border-black">
        <style>
        {`
          @media print {
            body, html {
              margin: 0;
              padding: 0;
            }
            .page-break {
              page-break-after: always;
            }
            .avoid-break {
              page-break-inside: avoid;
            }
            table {
              page-break-inside: auto;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
          }
        `}
      </style>

      {/* Header */}
      <div className="grid grid-cols-3 mb-5 pb-2.5 justify-center items-center avoid-break">
        <div></div>
        <div className="flex flex-col items-center">
          <h2 className="m-0 text-black text-lg font-extrabold">{userData?.companyName}</h2>
          <p className="my-0 text-black">Bahrain</p>
        </div>
        <div className="flex w-full  ">
         {userData.companyLogo && (
          <img
            src={userData.companyLogo.startsWith('data:image') ? userData.companyLogo : `data:image/png;base64,${userData.companyLogo}`}
            alt="Company Logo"
            className="w-52 h-auto object-contain absolute top-8  right-10"
          />
        )}
        </div>
      </div>

      {/* Document Title */}
      <div className="mb-2 pb-2.5 avoid-break">
        <h2 className="m-0 text-black text-base font-bold underline">RFQ (Quotation Request)</h2>
      </div>

      {/* Supplier Information */}
      <div className="p-2 border border-black mb-4 avoid-break">
      <table className="w-full border-collapse ">
        <tbody className="text-xs  ">
          <tr>
            <td className="w-1/5 p-1 align-top font-bold underline">To :-</td>
           
          </tr>
          <tr>
            <td className="p-1 align-top font-bold">Supplier Name</td>
            <td className="p-1 align-top ">: {vendor.VENDOR_NAME}</td>
            <td className="p-1 align-top font-bold">RFQ No</td>
            <td className="p-1 align-top ">: {masterData.QUOTATION_REF_NO || 'N/A'}</td>
          </tr>
          <tr>
            <td className="p-1 align-top font-bold">Country</td>
            <td className="p-1 align-top ">: {vendor.COUNTRY_NAME || 'N/A'}</td>
            <td className="p-1 align-top font-bold">Date</td>
            <td className="p-1 align-top ">: {formatDate(masterData.QUOTATION_REF_DATE)}</td>
          </tr>
          <tr>
            <td className="p-1 align-top font-bold">Telephone No</td>
            <td className="p-1 align-top ">: N/A</td>
            <td className="p-1 align-top font-bold">Expected Date</td>
            <td className="p-1 align-top ">: {formatDate(masterData.EXPECTED_DATE)}</td>
          </tr>
          <tr>
            <td className="p-1 align-top font-bold">Fax No</td>
            <td className="p-1 align-top ">: N/A</td>
            
          </tr>
          <tr>
            <td className="p-1 align-top font-bold">Attn. to</td>
            <td className="p-1 align-top ">: {vendor.ATTN_TO || 'N/A'}</td>
            
        
          </tr>
          <tr>
            <td className="p-1 align-top font-bold">Email Address</td>
            <td className="p-1 align-top ">: {vendor.EMAIL_ADDRESS || 'N/A'}</td>
            <td className="p-1 align-top font-bold flex justify-end">Page 1 of 1</td>
         
          </tr>
        </tbody>
      </table>
      </div>

     

      {/* Materials Table */}
    
       {/* Materials Table */}
      <table className="w-full border-collapse border border-gray-300 avoid-break">
        <thead>
          <tr>
            <th className="border border-gray-300 p-2 text-left">S.No.</th>
            <th className="border border-gray-300 p-2 text-left">Item Code</th>
            <th className="border border-gray-300 p-2 text-left">Description</th>
            <th className="border border-gray-300 p-2 text-right">UOM</th>
            <th className="border border-gray-300 p-2 text-right">Qty</th>
            <th className="border border-gray-300 p-2 text-right">Rate</th>
            <th className="border border-gray-300 p-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {vendorMaterials.map((material, index) => {
            const vendorMaterial = vendor.materials?.find(m => m.ITEM_CODE === material.ITEM_CODE);
            const total = (vendorMaterial?.RATE || 0) * (material.QTY || 0);
            
            return (
              <tr key={index}>
                <td className="border border-gray-300  p-2">{index + 1}</td>
                <td className="border border-gray-300  p-2">{material.ITEM_CODE}</td>
                <td className="border border-gray-300  p-2">{material.DESCRIPTION}</td>
                <td className="border border-gray-300  p-2 text-right">{material.UOM}</td>
                <td className="border border-gray-300  p-2 text-right">{material.QTY}</td>
                <td className="border border-gray-300  p-2 text-right">{vendorMaterial?.RATE?.toFixed(2) || '0.00'}</td>
                <td className="border border-gray-300  p-2 text-right">{total.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan="6" className="border border-gray-300 p-2 text-right font-bold">Total:</td>
            <td className="border border-gray-300 p-2 text-right font-bold">{vendorTotal.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
     
                {/* Summary */}
      <div className="mt-5 p-3 bg-gray-50 border border-gray-300 rounded avoid-break">
        <p className="text-right m-0">
          <span className="font-semibold ">Total: </span>
          {vendorTotal.toFixed(2)}<span className="font-bold"> ({numberToWords(vendorTotal)})</span>
        </p>
      </div>
      

      {/* Footer Signatures */}
      <div className="absolute w-[90%] bottom-[5%] avoid-break">
    
      <div className="mt-10 h-full w-full flex justify-between ">
        <div className="text-center w-[40%]">
            <div className="font-bold mb-1">{userData.userName}</div>
          <div className=" border-b border-black mb-1"></div>
          <p className="m-0">Prepared By</p>
        </div>
        <div className="text-center w-[40%]">
           <div className="font-bold mb-1">{getCurrentDateTime()}</div>
          <div className="border-b border-black mb-1"></div>
          <p className="m-0">Quotation Generated On</p>
        </div>
      </div>
</div>
    
      
    </div>
  );
};