// ults/getFileIcon.js
import pdfIcon from "../assets/pdf-icon.png";
import defaultIcon from "../assets/default-doc-icon.png";
import wordIcon from "../assets/word-icon.png";
import excelIcon from "../assets/excel-icon.png";
import pptIcon from "../assets/ppt-icon.png";
import imageIcon from "../assets/image-icon.png";

export const getFileIcon = (docExt) => {
  if (!docExt) return defaultIcon;
  const ext = docExt.toLowerCase();
  if (ext === "pdf") return pdfIcon;
  if (ext === "doc" || ext === "docx") return wordIcon;
  if (ext === "xls" || ext === "xlsx") return excelIcon;
  if (ext === "ppt" || ext === "pptx") return pptIcon;
  if (["png", "jpg", "jpeg", "gif"].includes(ext)) return imageIcon;
  return defaultIcon;
};
