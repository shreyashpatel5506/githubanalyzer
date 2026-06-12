import jsPDF from "jspdf";
import html2canvas from "html2canvas";
export const exportToPDF = async (elementId, fileName = "claritycode.pdf") => {
    const element = document.getElementById(elementId);
    if (!element)
        return;
    try {
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#0f172a", // Dark background for the PDF
        });
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save(fileName);
    }
    catch (error) {
        console.error("PDF Export failed:", error);
    }
};
