/**
 * BLUEPRINT2D.JS - Bản Vẽ Kỹ Thuật 2D Tỷ Lệ Chuẩn (Technical Blueprint)
 * Vẽ sơ đồ kỹ thuật chi tiết hệt như tài liệu sản xuất của Zebra và Barcode VTN:
 * Có đường bế demi bo góc đỏ, đường răng cưa nét đứt, mũi tên kích thước và hướng cuộn.
 */

window.Blueprint2D = (function () {
  let canvas, ctx;

  function init() {
    canvas = document.getElementById('blueprint-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    // Nút tải ảnh bản vẽ 2D (hỗ trợ cả 2 id)
    document.getElementById('btn-download-blueprint')?.addEventListener('click', downloadBlueprintImage);
    document.getElementById('btn-download-blueprint-main')?.addEventListener('click', downloadBlueprintImage);

    render();
  }

  function render() {
    if (!canvas) canvas = document.getElementById('blueprint-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    const S = window.AppState;
    // Tỷ lệ khổ ngang kỹ thuật chuẩn 760 x 520 (Vừa vặn 100% màn hình, không bị to quá cỡ hay tràn trang)
    const cw = 760;
    const ch = 520;
    canvas.width = cw;
    canvas.height = ch;

    // 1. NỀN BẢN VẼ TRẮNG TINH KHIẾT KỸ THUẬT (CHUẨN BẢN VẼ ISO)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cw, ch);

    // Lưới kỹ thuật mờ
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1;
    for (let x = 0; x < cw; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ch);
      ctx.stroke();
    }
    for (let y = 0; y < ch; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cw, y);
      ctx.stroke();
    }

    // Tiêu đề bản vẽ căn giữa chuẩn trang
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 14px "JetBrains Mono", monospace';
    ctx.fillText('BẢN VẼ KỸ THUẬT QUY CÁCH BẾ TEM CUỘN', cw / 2, 28);
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.fillText(`Tỷ lệ kỹ thuật: 1:1 | Khổ cuộn: ${S.webWidth.toFixed(1)}mm | Lõi: ${S.coreDiameter.toFixed(0)}mm (${S.coreName || 'Chuẩn'})`, cw / 2, 44);

    // ==========================================
    // 2. TÍNH TOÁN KÍCH THƯỚC VÀ CĂN GIỮA TOÀN BỘ HÌNH VẼ
    // ==========================================
    const rollRx = 48;
    const rollRy = 85;
    const rollCy = 150;

    // Tính tỷ lệ elip cho lõi
    const coreRatio = Math.max(0.3, Math.min(0.65, S.coreDiameter / Math.max(S.outerDiameter, 80)));
    const coreRx = Math.round(rollRx * coreRatio);
    const coreRy = Math.round(rollRy * coreRatio);

    const availMaxW = 310;
    const availMaxH = 290;

    // Hiển thị 2 hàng tem (nếu nhãn quá dài > 80mm thì hiển thị 1 hàng)
    const targetRows = (S.labelHeight > 80) ? 1 : 2;
    const neededHMm = targetRows * S.labelHeight + (targetRows - 1) * S.gapY + 10;

    const scaleW = availMaxW / S.webWidth;
    const scaleH = (availMaxH - 32) / neededHMm;
    const scale = Math.min(scaleW, scaleH);

    const stripWidth = Math.round(S.webWidth * scale);
    const stripHeight = Math.round(neededHMm * scale) + 32;

    // CĂN GIỮA TOÀN BỘ CỤM HÌNH VẼ (ROLL + DẢI GIẤY + CÁC THƯỚC ĐO) TRÊN CANVAS
    const totalDrawingW = stripWidth + rollRx + 15 + 80 + 35;
    const leftMargin = Math.max(35, Math.round((cw - totalDrawingW) / 2));

    const rollCx = leftMargin + 80;
    const stripStartX = rollCx + rollRx + 15;
    const stripEndX = stripStartX + stripWidth;
    const stripStartY = rollCy + 10;

    const topY = rollCy - rollRy;
    const bottomY = rollCy + rollRy;
    const cornerR = Math.min(50, Math.round(stripWidth * 0.25));

    // Thân trụ cuộn tem (Cylinder body nối sang mép dải giấy)
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rollCx, topY);
    ctx.lineTo(stripEndX - cornerR, topY);
    ctx.arc(stripEndX - cornerR, topY + cornerR, cornerR, -Math.PI / 2, 0, false);
    ctx.lineTo(stripEndX, stripStartY);
    ctx.lineTo(stripStartX, stripStartY);
    ctx.lineTo(stripStartX, bottomY);
    ctx.lineTo(rollCx, bottomY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Mặt bên trái của cuộn tem (Elip và Lõi tròn chuẩn kỹ thuật)
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    // Vành ngoài
    ctx.beginPath();
    ctx.ellipse(rollCx, rollCy, rollRx, rollRy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Lỗ lõi
    ctx.beginPath();
    ctx.ellipse(rollCx, rollCy, coreRx, coreRy, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Chữ chỉ lõi "Lõi 40mm" với mũi tên xanh chỉ thẳng vào tâm lõi (rõ ràng, không bị đè)
    ctx.fillStyle = '#1d4ed8';
    ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`Lõi ${S.coreDiameter.toFixed(0)}mm`, rollCx - coreRx - 20, rollCy - 8);
    drawArrow(ctx, rollCx - coreRx - 15, rollCy - 8, rollCx - 4, rollCy, '#1d4ed8', 1.8);

    // ==========================================
    // 3. VẼ DẢI GIẤY CUỘN DUỖI THẲNG XUỐNG
    // ==========================================
    // Đường bao biên đế giấy trắng sắc nét
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.fillRect(stripStartX, stripStartY, stripWidth, stripHeight);
    ctx.strokeRect(stripStartX, stripStartY, stripWidth, stripHeight);
    ctx.restore();

    // Mũi tên hướng ra tem bên trái (dưới mặt bên cuộn tem, vừa vặn không va chạm)
    drawBigWindingArrow(ctx, rollCx - 18, bottomY + 25, 135);

    // ==========================================
    // 4. VẼ CÁC CON TEM & ĐƯỜNG BẾ DEMI (ĐỎ NÉT LIỀN)
    // ==========================================
    const labelW_px = S.labelWidth * scale;
    const labelH_px = S.labelHeight * scale;
    const gapX_px = S.gapX * scale;
    const gapY_px = S.gapY * scale;
    const marginX_px = S.marginX * scale;
    const radius_px = S.cornerRadius * scale;

    const topLabelPadding = 24;
    const numRows = targetRows;

    // Lấy canvas sạch (không dính khung chọn / 8 tay cầm) từ Designer
    const desCanvas = window.LabelDesigner?.getCleanCanvas
      ? window.LabelDesigner.getCleanCanvas()
      : window.LabelDesigner?.getCanvas();

    for (let r = 0; r < numRows; r++) {
      const rowY = stripStartY + topLabelPadding + r * (labelH_px + gapY_px);

      for (let col = 0; col < S.ups; col++) {
        const labelX = stripStartX + marginX_px + col * (labelW_px + gapX_px);

        const fillCol = (S.labelColor && S.labelColor !== '#FFFFFF' && S.labelColor !== '#ffffff')
          ? S.labelColor
          : '#ffffff';

        // Nền tem
        if (S.shape === 'circle') {
          const rad = Math.min(labelW_px, labelH_px) / 2;
          ctx.beginPath();
          ctx.arc(labelX + labelW_px / 2, rowY + labelH_px / 2, rad, 0, Math.PI * 2);
          ctx.fillStyle = fillCol;
          ctx.fill();
        } else if (S.shape === 'oval') {
          ctx.beginPath();
          ctx.ellipse(labelX + labelW_px / 2, rowY + labelH_px / 2, labelW_px / 2, labelH_px / 2, 0, 0, Math.PI * 2);
          ctx.fillStyle = fillCol;
          ctx.fill();
        } else {
          ctx.fillStyle = fillCol;
          drawRoundedRect(ctx, labelX, rowY, labelW_px, labelH_px, radius_px, true, false);
        }

        // Vẽ nội dung maket tem thực tế từ Designer trên TẤT CẢ các tem (Tem 1, Tem 2,...)
        if (desCanvas && desCanvas.width > 0 && desCanvas.height > 0) {
          ctx.save();
          if (S.shape === 'circle') {
            const rad = Math.min(labelW_px, labelH_px) / 2;
            ctx.beginPath();
            ctx.arc(labelX + labelW_px / 2, rowY + labelH_px / 2, rad, 0, Math.PI * 2);
            ctx.clip();
          } else if (S.shape === 'oval') {
            ctx.beginPath();
            ctx.ellipse(labelX + labelW_px / 2, rowY + labelH_px / 2, labelW_px / 2, labelH_px / 2, 0, 0, Math.PI * 2);
            ctx.clip();
          } else if (radius_px > 0) {
            drawRoundedRect(ctx, labelX, rowY, labelW_px, labelH_px, radius_px, false, false);
            ctx.clip();
          }
          ctx.drawImage(desCanvas, labelX, rowY, labelW_px, labelH_px);
          ctx.restore();
        } else {
          // Placeholder chữ nếu chưa có canvas
          ctx.save();
          ctx.fillStyle = '#64748b';
          ctx.font = '11px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`Tem ${r * S.ups + col + 1}`, labelX + labelW_px / 2, rowY + labelH_px / 2 + 4);
          ctx.restore();
        }

        // Đường bế demi đỏ (Die-cut line) sắc nét
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.6;
        if (S.shape === 'circle') {
          const rad = Math.min(labelW_px, labelH_px) / 2;
          ctx.beginPath();
          ctx.arc(labelX + labelW_px / 2, rowY + labelH_px / 2, rad, 0, Math.PI * 2);
          ctx.stroke();
        } else if (S.shape === 'oval') {
          ctx.beginPath();
          ctx.ellipse(labelX + labelW_px / 2, rowY + labelH_px / 2, labelW_px / 2, labelH_px / 2, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          drawRoundedRect(ctx, labelX, rowY, labelW_px, labelH_px, radius_px, false, true);
        }
      }

      // Đường răng cưa (Perforation line) nét đứt giữa các hàng
      if (S.hasPerforation && r < numRows - 1) {
        const perfY = rowY + labelH_px + gapY_px / 2;
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(stripStartX, perfY);
        ctx.lineTo(stripStartX + stripWidth, perfY);
        ctx.stroke();
        ctx.restore();
      }
    }

    // ==========================================
    // 5. CÁC ĐƯỜNG THƯỚC ĐO KÍCH THƯỚC CHI TIẾT (CHUẨN BẢN VẼ KỸ THUẬT)
    // ==========================================
    const firstRowY = stripStartY + topLabelPadding;
    const lastColIndex = S.ups - 1;
    const targetLabelX = stripStartX + marginX_px + lastColIndex * (labelW_px + gapX_px);
    const firstLabelX = stripStartX + marginX_px;

    // A. Thước đo chiều rộng con tem / đường kính (Ø)
    const dimWText = S.shape === 'circle' ? `Ø${S.labelWidth}mm` : `${S.labelWidth}mm`;
    drawDimensionH(ctx, targetLabelX, targetLabelX + labelW_px, firstRowY - 9, dimWText, '#1d4ed8');

    // B. Thước đo chiều cao con tem bên hông tem bên phải (side: right)
    drawDimensionV(ctx, targetLabelX + labelW_px + 8, firstRowY, firstRowY + labelH_px, `${S.labelHeight}mm`, '#1d4ed8', false, 'right');

    // C. Thước đo khoảng cách giữa 2 con tem trên cùng hàng (Gap X)
    if (S.ups > 1 && S.gapX > 0) {
      const gapXStart = firstLabelX + labelW_px;
      const gapXEnd = gapXStart + gapX_px;
      drawDimensionH(ctx, gapXStart, gapXEnd, firstRowY + labelH_px / 2, `${S.gapX}mm`, '#059669', true);
    }

    // D. Thước đo bước nhảy 2 hàng (Gap Y) - Đẩy ra ngoài dải giấy + có đường gióng kỹ thuật
    if (S.gapY > 0 && numRows > 1) {
      const gapYStart = firstRowY + labelH_px;
      const secondRowY = firstRowY + labelH_px + gapY_px;
      const dimGapX = stripStartX - 24; // Dịch ra ngoài mép dải giấy 24px

      // Đường gióng ngang từ mép tem/dải giấy ra thước đo
      ctx.save();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.moveTo(stripStartX, gapYStart);
      ctx.lineTo(dimGapX - 2, gapYStart);
      ctx.moveTo(stripStartX, secondRowY);
      ctx.lineTo(dimGapX - 2, secondRowY);
      ctx.stroke();
      ctx.restore();

      // Thước đo đứng hiển thị số nằm ngang cực kỳ dễ nhìn
      drawDimensionV(ctx, dimGapX, gapYStart, secondRowY, `${S.gapY}mm`, '#059669', true, 'left', true);
    }

    // E. Thước đo khổ cuộn giấy (Web Width)
    const bottomDimY = stripStartY + stripHeight + 16;
    drawDimensionH(ctx, stripStartX, stripEndX, bottomDimY, `Khổ rộng cuộn: ${S.webWidth.toFixed(1)} mm`, '#ec4899');
  }

  /**
   * VẼ ĐƯỜNG KÍCH THƯỚC NGANG (HORIZONTAL DIMENSION)
   */
  function drawDimensionH(c, x1, x2, y, text, color, isSmall = false) {
    c.save();
    c.strokeStyle = color;
    c.fillStyle = color;
    c.lineWidth = 1.4;

    // Đường gióng chính
    c.beginPath();
    c.moveTo(x1, y);
    c.lineTo(x2, y);
    c.stroke();

    // Vạch chặn hai đầu
    c.beginPath();
    c.moveTo(x1, y - 3);
    c.lineTo(x1, y + 3);
    c.moveTo(x2, y - 3);
    c.lineTo(x2, y + 3);
    c.stroke();

    // 2 Mũi tên
    drawArrowHead(c, x1 + 5, y, x1, y, color);
    drawArrowHead(c, x2 - 5, y, x2, y, color);

    // Text kích thước
    c.font = `bold ${isSmall ? 10 : 11}px "JetBrains Mono", monospace`;
    c.textAlign = 'center';
    c.textBaseline = 'bottom';

    // Nền trắng che mờ sau chữ để chống đè nét
    const textW = c.measureText(text).width;
    c.fillStyle = '#ffffff';
    c.fillRect((x1 + x2) / 2 - textW / 2 - 2, y - 13, textW + 4, 11);

    c.fillStyle = color;
    c.fillText(text, (x1 + x2) / 2, y - 2);
    c.restore();
  }

  /**
   * VẼ ĐƯỜNG KÍCH THƯỚC DỌC (VERTICAL DIMENSION)
   */
  function drawDimensionV(c, x, y1, y2, text, color, isSmall = false, side = 'right', horizontalText = false) {
    c.save();
    c.strokeStyle = color;
    c.fillStyle = color;
    c.lineWidth = 1.4;

    // Đường gióng chính
    c.beginPath();
    c.moveTo(x, y1);
    c.lineTo(x, y2);
    c.stroke();

    // Vạch chặn hai đầu
    c.beginPath();
    c.moveTo(x - 3, y1);
    c.lineTo(x + 3, y1);
    c.moveTo(x - 3, y2);
    c.lineTo(x + 3, y2);
    c.stroke();

    // 2 Mũi tên
    drawArrowHead(c, x, y1 + 5, x, y1, color);
    drawArrowHead(c, x, y2 - 5, x, y2, color);

    c.save();
    c.font = `bold ${isSmall ? 11 : 12}px "JetBrains Mono", monospace`;

    if (horizontalText) {
      // Chữ hiển thị NẰM NGANG không cần nghiêng đầu
      c.textAlign = side === 'left' ? 'right' : 'left';
      c.textBaseline = 'middle';
      const textX = side === 'left' ? x - 6 : x + 6;
      const textY = (y1 + y2) / 2;

      // Nền trắng che mờ sau chữ
      const textW = c.measureText(text).width;
      c.fillStyle = '#ffffff';
      c.fillRect(side === 'left' ? textX - textW - 2 : textX - 1, textY - 7, textW + 4, 14);

      c.fillStyle = color;
      c.fillText(text, textX, textY);
    } else {
      // Text kích thước xoay 90 độ
      const offsetX = side === 'right' ? 8 : -8;
      c.translate(x + offsetX, (y1 + y2) / 2);
      c.rotate(-Math.PI / 2);
      c.textAlign = 'center';
      c.textBaseline = side === 'right' ? 'top' : 'bottom';

      // Nền trắng che mờ sau chữ
      const textW = c.measureText(text).width;
      c.fillStyle = '#ffffff';
      c.fillRect(-textW / 2 - 2, side === 'right' ? -1 : -11, textW + 4, 11);

      c.fillStyle = color;
      c.fillText(text, 0, 0);
    }
    c.restore();

    c.restore();
  }

  function drawArrowHead(c, fromX, fromY, toX, toY, color) {
    const headLen = 6;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    c.beginPath();
    c.moveTo(toX, toY);
    c.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
    c.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
    c.closePath();
    c.fillStyle = color;
    c.fill();
  }

  function drawArrow(c, fromX, fromY, toX, toY, color, width = 2) {
    c.save();
    c.strokeStyle = color;
    c.lineWidth = width;
    c.beginPath();
    c.moveTo(fromX, fromY);
    c.lineTo(toX, toY);
    c.stroke();
    drawArrowHead(c, fromX, fromY, toX, toY, color);
    c.restore();
  }

  /**
   * MŨI TÊN CHỈ HƯỚNG RA TEM (WINDING DIRECTION ARROW)
   */
  function drawBigWindingArrow(c, x, y, length) {
    c.save();
    c.strokeStyle = '#2563eb';
    c.fillStyle = '#1e40af';
    c.lineWidth = 2;

    // Vẽ thân mũi tên vừa vặn
    const shaftW = 12;
    const headW = 26;
    const headLen = 28;

    c.beginPath();
    c.moveTo(x - shaftW / 2, y);
    c.lineTo(x + shaftW / 2, y);
    c.lineTo(x + shaftW / 2, y + length - headLen);
    c.lineTo(x + headW / 2, y + length - headLen);
    c.lineTo(x, y + length);
    c.lineTo(x - headW / 2, y + length - headLen);
    c.lineTo(x - shaftW / 2, y + length - headLen);
    c.closePath();
    c.fill();
    c.stroke();

    // Chữ chú thích hướng cuộn xoay dọc
    c.save();
    c.translate(x - 16, y + length / 2);
    c.rotate(-Math.PI / 2);
    c.fillStyle = '#3b82f6';
    c.font = 'bold 10px "JetBrains Mono", monospace';
    c.textAlign = 'center';
    c.fillText('HƯỚNG RA TEM (OUT)', 0, 0);
    c.restore();

    c.restore();
  }

  function drawRoundedRect(c, x, y, w, h, r, fill, stroke) {
    r = Math.min(r, w / 2, h / 2);
    r = Math.max(0, r);

    c.beginPath();
    if (r === 0) {
      c.rect(x, y, w, h);
    } else {
      c.moveTo(x + r, y);
      c.lineTo(x + w - r, y);
      c.quadraticCurveTo(x + w, y, x + w, y + r);
      c.lineTo(x + w, y + h - r);
      c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      c.lineTo(x + r, y + h);
      c.quadraticCurveTo(x, y + h, x, y + h - r);
      c.lineTo(x, y + r);
      c.quadraticCurveTo(x, y, x + r, y);
    }
    c.closePath();
    if (fill) c.fill();
    if (stroke) c.stroke();
  }

  function downloadBlueprintImage() {
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `Ban-Ve-Ky-Thuat-Tem-Cuon-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  return {
    init,
    render,
    getCanvas: () => canvas
  };
})();

// Khởi tạo sau khi DOM load
document.addEventListener('DOMContentLoaded', () => {
  window.Blueprint2D.init();
});
