import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QuotationPDFTemplate, VendorQuotationPDFTemplate } from './QuotationPDFTemplate';
import { generatePDF } from '@/utils/pdfUtils';

export const PrintPreviewDialog = ({ masterData, materials, vendors, children }) => {
  const pdfRefs = useRef({});

  const handleDownloadAll = async () => {
    try {
      // Download combined PDF first
      await handleDownloadCombined();
      
      // Then download individual vendor PDFs
      for (const vendor of vendors) {
        await handleDownloadVendor(vendor);
      }
    } catch (error) {
      console.error('Error downloading PDFs:', error);
    }
  };

  const handleDownloadCombined = async () => {
    const fileName = `Quotation_${masterData.QUOTATION_REF_NO || 'New'}_Combined.pdf`;
    await generatePDF(pdfRefs.current['combined'], fileName);
  };

  const handleDownloadVendor = async (vendor) => {
    const fileName = `Quotation_${masterData.QUOTATION_REF_NO || 'New'}_${vendor.VENDOR_NAME}.pdf`;
    await generatePDF(pdfRefs.current[vendor.VENDOR_ID], fileName);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-[70vw] max-h-[90vh] overflow-auto z-[9999]">
        <DialogHeader>
          <DialogTitle>Quotation Preview</DialogTitle>
        </DialogHeader>
        
        <div className="flex justify-end mb-4 gap-2">
          <Button onClick={handleDownloadCombined} variant="outline">
            Download Combined PDF
          </Button>
          <Button onClick={handleDownloadAll} variant="outline">
            Download All Vendor PDFs
          </Button>
        </div>
        
        {/* Combined view */}
        <div className="mb-8">
          <h3 className="font-bold mb-2">Combined View</h3>
          <div ref={el => pdfRefs.current['combined'] = el}>
            <QuotationPDFTemplate 
              masterData={masterData}
              materials={materials}
              vendors={vendors}
            />
          </div>
        </div>

        {/* Individual vendor views */}
        {vendors.map((vendor) => (
          <div key={vendor.VENDOR_ID} className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold">Vendor: {vendor.VENDOR_NAME}</h3>
              <Button 
                onClick={() => handleDownloadVendor(vendor)} 
                variant="outline" 
                size="sm"
              >
                Download PDF
              </Button>
            </div>
            <div ref={el => pdfRefs.current[vendor.VENDOR_ID] = el}>
              <VendorQuotationPDFTemplate
                masterData={masterData}
                materials={materials}
                vendor={vendor}
              />
            </div>
          </div>
        ))}
      </DialogContent>
    </Dialog>
  );
};