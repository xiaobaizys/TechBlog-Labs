/**
 * PDF 导出工具
 *
 * 使用 jsPDF + html2canvas 将页面内容导出为 PDF。
 * 支持中文（需嵌入字体）。
 */

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ExportOptions {
  filename?: string;
  format?: "a4" | "letter";
  orientation?: "portrait" | "landscape";
  margin?: number;
  scale?: number;
}

/**
 * 将 HTML 元素导出为 PDF
 */
export async function exportToPdf(
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<void> {
  const {
    filename = `访客报告_${new Date().toISOString().slice(0, 10)}.pdf`,
    format = "a4",
    orientation = "portrait",
    margin = 20,
    scale = 2,
  } = options;

  try {
    // 显示加载提示
    const loadingEl = document.createElement("div");
    loadingEl.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      color: white;
      font-size: 16px;
    `;
    loadingEl.textContent = "正在生成 PDF...";
    document.body.appendChild(loadingEl);

    // 使用 html2canvas 截图
    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    // 计算 PDF 尺寸
    const imgWidth = format === "a4" ? 210 : 216; // A4: 210mm, Letter: 216mm
    const imgHeight = format === "a4" ? 297 : 279; // A4: 297mm, Letter: 279mm
    const contentWidth = imgWidth - margin * 2;
    const contentHeight = imgHeight - margin * 2;

    // 计算图片在 PDF 中的尺寸
    const ratio = canvas.width / canvas.height;
    let pdfImgWidth = contentWidth;
    let pdfImgHeight = pdfImgWidth / ratio;

    // 如果高度超过一页，需要分页
    if (pdfImgHeight > contentHeight) {
      pdfImgHeight = contentHeight;
      pdfImgWidth = pdfImgHeight * ratio;
    }

    // 创建 PDF
    const pdf = new jsPDF({
      orientation,
      unit: "mm",
      format,
    });

    // 添加标题
    pdf.setFontSize(16);
    pdf.text("访客分析报告", margin, margin + 10);
    pdf.setFontSize(10);
    pdf.text(`生成时间: ${new Date().toLocaleString("zh-CN")}`, margin, margin + 18);

    // 添加图片
    const imgData = canvas.toDataURL("image/png");
    const startY = margin + 25;

    // 如果内容需要分页
    const pageHeight = contentHeight - 25; // 减去标题高度
    const totalPages = Math.ceil(pdfImgHeight / pageHeight);

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) {
        pdf.addPage();
      }

      const sourceY = (page * pageHeight * canvas.height) / pdfImgHeight;
      const sourceHeight = Math.min(
        (pageHeight * canvas.height) / pdfImgHeight,
        canvas.height - sourceY
      );

      pdf.addImage(
        imgData,
        "PNG",
        margin,
        startY,
        pdfImgWidth,
        pdfImgHeight,
        undefined,
        "FAST"
      );
    }

    // 添加页脚
    const totalPagesCount = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPagesCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.text(
        `第 ${i} 页 / 共 ${totalPagesCount} 页`,
        imgWidth / 2,
        imgHeight - 10,
        { align: "center" }
      );
    }

    // 保存 PDF
    pdf.save(filename);

    // 移除加载提示
    document.body.removeChild(loadingEl);
  } catch (error) {
    console.error("PDF export failed:", error);
    throw new Error("PDF 导出失败");
  }
}

/**
 * 导出统计摘要为 PDF
 */
export async function exportSummaryPdf(
  summary: {
    totalVisitors: number;
    provinceCount: number;
    cityCount: number;
    topProvinces: { name: string; count: number }[];
    topPages: { page: string; count: number }[];
  },
  filename?: string
): Promise<void> {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const margin = 20;
  let y = margin;

  // 标题
  pdf.setFontSize(20);
  pdf.text("访客分析报告", margin, y);
  y += 12;

  pdf.setFontSize(10);
  pdf.text(`生成时间: ${new Date().toLocaleString("zh-CN")}`, margin, y);
  y += 15;

  // 概览
  pdf.setFontSize(14);
  pdf.text("数据概览", margin, y);
  y += 8;

  pdf.setFontSize(11);
  pdf.text(`总访客数: ${summary.totalVisitors.toLocaleString()}`, margin + 5, y);
  y += 6;
  pdf.text(`覆盖省份: ${summary.provinceCount} 个`, margin + 5, y);
  y += 6;
  pdf.text(`覆盖城市: ${summary.cityCount} 个`, margin + 5, y);
  y += 12;

  // 省份排行
  pdf.setFontSize(14);
  pdf.text("省份排行 TOP 10", margin, y);
  y += 8;

  pdf.setFontSize(10);
  summary.topProvinces.slice(0, 10).forEach((province, index) => {
    pdf.text(
      `${index + 1}. ${province.name}: ${province.count.toLocaleString()}`,
      margin + 5,
      y
    );
    y += 5;
  });

  y += 8;

  // 热门页面
  pdf.setFontSize(14);
  pdf.text("热门页面 TOP 10", margin, y);
  y += 8;

  pdf.setFontSize(10);
  summary.topPages.slice(0, 10).forEach((page, index) => {
    // 截断长路径
    const displayPage = page.page.length > 40
      ? page.page.slice(0, 37) + "..."
      : page.page;

    pdf.text(
      `${index + 1}. ${displayPage}: ${page.count.toLocaleString()}`,
      margin + 5,
      y
    );
    y += 5;
  });

  // 页脚
  pdf.setFontSize(8);
  pdf.text(
    "此报告由 VitaLog 自动生成",
    210 / 2,
    297 - 10,
    { align: "center" }
  );

  // 保存
  pdf.save(filename || `访客报告_${new Date().toISOString().slice(0, 10)}.pdf`);
}
