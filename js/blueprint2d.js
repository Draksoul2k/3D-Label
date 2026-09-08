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

    // Nút tải ảnh bản vẽ 2D
    document.getElementById('btn-download-blueprint')?.addEventListener('click', downloadBlueprintImage);

    render();
  }

  function render() {
    if (!canvas) canvas = document.getElementById('blueprint-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    const S = window.AppState;
    const cw = 700;
    const ch = 720;
    canvas.width = cw;
    canvas.height = ch;

    // 1. NỀN BẢN VẼ TRẮNG TINH KHIẾT KỸ THUẬT (CHUẨN HÌNH MẪU 2)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cw, ch);

    // Lưới kỹ thuật mờ
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let x = 0; x < cw; x += 25) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ch);
      ctx.stroke();
    }
    for (let y = 0; y < ch; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cw, y);
      ctx.stroke();
    }

    // Tiêu đề bản vẽ
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 15px "JetBrains Mono", monospace';
    ctx.fillText('BẢN VẼ KỸ THUẬT QUY CÁCH BẾ TEM CUỘN', 30, 35);
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.fillText(`Tỷ lệ kỹ thuật: 1:1 | Khổ cuộn: ${S.webWidth.toFixed(1)}mm | Lõi: ${S.coreDiameter.toFixed(0)}mm (${S.coreName})`, 30, 52);

    // ==========================================
    // 2. VẼ MINH HỌA CUỘN TEM TRÒN & LÕI (NHƯ ẢNH MẪU 2)
    // ==========================================
    const rollTopY = 80;
    const rollCenterX = 350;
    const rollCenterY = 160;
    const rollOuterRadiusX = 140;
    const rollOuterRadiusY = 50;

    // Tính tỷ lệ elip cho lõi
    const coreRatio = S.coreDiameter / Math.max(S.outerDiameter, 80);
    const coreRadiusX = Math.max(25, rollOuterRadiusX * coreRatio);
    const coreRadiusY = Math.max(10, rollOuterRadiusY * coreRatio);

    // Vẽ hình dáng cuộn elip nét vẽ kỹ thuật đen sắc nét
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;

    // Vành ngoài cuộn tem
    ctx.beginPath();
    ctx.ellipse(rollCenterX, rollCenterY, rollOuterRadiusX, rollOuterRadiusY, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Lõi trong cuộn tem
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(rollCenterX, rollCenterY, coreRadiusX, coreRadiusY, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Chữ chỉ lõi "Lõi 30mm" màu xanh đậm với mũi tên chỉ thẳng vào tâm lỗ lõi (Y HỆT ẢNH 2)
    ctx.fillStyle = '#1d4ed8';
    ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`Lõi ${S.coreDiameter.toFixed(0)}mm`, rollCenterX - coreRadiusX - 45, rollCenterY - 10);

    // Mũi tên chỉ vào lỗ lõi
    drawArrow(ctx, rollCenterX - coreRadiusX - 40, rollCenterY - 10, rollCenterX - 5, rollCenterY, '#1d4ed8', 2);

    // ==========================================
    // 3. VẼ DẢI GIẤY CUỘN DUỖI THẲNG XUỐNG
    // ==========================================
    const stripStartX = rollCenterX - rollOuterRadiusX;
    const stripWidth = rollOuterRadiusX * 2;
    const stripStartY = rollCenterY;
    const stripHeight = 460;

    // Đường bao biên đế giấy trắng
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(stripStartX, stripStartY, stripWidth, stripHeight);
    ctx.strokeRect(stripStartX, stripStartY, stripWidth, stripHeight);

    // Mũi tên hướng ra tem bên trái
    drawBigWindingArrow(ctx, stripStartX - 45, stripStartY + 80, 220);

    // ==========================================
    // 4. VẼ CÁC CON TEM & ĐƯỜNG BẾ DEMI (ĐỎ NÉT LIỀN)
    // ==========================================
    // Tính toán tỷ lệ scale pixel / mm
    const scale = stripWidth / S.webWidth;
    const labelW_px = S.labelWidth * scale;
    const labelH_px = S.labelHeight * scale;
    const gapX_px = S.gapX * scale;
    const gapY_px = S.gapY * scale;
    const marginX_px = S.marginX * scale;
    const radius_px = S.cornerRadius * scale;

    const numRows = Math.min(3, Math.floor((stripHeight - 30) / (labelH_px + gapY_px)));

    for (let r = 0; r < numRows; r++) {
      const rowY = stripStartY + 30 + r * (labelH_px + gapY_px);

      for (let col = 0; col < S.ups; col++) {
        const labelX = stripStartX + marginX_px + col * (labelW_px + gapX_px);

        // Vẽ nền tem & đường bế demi đỏ (Die-cut line)
        if (S.shape === 'circle') {
          const rad = Math.min(labelW_px, labelH_px) / 2;
          ctx.beginPath();
          ctx.arc(labelX + labelW_px / 2, rowY + labelH_px / 2, rad, 0, Math.PI * 2);
          ctx.fillStyle = S.labelColor || '#FFFFFF';
          ctx.fill();
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.8;
          ctx.stroke();
        } else if (S.shape === 'oval') {
          ctx.beginPath();
          ctx.ellipse(labelX + labelW_px / 2, rowY + labelH_px / 2, labelW_px / 2, labelH_px / 2, 0, 0, Math.PI * 2);
          ctx.fillStyle = S.labelColor || '#FFFFFF';
          ctx.fill();
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.8;
          ctx.stroke();
        } else {
          ctx.fillStyle = S.labelColor || '#FFFFFF';
          drawRoundedRect(ctx, labelX, rowY, labelW_px, labelH_px, radius_px, true, false);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.8;
          drawRoundedRect(ctx, labelX, rowY, labelW_px, labelH_px, radius_px, false, true);
        }

        // Vẽ nội dung maket tem thực tế từ Designer nếu có
        const desCanvas = window.LabelDesigner?.getCanvas();
        if (desCanvas && r === 0 && col === 0) {
          ctx.save();
          if (S.shape === 'circle') {
            const rad = Math.min(labelW_px, labelH_px) / 2;
            ctx.beginPath();
            ctx.arc(labelX + labelW_px / 2, rowY + labelH_px / 2, rad, 0, Math.PI * 2);
            ctx.clip();
          }
          ctx.drawImage(desCanvas, labelX, rowY, labelW_px, labelH_px);
          ctx.restore();
        }
      }

      // Đường răng cưa (Perforation line) đứt nét
      if (S.hasPerforation && r < numRows - 1) {
        const perfY = rowY + labelH_px + gapY_px / 2;
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(stripStartX, perfY);
        ctx.lineTo(stripStartX + stripWidth, perfY);
        ctx.stroke();
        ctx.restore();
      }
    }

    // ==========================================
    // 5. CÁC ĐƯỜNG THƯỚC ĐO KÍCH THƯỚC CHI TIẾT (CHUẨN HÌNH 2)
    // ==========================================
    const firstRowY = stripStartY + 30;
    // Con tem góc trên bên phải (cột cuối cùng của hàng 0)
    const lastColIndex = S.ups - 1;
    const targetLabelX = stripStartX + marginX_px + lastColIndex * (labelW_px + gapX_px);

    // A. Thước đo chiều rộng con tem / đường kính (Ø)
    const dimWText = S.shape === 'circle' ? `Ø${S.labelWidth}mm` : `${S.labelWidth}mm`;
    drawDimensionH(ctx, targetLabelX, targetLabelX + labelW_px, firstRowY - 8, dimWText, '#1d4ed8');

    // B. Thước đo chiều cao con tem (^ v 38mm) bên hông con tem bên phải
    drawDimensionV(ctx, targetLabelX + labelW_px + 8, firstRowY, firstRowY + labelH_px, `${S.labelHeight}mm`, '#1d4ed8');

    // C. Thước đo khoảng cách giữa 2 con tem trên cùng hàng (Gap X: 3mm)
    if (S.ups > 1 && S.gapX > 0) {
      const firstLabelX = stripStartX + marginX_px;
      const gapXStart = firstLabelX + labelW_px;
      const gapXEnd = gapXStart + gapX_px;
      drawDimensionH(ctx, gapXStart, gapXEnd, firstRowY + labelH_px / 2, `${S.gapX}mm`, '#059669', true);
    }

    // D. Thước đo bước nhảy 2 hàng (Gap Y: 3mm)
    if (S.gapY > 0 && numRows > 1) {
      const firstLabelX = stripStartX + marginX_px;
      const gapYStart = firstRowY + labelH_px;
      const gapYEnd = gapYStart + gapY_px;
      drawDimensionV(ctx, firstLabelX - 8, gapYStart, gapYEnd, `${S.gapY}mm`, '#059669', true);
    }

    // E. Thước đo khổ cuộn giấy (Total Web Width: e.g. 107mm)
    const bottomDimY = stripStartY + stripHeight + 20;
    drawDimensionH(ctx, stripStartX, stripStartX + stripWidth, bottomDimY, `Khổ rộng cuộn: ${S.webWidth.toFixed(1)} mm`, '#ec4899');
  }

  /**
   * VẼ ĐƯỜNG KÍCH THƯỚC NGANG (HORIZONTAL DIMENSION)
   */
  function drawDimensionH(c, x1, x2, y, text, color, isSmall = false) {
    c.save();
    c.strokeStyle = color;
    c.fillStyle = color;
    c.lineWidth = 1.5;

    // Đường gióng chính
    c.beginPath();
    c.moveTo(x1, y);
    c.lineTo(x2, y);
    c.stroke();

    // Vạch chặn hai đầu
    c.beginPath();
    c.moveTo(x1, y - 4);
    c.lineTo(x1, y + 4);
    c.moveTo(x2, y - 4);
    c.lineTo(x2, y + 4);
    c.stroke();

    // 2 Mũi tên
    drawArrowHead(c, x1 + 6, y, x1, y, color);
    drawArrowHead(c, x2 - 6, y, x2, y, color);

    // Text kích thước
    c.font = `bold ${isSmall ? 10 : 12}px "JetBrains Mono", monospace`;
    c.textAlign = 'center';
    c.textBaseline = 'bottom';
    c.fillText(text, (x1 + x2) / 2, y - 3);
    c.restore();
  }

  /**
   * VẼ ĐƯỜNG KÍCH THƯỚC DỌC (VERTICAL DIMENSION)
   */
  function drawDimensionV(c, x, y1, y2, text, color, isSmall = false) {
    c.save();
    c.strokeStyle = color;
    c.fillStyle = color;
    c.lineWidth = 1.5;

    // Đường gióng chính
    c.beginPath();
    c.moveTo(x, y1);
    c.lineTo(x, y2);
    c.stroke();

    // Vạch chặn hai đầu
    c.beginPath();
    c.moveTo(x - 4, y1);
    c.lineTo(x + 4, y1);
    c.moveTo(x - 4, y2);
    c.lineTo(x + 4, y2);
    c.stroke();

    // 2 Mũi tên
    drawArrowHead(c, x, y1 + 6, x, y1, color);
    drawArrowHead(c, x, y2 - 6, x, y2, color);

    // Text kích thước xoay 90 độ
    c.save();
    c.translate(x - 6, (y1 + y2) / 2);
    c.rotate(-Math.PI / 2);
    c.font = `bold ${isSmall ? 10 : 12}px "JetBrains Mono", monospace`;
    c.textAlign = 'center';
    c.textBaseline = 'bottom';
    c.fillText(text, 0, 0);
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
   * MŨI TÊN CHỈ HƯỚNG RA TEM (WINDING DIRECTION ARROW LỚN)
   */
  function drawBigWindingArrow(c, x, y, length) {
    c.save();
    c.strokeStyle = '#2563eb';
    c.fillStyle = '#1e40af';
    c.lineWidth = 3;

    // Vẽ thân mũi tên lớn
    const shaftW = 16;
    const headW = 34;
    const headLen = 40;

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
    c.translate(x - 22, y + length / 2);
    c.rotate(-Math.PI / 2);
    c.fillStyle = '#60a5fa';
    c.font = 'bold 11px "JetBrains Mono", monospace';
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
