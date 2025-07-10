import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Converts a number to words (Indian numbering system)
 */
export const numberToWords = (num) => {
  if (isNaN(num)) return 'Zero';

  const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const twoDigits = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 
                    'Seventeen', 'Eighteen', 'Nineteen'];
  const tensMultiple = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const tensPower = ['', 'Thousand', 'Lakh', 'Crore'];

  function convertLessThanOneThousand(n) {
    if (n === 0) return '';
    let str = '';
    
    if (n > 99) {
      str += singleDigits[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    
    if (n > 19) {
      str += tensMultiple[Math.floor(n / 10)] + ' ';
      n %= 10;
    } else if (n > 9) {
      str += twoDigits[n - 10] + ' ';
      return str;
    }
    
    if (n > 0) {
      str += singleDigits[n] + ' ';
    }
    
    return str;
  }

  let str = '';
  let power = 0;
  let number = Math.abs(num);

  if (number === 0) {
    return 'Zero';
  }

  while (number > 0) {
    const chunk = number % 1000;
    if (chunk !== 0) {
      let chunkStr = convertLessThanOneThousand(chunk);
      if (power > 0) {
        chunkStr += tensPower[power] + ' ';
      }
      str = chunkStr + str;
    }
    number = Math.floor(number / 1000);
    power++;
  }

  return str.trim() + (num < 0 ? ' Negative' : '') + ' Only';
};

/**
 * Improved PDF generation with multi-page support
 */
export const generatePDF = async (element, fileName) => {
  const elementsToHide = element?.querySelectorAll('[data-hide-in-pdf]');
  elementsToHide?.forEach(el => el.style.display = 'none');

  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Create a clone of the element to avoid modifying the original
    const clonedElement = element.cloneNode(true);
    document.body.appendChild(clonedElement);
    clonedElement.style.position = 'absolute';
    clonedElement.style.left = '-9999px';
    clonedElement.style.width = '210mm';
    clonedElement.style.height = 'auto';
    
    // Calculate total height and pages needed
    const totalHeight = clonedElement.scrollHeight;
    const pixelsPerMm = clonedElement.offsetHeight / (297); // A4 height in mm
    const totalPages = Math.ceil((totalHeight / pixelsPerMm) / pageHeight);
    
    let position = 0;
    let currentPage = 1;
    
    while (position < totalHeight) {
      if (currentPage > 1) {
        pdf.addPage();
      }
      
      const canvas = await html2canvas(clonedElement, {
        scale: 2,
        logging: false,
        useCORS: true,
        windowHeight: pageHeight * pixelsPerMm,
        height: pageHeight * pixelsPerMm,
        width: clonedElement.scrollWidth,
        scrollY: position,
        scrollX: 0,
        y: position,
        x: 0,
        backgroundColor: '#FFFFFF',
        removeContainer: true,
        onclone: (doc) => {
          doc.body.style.margin = '0';
          doc.body.style.padding = '0';
        }
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      
      pdf.addImage(
        imgData,
        'JPEG',
        0,
        0,
        pageWidth,
        imgHeight
      );
      
      position += pageHeight * pixelsPerMm;
      currentPage++;
    }
    
    document.body.removeChild(clonedElement);
    pdf.save(fileName);
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw error;
  } finally {
    elementsToHide?.forEach(el => el.style.display = '');
  }
};

/**
 * Formats date to dd/mm/yyyy
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  
  try {
    let date;
    if (dateString.includes('/Date(')) {
      const timestamp = parseInt(dateString.match(/\d+/)[0], 10);
      date = new Date(timestamp);
    } else {
      date = new Date(dateString);
    }
    
    if (isNaN(date.getTime())) return dateString;
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    return dateString;
  }
};