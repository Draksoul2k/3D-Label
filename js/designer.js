/**
 * DESIGNER.JS - Trình Thiết Kế Tem Thông Minh (AI Smart Layout & Visual Drag/Drop Editor)
 * Tự động phân tích thông tin, chia ô, tính toán cỡ chữ vừa khít theo kích thước tem mm,
 * và cho phép kéo thả, chỉnh sửa trực tiếp từng phần tử.
 */

window.LabelDesigner = (function () {
  let canvas, ctx;
  let canvasWidth = 600;
  let canvasHeight = 360;
  let elements = [];
  let selectedElementId = null;
  let selectedElementIds = [];
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let dragInitialPositions = {};
  let uploadedLogoImg = null;
  let clean3dCanvas = null;

  function init() {
    canvas = document.getElementById('label-designer-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    setupCanvasDimensions();
    setupEventListeners();

    // Mặc định ban đầu: tem trắng tinh chưa có thiết kế gì theo yêu cầu
    initBlankLabel();
  }

  function initBlankLabel() {
    setupCanvasDimensions();
    elements = [];
    selectedElementId = null;
    selectedElementIds = [];
    undoStack = [];
    redoStack = [];
    syncSelectedElementToUI(null);
    render();
    if (window.Roll3D && typeof window.Roll3D.syncLabelTexture === 'function') {
      window.Roll3D.syncLabelTexture(clean3dCanvas || canvas);
    }
  }

  /**
   * THIẾT LẬP KÍCH THƯỚC CANVAS DỰA TRÊN TỶ LỆ KÍCH THƯỚC TEM THẬT (W x H mm)
   */
  function setupCanvasDimensions() {
    const S = window.AppState;
    const maxW = 1200;
    const maxH = 800;

    // Nếu là tem tròn, canvas luôn là hình vuông 1:1 chuẩn xác
    if (S.shape === 'circle') {
      canvasWidth = 900;
      canvasHeight = 900;
      canvas.width = 900;
      canvas.height = 900;
      const container = document.getElementById('label-canvas-container');
      if (container) {
        canvas.style.maxWidth = '100%';
        canvas.style.maxHeight = '100%';
      }
      return;
    }

    const ratio = (S.labelWidth || 50) / (S.labelHeight || 38);

    if (ratio >= 1) {
      canvasWidth = maxW;
      canvasHeight = Math.max(300, Math.round(maxW / ratio));
      if (canvasHeight > maxH) {
        canvasHeight = maxH;
        canvasWidth = Math.round(maxH * ratio);
      }
    } else {
      canvasHeight = maxH;
      canvasWidth = Math.max(300, Math.round(maxH * ratio));
      if (canvasWidth > maxW) {
        canvasWidth = maxW;
        canvasHeight = Math.round(maxW / ratio);
      }
    }

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Cập nhật badge hiển thị kích thước tem thiết kế
    const dimBadge = document.getElementById('designer-canvas-dim-badge');
    if (dimBadge) {
      if (S.shape === 'circle') {
        dimBadge.textContent = `Ø ${S.labelDiameter || 40} mm (Tròn 100%)`;
      } else {
        dimBadge.textContent = `${S.labelWidth} x ${S.labelHeight} mm`;
      }
    }

    // Cân đối container hiển thị
    const container = document.getElementById('label-canvas-container');
    if (container) {
      canvas.style.maxWidth = '100%';
      canvas.style.maxHeight = '100%';
    }
  }

  /**
   * TẠO MẪU PHÔI TEM IN SẴN TIÊU ĐỀ & Ô TRỐNG IN ĐÈ LẦN 2
   * Ví dụ: Tên hàng: [  ], Mã hàng: [  ], Giá tiền: [  ]
   */
  function generateBlankFieldTemplate() {
    setupCanvasDimensions();
    elements = [];
    selectedElementId = null;

    const cw = canvasWidth;
    const ch = canvasHeight;
    const paddingX = Math.round(cw * 0.07);
    const paddingY = Math.round(ch * 0.08);

    // 1. Tiêu đề đầu tem hoặc Logo (nếu có)
    const headerInput = document.getElementById('tpl-header-text');
    const headerText = headerInput ? headerInput.value.trim() : '';

    let currentY = paddingY;

    if (uploadedLogoImg) {
      const logoH = Math.min(Math.round(ch * 0.16), 80);
      const aspect = (uploadedLogoImg.width || 100) / (uploadedLogoImg.height || 100);
      const logoW = Math.round(logoH * aspect);
      elements.push({
        id: 'tpl_logo_' + Date.now(),
        type: 'image',
        img: uploadedLogoImg,
        x: cw / 2,
        y: currentY + logoH / 2,
        w: logoW,
        h: logoH
      });
      currentY += logoH + 8;
    }

    if (headerText) {
      const headerFontSize = parseInt(document.getElementById('tpl-header-size-slider')?.value) || 48;
      const headerAlign = document.getElementById('tpl-header-align')?.value || 'center';
      const headerDivider = document.getElementById('tpl-header-divider')?.value || 'line';
      const headerFontFamily = document.getElementById('tpl-font-family')?.value || "'Plus Jakarta Sans', sans-serif";

      let headerX = cw / 2;
      if (headerAlign === 'left') headerX = paddingX + 5;
      else if (headerAlign === 'right') headerX = cw - paddingX - 5;

      elements.push({
        id: 'tpl_header_' + Date.now(),
        type: 'text',
        text: headerText.toUpperCase(),
        x: headerX,
        y: currentY + headerFontSize / 2,
        fontSize: headerFontSize,
        fontFamily: headerFontFamily,
        fontWeight: 'bold',
        align: headerAlign,
        color: '#0f172a'
      });
      currentY += headerFontSize + 10;

      if (headerDivider === 'line') {
        elements.push({
          id: 'tpl_header_line_' + Date.now(),
          type: 'line',
          x1: paddingX,
          y1: currentY,
          x2: cw - paddingX,
          y2: currentY,
          color: '#94a3b8',
          lineWidth: 2.5
        });
        currentY += 14;
      }
    }

    // 2. Tùy chọn mã vạch / QR dưới đáy tem
    const barcodeOption = document.getElementById('tpl-barcode-option')?.value || 'none';
    let bottomReserved = 0;
    if (barcodeOption === 'code128') {
      bottomReserved = Math.max(65, Math.round(ch * 0.22));
    } else if (barcodeOption === 'qrcode') {
      bottomReserved = Math.max(65, Math.round(ch * 0.25));
    }

    // 3. Danh sách các trường nhãn
    const fieldInputs = document.querySelectorAll('#template-fields-container .field-label-input');
    const fieldLabels = [];
    fieldInputs.forEach(input => {
      const val = input.value.trim();
      if (val) fieldLabels.push(val);
    });

    if (fieldLabels.length === 0) {
      fieldLabels.push('Tên hàng:', 'Mã hàng:', 'Giá tiền:');
    }

    const boxStyle = document.getElementById('tpl-box-style')?.value || 'box';

    const availH = (ch - paddingY - bottomReserved) - currentY;
    const numFields = fieldLabels.length;
    const rowH = Math.max(26, Math.floor(availH / numFields));

    // Lấy cài đặt Cỡ chữ, Phông chữ, Kiểu nét và Chiều cao ô từ giao diện
    const sliderSize = parseInt(document.getElementById('tpl-font-size-slider')?.value) || 36;
    const fontFamily = document.getElementById('tpl-font-family')?.value || "'Plus Jakarta Sans', sans-serif";
    const fontWeight = document.getElementById('tpl-font-weight')?.value || 'bold';
    const boxHeightPercent = (parseInt(document.getElementById('tpl-box-height-slider')?.value) || 80) / 100;

    const fontSize = sliderSize;

    // Đo kích thước chữ dựa trên đúng font và cỡ chữ người dùng chọn
    ctx.font = `${fontWeight === 'bold' ? 'bold' : 'normal'} ${fontSize}px ${fontFamily}`;
    let maxLabelTextW = 0;
    for (const label of fieldLabels) {
      const w = ctx.measureText(label).width;
      if (w > maxLabelTextW) maxLabelTextW = w;
    }

    const usableW = cw - paddingX * 2;
    // Cột nhãn tự động dãn theo kích thước chữ (từ 25% đến 60% chiều rộng)
    const labelColW = Math.max(Math.round(usableW * 0.25), Math.min(Math.round(usableW * 0.60), maxLabelTextW + 30));
    const boxX = paddingX + labelColW + 10;
    const boxW = (cw - paddingX) - boxX;

    // KIỂU 1: BẢNG LƯỚI KHÉP KÍN (grid_table)
    if (boxStyle === 'grid_table') {
      const tableTopY = Math.round(currentY);
      const tableBottomY = Math.round(currentY + rowH * numFields);
      const tableW = Math.round(usableW);

      elements.push({
        id: 'tbl_border_outer',
        type: 'rect',
        x: Math.round(paddingX),
        y: tableTopY,
        w: tableW,
        h: tableBottomY - tableTopY,
        stroke: '#0f172a',
        lineWidth: 3.5,
        fill: 'transparent'
      });

      elements.push({
        id: 'tbl_v_divider',
        type: 'line',
        x1: Math.round(paddingX + labelColW),
        y1: tableTopY,
        x2: Math.round(paddingX + labelColW),
        y2: tableBottomY,
        color: '#0f172a',
        lineWidth: 2.5
      });

      for (let i = 0; i < numFields; i++) {
        const rowCenterY = Math.round(tableTopY + (i + 0.5) * rowH);
        const lineY = Math.round(tableTopY + (i + 1) * rowH);

        elements.push({
          id: `field_lbl_${i}`,
          type: 'text',
          text: fieldLabels[i],
          x: Math.round(paddingX + 12),
          y: rowCenterY,
          fontSize: fontSize,
          fontFamily: fontFamily,
          fontWeight: fontWeight,
          align: 'left',
          color: '#0f172a'
        });

        if (i < numFields - 1) {
          elements.push({
            id: `tbl_h_line_${i}`,
            type: 'line',
            x1: Math.round(paddingX),
            y1: lineY,
            x2: Math.round(paddingX + tableW),
            y2: lineY,
            color: '#0f172a',
            lineWidth: 2.0
          });
        }
      }

    } else {
      // CÁC KIỂU: KHUNG HỘP (BOX), KHUNG NÉT ĐỨT (DASHED), DÒNG CHẤM (DOTTED), DÒNG GẠCH (SOLID)
      for (let i = 0; i < numFields; i++) {
        const rowCenterY = Math.round(currentY + (i + 0.5) * rowH);

        elements.push({
          id: `field_lbl_${i}`,
          type: 'text',
          text: fieldLabels[i],
          x: Math.round(paddingX + 5),
          y: rowCenterY,
          fontSize: fontSize,
          fontFamily: fontFamily,
          fontWeight: fontWeight,
          align: 'left',
          color: '#0f172a'
        });

        const boxH = Math.max(24, Math.round(rowH * boxHeightPercent));
        const boxY = Math.round(rowCenterY - boxH / 2);

        if (boxStyle === 'box') {
          elements.push({
            id: `field_box_${i}`,
            type: 'rect',
            x: Math.round(boxX),
            y: boxY,
            w: Math.round(boxW),
            h: boxH,
            radius: 4,
            stroke: '#0f172a',
            lineWidth: 3.5,
            fill: 'transparent'
          });
        } else if (boxStyle === 'dashed') {
          elements.push({
            id: `field_box_${i}`,
            type: 'rect',
            x: Math.round(boxX),
            y: boxY,
            w: Math.round(boxW),
            h: boxH,
            radius: 4,
            dash: [8, 6],
            stroke: '#0f172a',
            lineWidth: 3.5,
            fill: 'transparent'
          });
        } else if (boxStyle === 'dotted_line') {
          elements.push({
            id: `field_line_${i}`,
            type: 'line',
            x1: Math.round(boxX),
            y1: Math.round(rowCenterY + boxH * 0.35),
            x2: Math.round(boxX + boxW),
            y2: Math.round(rowCenterY + boxH * 0.35),
            color: '#0f172a',
            lineWidth: 3.5,
            dash: [3, 6]
          });
        } else if (boxStyle === 'solid_line') {
          elements.push({
            id: `field_line_${i}`,
            type: 'line',
            x1: Math.round(boxX),
            y1: Math.round(rowCenterY + boxH * 0.35),
            x2: Math.round(boxX + boxW),
            y2: Math.round(rowCenterY + boxH * 0.35),
            color: '#0f172a',
            lineWidth: 3.5
          });
        }
      }
    }

    // 4. Mã vạch / QR dưới đáy tem (nếu bật)
    if (barcodeOption === 'code128') {
      const bcH = Math.round(bottomReserved * 0.75);
      const bcW = Math.min(cw - paddingX * 2, 420);
      const bcY = ch - paddingY - bcH / 2;
      const bcImg = generateBarcodeImage('8936012345678');
      elements.push({
        id: 'tpl_barcode_' + Date.now(),
        type: 'barcode',
        code: '8936012345678',
        img: bcImg,
        x: cw / 2,
        y: bcY,
        w: bcW,
        h: bcH
      });
    } else if (barcodeOption === 'qrcode') {
      const qrSize = Math.round(bottomReserved * 0.85);
      const qrImg = generateQRCodeImage('8936012345678');
      elements.push({
        id: 'tpl_qrcode_' + Date.now(),
        type: 'qrcode',
        code: '8936012345678',
        img: qrImg,
        x: cw / 2,
        y: ch - paddingY - qrSize / 2,
        w: qrSize,
        h: qrSize
      });
    }

    render();
  }

  function generateSmartLayout() {
    generateBlankFieldTemplate();
  }

  function generateGridTableLayout() {
    generateBlankFieldTemplate();
  }

  function addFieldRow(labelText = 'Trường mới:') {
    const container = document.getElementById('template-fields-container');
    if (!container) return;
    const count = container.querySelectorAll('.field-row').length + 1;
    const row = document.createElement('div');
    row.className = 'field-row flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-lg border border-slate-700/80';
    row.innerHTML = `
      <span class="text-slate-500 text-xs px-1 select-none font-mono">${count}.</span>
      <input type="text" class="field-label-input text-xs font-semibold text-slate-100 flex-1 bg-slate-800/90 border border-slate-700 rounded px-2 py-1 outline-none focus:border-blue-500" value="${labelText}" placeholder="Tên trường">
      <div class="px-2 py-1 rounded bg-slate-800 border border-dashed border-slate-600 text-[10px] text-slate-400 flex items-center gap-1 select-none whitespace-nowrap">
        <i class="fa-regular fa-square"></i> [ Ô trống ]
      </div>
      <button type="button" class="btn-remove-field text-slate-500 hover:text-red-400 p-1 text-xs transition" title="Xóa dòng này">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    `;
    container.appendChild(row);
    row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    generateBlankFieldTemplate();
  }

  function renumberFieldRows() {
    const container = document.getElementById('template-fields-container');
    if (!container) return;
    container.querySelectorAll('.field-row').forEach((row, idx) => {
      const numSpan = row.querySelector('span');
      if (numSpan) numSpan.textContent = `${idx + 1}.`;
    });
  }

  /**
   * TẬP HỢP BIỂU TƯỢNG VECTOR CHUẨN NGÀNH IN ẤN & BAO BÌ (PACKAGING ICONS)
   */
  /**
   * THƯ VIỆN TOÀN DIỆN 60+ BIỂU TƯỢNG TEM NHÃN & BAO BÌ CHUẨN PHẦN MỀM BARTENDER
   * Phân nhóm theo 6 tiêu chuẩn: Vận chuyển (ISO 780), Tái chế, Cảnh báo GHS, Chứng nhận, Y tế & Thương mại
   */
  const mkSvg = (body) => (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="${color}" color="${color}">${body}</svg>`;

  const BARTENDER_SYMBOLS = {
    // 1. VẬN CHUYỂN & KHO BÃI (ISO 780)
    fragile: {
      name: 'Hàng dễ vỡ (Fragile)',
      cat: 'shipping', code: 'ISO 780',
      svg: mkSvg('<path d="M30 15 h40 c0 20 -10 35 -18 42 v18 h14 v8 h-32 v-8 h14 v-18 c-8 -7 -18 -22 -18 -42 z M36 21 c2 16 10 26 14 30 v-8 l6 -6 l-8 -8 l10 -8 z"/>')
    },
    keep_dry: {
      name: 'Tránh nước / Giữ khô (Keep Dry)',
      cat: 'shipping', code: 'ISO 780',
      svg: mkSvg('<path d="M50 15 c-22 0 -38 18 -38 36 h34 v24 c0 6 4 10 9 10 s9 -4 9 -10 h-6 c0 3 -1 4 -3 4 s-3 -1 -3 -4 v-24 h35 c0 -18 -16 -36 -37 -36 z M48 8 h4 v6 h-4 z"/><circle cx="28" cy="18" r="2.5"/><circle cx="34" cy="12" r="2.5"/><circle cx="66" cy="12" r="2.5"/><circle cx="72" cy="18" r="2.5"/>')
    },
    this_way_up: {
      name: 'Hướng này lên (This Way Up)',
      cat: 'shipping', code: 'ISO 780',
      svg: mkSvg('<path d="M15 82 h70 v7 h-70 z M25 42 l12 -18 l12 18 h-7 v32 h-10 v-32 z M51 42 l12 -18 l12 18 h-7 v32 h-10 v-32 z"/>')
    },
    no_stack: {
      name: 'Không xếp chồng (Do Not Stack)',
      cat: 'shipping', code: 'ISO 780',
      svg: (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="30" y="54" width="40" height="26" fill="none" stroke="${color}" stroke-width="5"/><rect x="30" y="20" width="40" height="26" fill="none" stroke="${color}" stroke-width="5"/><path d="M22 22 l56 56" stroke="${color}" stroke-width="7" stroke-linecap="round"/></svg>`
    },
    max_stack: {
      name: 'Giới hạn tầng xếp (Max Stack)',
      cat: 'shipping', code: 'ISO 780',
      svg: (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="25" y="58" width="50" height="24" fill="none" stroke="${color}" stroke-width="5"/><rect x="25" y="28" width="50" height="24" fill="none" stroke="${color}" stroke-width="5"/><path d="M50 10 l-8 12 h16 z" fill="${color}"/><text x="50" y="46" font-family="Arial, sans-serif" font-weight="900" font-size="16" text-anchor="middle" fill="${color}">MAX 3</text></svg>`
    },
    stack_weight: {
      name: 'Giới hạn tải trọng (Stack Weight)',
      cat: 'shipping', code: 'ISO 780',
      svg: (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="24" y="45" width="52" height="38" fill="none" stroke="${color}" stroke-width="5"/><path d="M50 12 v26 M40 28 l10 10 l10 -10" stroke="${color}" stroke-width="5" fill="none" stroke-linecap="round"/><text x="50" y="69" font-family="Arial, sans-serif" font-weight="900" font-size="14" text-anchor="middle" fill="${color}">kg MAX</text></svg>`
    },
    no_hook: {
      name: 'Tránh móc kéo (Do Not Hook)',
      cat: 'shipping', code: 'ISO 780',
      svg: (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M46 16 h8 v16 a16 16 0 0 1 -16 16 h-4 v-6 h4 a10 10 0 0 0 10 -10 v-16 z" fill="${color}"/><path d="M22 22 l56 56" stroke="${color}" stroke-width="7" stroke-linecap="round"/><circle cx="50" cy="50" r="36" fill="none" stroke="${color}" stroke-width="6"/></svg>`
    },
    sling_here: {
      name: 'Điểm móc cẩu cáp (Sling Here)',
      cat: 'shipping', code: 'ISO 780',
      svg: mkSvg('<path d="M28 20 l22 30 l22 -30 h8 l-26 36 v30 h-8 v-30 l-26 -36 z M38 80 h24 v6 h-24 z"/>')
    },
    center_gravity: {
      name: 'Trọng tâm kiện hàng (Center of Gravity)',
      cat: 'shipping', code: 'ISO 780',
      svg: (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="36" fill="none" stroke="${color}" stroke-width="6"/><path d="M50 50 h36 a36 36 0 0 1 -36 36 z M50 50 v-36 a36 36 0 0 1 -36 36 z" fill="${color}"/><path d="M10 50 h80 M50 10 v80" stroke="${color}" stroke-width="3"/></svg>`
    },
    keep_away_sun: {
      name: 'Tránh ánh nắng (Keep Away Sun)',
      cat: 'shipping', code: 'ISO 780',
      svg: (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="16" fill="${color}"/><path d="M50 18 v8 M50 74 v8 M18 50 h8 M74 50 h8 M27 27 l6 6 M67 67 l6 6 M27 73 l6 -6 M67 33 l6 -6" stroke="${color}" stroke-width="6" stroke-linecap="round"/><path d="M22 18 l56 64" stroke="${color}" stroke-width="7" stroke-linecap="round"/></svg>`
    },
    keep_away_heat: {
      name: 'Tránh nguồn nhiệt (Keep Away Heat)',
      cat: 'shipping', code: 'ISO 780',
      svg: (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 16 c-8 16 -18 24 -18 38 a18 18 0 0 0 36 0 c0 -14 -10 -22 -18 -38 z M46 64 a6 6 0 0 0 8 0 c0 -6 -4 -10 -4 -14 c0 4 -4 8 -4 14 z" fill="${color}"/><path d="M22 22 l56 56" stroke="${color}" stroke-width="7" stroke-linecap="round"/></svg>`
    },
    protect_moisture: {
      name: 'Bảo vệ chống ẩm (Protect Moisture)',
      cat: 'shipping', code: 'ISO 780',
      svg: (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 16 c0 0 -22 24 -22 42 a22 22 0 0 0 44 0 c0 -18 -22 -42 -22 -42 z" fill="${color}"/><path d="M22 22 l56 56" stroke="${color}" stroke-width="7" stroke-linecap="round"/></svg>`
    },
    no_roll: {
      name: 'Cấm lăn kiện hàng (Do Not Roll)',
      cat: 'shipping', code: 'ISO 780',
      svg: (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="30" y="30" width="40" height="40" rx="4" fill="none" stroke="${color}" stroke-width="6"/><path d="M25 22 c16 -12 34 -12 50 0 l-4 8 M75 78 c-16 12 -34 12 -50 0 l4 -8" stroke="${color}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M20 20 l60 60" stroke="${color}" stroke-width="7" stroke-linecap="round"/></svg>`
    },
    clamp_here: {
      name: 'Kẹp nâng ở đây (Clamp Here)',
      cat: 'shipping', code: 'ISO 780',
      svg: mkSvg('<rect x="35" y="28" width="30" height="44" fill="none" stroke="currentColor" stroke-width="5"/><path d="M12 50 h18 M12 50 l6 -6 M12 50 l6 6 M88 50 h-18 M88 50 l-6 -6 M88 50 l-6 6" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round"/>')
    },
    no_clamp: {
      name: 'Không kẹp nâng (Do Not Clamp)',
      cat: 'shipping', code: 'ISO 780',
      svg: (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="35" y="28" width="30" height="44" fill="none" stroke="${color}" stroke-width="5"/><path d="M14 50 h16 M86 50 h-16" stroke="${color}" stroke-width="5" stroke-linecap="round"/><path d="M22 22 l56 56" stroke="${color}" stroke-width="7" stroke-linecap="round"/></svg>`
    },
    no_forklift: {
      name: 'Cấm xe nâng (Do Not Forklift)',
      cat: 'shipping', code: 'ISO 780',
      svg: (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="36" cy="74" r="7" fill="${color}"/><circle cx="68" cy="74" r="7" fill="${color}"/><path d="M26 68 h48 v-18 h-18 l-8 -14 h-16 v32 z M68 50 v-30 h12 v30" fill="${color}"/><path d="M20 20 l60 60" stroke="${color}" stroke-width="7" stroke-linecap="round"/></svg>`
    },
    use_forklift: {
      name: 'Dùng xe nâng (Use Forklift)',
      cat: 'shipping', code: 'ISO 780',
      svg: mkSvg('<circle cx="36" cy="74" r="7"/><circle cx="68" cy="74" r="7"/><path d="M26 68 h48 v-18 h-18 l-8 -14 h-16 v32 z M68 50 v-30 h12 v30"/>')
    },
    magnet_sensitive: {
      name: 'Tránh từ trường (Magnetic Sensitive)',
      cat: 'shipping', code: 'ISO 780',
      svg: (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M30 30 v24 a20 20 0 0 0 40 0 v-24 h-12 v24 a8 8 0 0 1 -16 0 v-24 z" fill="${color}"/><rect x="30" y="22" width="12" height="10" fill="${color}"/><rect x="58" y="22" width="12" height="10" fill="${color}"/><path d="M22 22 l56 56" stroke="${color}" stroke-width="7" stroke-linecap="round"/></svg>`
    },

    // 2. TÁI CHẾ & MÔI TRƯỜNG (RECYCLING - ISO 14021 / SPI)
    recycle: {
      name: 'Vòng Mobius tái chế (Recycle)',
      cat: 'recycling', code: 'ISO 14021',
      svg: (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="${color}"><path d="M174.7 45.1C192.2 17 223 0 256 0s63.8 17 81.3 45.1l38.6 61.7 27-15.6c8.4-4.9 18.9-4.2 26.6 1.7s11.1 15.9 8.6 25.3l-23.4 87.4c-3.4 12.8-16.6 20.4-29.4 17l-87.4-23.4c-9.4-2.5-16.3-10.4-17.6-20s3.4-19.1 11.8-23.9l28.4-16.4L283 79c-5.8-9.3-16-15-27-15s-21.2 5.7-27 15l-17.5 28c-9.2 14.8-28.6 19.5-43.6 10.5c-15.3-9.2-20.2-29.2-10.7-44.4l17.5-28zM429.5 251.9c15-9 34.4-4.3 43.6 10.5l24.4 39.1c9.4 15.1 14.4 32.4 14.6 50.2c.3 53.1-42.7 96.4-95.8 96.4L320 448l0 32c0 9.7-5.8 18.5-14.8 22.2s-19.3 1.7-26.2-5.2l-64-64c-9.4-9.4-9.4-24.6 0-33.9l64-64c6.9-6.9 17.2-8.9 26.2-5.2s14.8 12.5 14.8 22.2l0 32 96.2 0c17.6 0 31.9-14.4 31.8-32c0-5.9-1.7-11.7-4.8-16.7l-24.4-39.1c-9.5-15.2-4.7-35.2 10.7-44.4zm-364.6-31L36 204.2c-8.4-4.9-13.1-14.3-11.8-23.9s8.2-17.5 17.6-20l87.4-23.4c12.8-3.4 26 4.2 29.4 17L182 241.2c2.5 9.4-.9 19.3-8.6 25.3s-18.2 6.6-26.6 1.7l-26.5-15.3L68.8 335.3c-3.1 5-4.8 10.8-4.8 16.7c-.1 17.6 14.2 32 31.8 32l32.2 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-32.2 0C42.7 448-.3 404.8 0 351.6c.1-17.8 5.1-35.1 14.6-50.2l50.3-80.5z"/></svg>`
    },
    tidyman: {
      name: 'Bỏ rác đúng nơi (Tidyman)',
      cat: 'recycling', code: 'ISO 14021',
      svg: mkSvg('<circle cx="48" cy="20" r="7"/><path d="M42 30 h10 l4 20 l8 -10 l5 4 l-10 16 l-4 28 h-7 l3 -24 l-7 -10 l-4 34 h-7 l5 -42 z M68 46 h12 v36 h-12 z M70 52 h8 v24 h-8 z M66 42 l4 -6 l4 6 z"/>')
    },
    weee: {
      name: 'Rác điện tử WEEE (WEEE Directive)',
      cat: 'recycling', code: 'EN 50419',
      svg: (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M36 30 h28 l-4 44 h-20 z M30 22 h40 v5 h-40 z M46 16 h8 v6 h-8 z" fill="${color}"/><rect x="28" y="80" width="44" height="6" fill="${color}"/><path d="M24 26 l52 52 M76 26 l-52 52" stroke="${color}" stroke-width="6" stroke-linecap="round"/></svg>`
    },
    green_dot: {
      name: 'Điểm xanh (Der Grüne Punkt)',
      cat: 'recycling', code: 'Dual System',
      svg: mkSvg('<circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" stroke-width="6"/><path d="M30 46 c0 -14 10 -22 24 -22 v10 l16 -16 l-16 -16 v10 c-20 0 -36 14 -36 34 z M70 54 c0 14 -10 22 -24 22 v-10 l-16 16 l16 16 v-10 c20 0 36 -14 36 -34 z"/>')
    },
    fsc: {
      name: 'Rừng bền vững (FSC Certified)',
      cat: 'recycling', code: 'FSC-STD',
      svg: mkSvg('<path d="M50 14 l-18 26 h10 l-14 24 h16 v22 h12 v-22 h16 l-14 -24 h10 z"/>')
    },
    corrugated: {
      name: 'Thùng carton tái chế (Corrugated)',
      cat: 'recycling', code: 'RESY',
      svg: mkSvg('<circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" stroke-width="5"/><path d="M30 52 c4 -10 8 -10 12 0 c4 10 8 10 12 0 c4 -10 8 -10 12 0 c4 10 8 10 12 0" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>')
    },
    resin_pete1: {
      name: 'Nhựa PETE 1 (PET / Polyethylene)',
      cat: 'recycling', code: 'SPI-1',
      svg: mkSvg('<path d="M50 12 l36 60 h-72 z" fill="none" stroke="currentColor" stroke-width="6"/><text x="50" y="52" font-family="Arial" font-weight="900" font-size="20" text-anchor="middle">1</text><text x="50" y="86" font-family="Arial" font-weight="900" font-size="12" text-anchor="middle">PETE</text>')
    },
    resin_hdpe2: {
      name: 'Nhựa HDPE 2 (High-Density Poly)',
      cat: 'recycling', code: 'SPI-2',
      svg: mkSvg('<path d="M50 12 l36 60 h-72 z" fill="none" stroke="currentColor" stroke-width="6"/><text x="50" y="52" font-family="Arial" font-weight="900" font-size="20" text-anchor="middle">2</text><text x="50" y="86" font-family="Arial" font-weight="900" font-size="12" text-anchor="middle">HDPE</text>')
    },
    resin_pvc3: {
      name: 'Nhựa PVC 3 (Polyvinyl Chloride)',
      cat: 'recycling', code: 'SPI-3',
      svg: mkSvg('<path d="M50 12 l36 60 h-72 z" fill="none" stroke="currentColor" stroke-width="6"/><text x="50" y="52" font-family="Arial" font-weight="900" font-size="20" text-anchor="middle">3</text><text x="50" y="86" font-family="Arial" font-weight="900" font-size="12" text-anchor="middle">PVC</text>')
    },
    resin_ldpe4: {
      name: 'Nhựa LDPE 4 (Low-Density Poly)',
      cat: 'recycling', code: 'SPI-4',
      svg: mkSvg('<path d="M50 12 l36 60 h-72 z" fill="none" stroke="currentColor" stroke-width="6"/><text x="50" y="52" font-family="Arial" font-weight="900" font-size="20" text-anchor="middle">4</text><text x="50" y="86" font-family="Arial" font-weight="900" font-size="12" text-anchor="middle">LDPE</text>')
    },
    resin_pp5: {
      name: 'Nhựa PP 5 (Polypropylene)',
      cat: 'recycling', code: 'SPI-5',
      svg: mkSvg('<path d="M50 12 l36 60 h-72 z" fill="none" stroke="currentColor" stroke-width="6"/><text x="50" y="52" font-family="Arial" font-weight="900" font-size="20" text-anchor="middle">5</text><text x="50" y="86" font-family="Arial" font-weight="900" font-size="12" text-anchor="middle">PP</text>')
    },
    resin_ps6: {
      name: 'Nhựa PS 6 (Polystyrene)',
      cat: 'recycling', code: 'SPI-6',
      svg: mkSvg('<path d="M50 12 l36 60 h-72 z" fill="none" stroke="currentColor" stroke-width="6"/><text x="50" y="52" font-family="Arial" font-weight="900" font-size="20" text-anchor="middle">6</text><text x="50" y="86" font-family="Arial" font-weight="900" font-size="12" text-anchor="middle">PS</text>')
    },
    resin_other7: {
      name: 'Nhựa OTHER 7 (Nhựa khác)',
      cat: 'recycling', code: 'SPI-7',
      svg: mkSvg('<path d="M50 12 l36 60 h-72 z" fill="none" stroke="currentColor" stroke-width="6"/><text x="50" y="52" font-family="Arial" font-weight="900" font-size="20" text-anchor="middle">7</text><text x="50" y="86" font-family="Arial" font-weight="900" font-size="11" text-anchor="middle">OTHER</text>')
    },
    eco_leaf: {
      name: 'Thân thiện môi trường (Eco Leaf)',
      cat: 'recycling', code: 'ECO',
      svg: mkSvg('<path d="M30 70 c0 -30 20 -48 48 -48 c0 28 -18 48 -48 48 z M34 66 c14 -8 26 -20 32 -32"/>')
    },

    // 3. AN TOÀN, CẢNH BÁO & GHS
    ghs_warning: {
      name: 'Cảnh báo chung (Caution / GHS07)',
      cat: 'safety', code: 'GHS 07',
      svg: mkSvg('<path d="M50 12 l40 70 h-80 z" fill="none" stroke="currentColor" stroke-width="7"/><rect x="47" y="38" width="6" height="24" rx="3"/><circle cx="50" cy="70" r="4"/>')
    },
    ghs_flame: {
      name: 'Chất dễ cháy (Flammable / GHS02)',
      cat: 'safety', code: 'GHS 02',
      svg: mkSvg('<path d="M50 10 l38 38 l-38 38 l-38 -38 z" fill="none" stroke="currentColor" stroke-width="6"/><path d="M50 32 c-4 10 -12 16 -12 24 a12 12 0 0 0 24 0 c0 -8 -8 -14 -12 -24 z"/>')
    },
    ghs_toxic: {
      name: 'Độc hại nguy hiểm (Toxic / GHS06)',
      cat: 'safety', code: 'GHS 06',
      svg: mkSvg('<path d="M50 10 l38 38 l-38 38 l-38 -38 z" fill="none" stroke="currentColor" stroke-width="6"/><circle cx="50" cy="42" r="14"/><rect x="42" y="52" width="16" height="10" rx="3"/><circle cx="45" cy="42" r="3" fill="#000"/><circle cx="55" cy="42" r="3" fill="#000"/><path d="M32 60 l36 12 M68 60 l-36 12" stroke="currentColor" stroke-width="3"/>')
    },
    ghs_corrosive: {
      name: 'Chất ăn mòn (Corrosive / GHS05)',
      cat: 'safety', code: 'GHS 05',
      svg: mkSvg('<path d="M50 10 l38 38 l-38 38 l-38 -38 z" fill="none" stroke="currentColor" stroke-width="6"/><path d="M32 36 l12 14 M68 36 l-12 14 M28 62 h20 M52 62 h20" stroke="currentColor" stroke-width="4"/>')
    },
    ghs_explosive: {
      name: 'Nguy cơ phát nổ (Explosive / GHS01)',
      cat: 'safety', code: 'GHS 01',
      svg: mkSvg('<path d="M50 10 l38 38 l-38 38 l-38 -38 z" fill="none" stroke="currentColor" stroke-width="6"/><circle cx="50" cy="50" r="12"/><path d="M50 28 v6 M50 66 v6 M28 50 h6 M66 50 h6 M35 35 l4 4 M61 61 l4 4" stroke="currentColor" stroke-width="3"/>')
    },
    ghs_gas: {
      name: 'Khí nén dưới áp suất (Gas / GHS04)',
      cat: 'safety', code: 'GHS 04',
      svg: mkSvg('<path d="M50 10 l38 38 l-38 38 l-38 -38 z" fill="none" stroke="currentColor" stroke-width="6"/><rect x="43" y="34" width="14" height="34" rx="7"/>')
    },
    ghs_health: {
      name: 'Nguy hại sức khỏe (Health / GHS08)',
      cat: 'safety', code: 'GHS 08',
      svg: mkSvg('<path d="M50 10 l38 38 l-38 38 l-38 -38 z" fill="none" stroke="currentColor" stroke-width="6"/><circle cx="50" cy="36" r="6"/><path d="M42 46 h16 l4 18 h-24 z"/>')
    },
    biohazard: {
      name: 'Nguy hiểm sinh học (Biohazard)',
      cat: 'safety', code: 'BIOHAZARD',
      svg: mkSvg('<circle cx="50" cy="50" r="10"/><path d="M36 34 a18 18 0 1 1 28 0 a18 18 0 1 1 0 32 a18 18 0 1 1 -28 0" fill="none" stroke="currentColor" stroke-width="6"/>')
    },
    radiation: {
      name: 'Nguy hiểm phóng xạ (Radiation)',
      cat: 'safety', code: 'ISO 361',
      svg: mkSvg('<circle cx="50" cy="50" r="7"/><path d="M50 50 l-18 -32 a36 36 0 0 1 36 0 z M50 50 l36 2 a36 36 0 0 1 -18 31 z M50 50 l-18 31 a36 36 0 0 1 -18 -31 z"/>')
    },
    high_voltage: {
      name: 'Nguy hiểm điện áp cao (High Voltage)',
      cat: 'safety', code: 'IEC 60417',
      svg: mkSvg('<path d="M50 12 l40 70 h-80 z" fill="none" stroke="currentColor" stroke-width="7"/><path d="M52 30 l-12 22 h10 l-4 22 l18 -26 h-10 z"/>')
    },
    esd_caution: {
      name: 'Nhạy cảm tĩnh điện (ESD Sensitive)',
      cat: 'safety', code: 'IEC 61340',
      svg: mkSvg('<path d="M50 14 l38 66 h-76 z" fill="none" stroke="currentColor" stroke-width="6"/><path d="M45 42 v18 M49 38 v22 M53 40 v20 M57 44 v16 M40 50 l6 16 h14" stroke="currentColor" stroke-width="2.5" fill="none"/>')
    },
    eye_protection: {
      name: 'Đeo kính bảo hộ (Eye Protection)',
      cat: 'safety', code: 'ISO 7010',
      svg: mkSvg('<circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" stroke-width="6"/><circle cx="38" cy="50" r="10"/><circle cx="62" cy="50" r="10"/><path d="M48 50 h4" stroke="currentColor" stroke-width="4"/>')
    },
    gloves_req: {
      name: 'Đeo găng tay bảo hộ (Wear Gloves)',
      cat: 'safety', code: 'ISO 7010',
      svg: mkSvg('<circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" stroke-width="6"/><path d="M38 42 v20 a12 12 0 0 0 24 0 v-20 h-24 z"/>')
    },
    first_aid: {
      name: 'Sơ cấp cứu (First Aid)',
      cat: 'safety', code: 'ISO 7010',
      svg: mkSvg('<rect x="16" y="16" width="68" height="68" rx="8" fill="none" stroke="currentColor" stroke-width="6"/><path d="M44 28 h12 v16 h16 v12 h-16 v16 h-12 v-16 h-16 v-12 h16 z"/>')
    },

    // 4. CHỨNG NHẬN & TIÊU CHUẨN (COMPLIANCE & CERTIFICATIONS)
    ce_mark: {
      name: 'Chứng nhận CE (CE Mark)',
      cat: 'cert', code: 'CE',
      svg: mkSvg('<path d="M48 20 a30 30 0 0 0 0 60 v-12 a18 18 0 0 1 0 -36 z M82 20 a30 30 0 0 0 0 60 v-12 a18 18 0 0 1 0 -36 z M60 44 h16 v12 h-16 z"/>')
    },
    rohs: {
      name: 'Chuẩn RoHS (RoHS Compliant)',
      cat: 'cert', code: 'RoHS 2',
      svg: (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="38" fill="none" stroke="${color}" stroke-width="6"/><text x="50" y="58" font-family="'Plus Jakarta Sans', Arial" font-weight="900" font-size="20" text-anchor="middle" fill="${color}">RoHS</text></svg>`
    },
    fcc: {
      name: 'Chuẩn FCC Mỹ (FCC Declaration)',
      cat: 'cert', code: 'FCC',
      svg: (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="38" fill="none" stroke="${color}" stroke-width="6"/><text x="50" y="58" font-family="Arial Black" font-weight="900" font-size="22" text-anchor="middle" fill="${color}">FC</text></svg>`
    },
    fda: {
      name: 'Chứng nhận FDA Hoa Kỳ (FDA Approved)',
      cat: 'cert', code: 'FDA',
      svg: (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="14" y="24" width="72" height="52" rx="6" fill="none" stroke="${color}" stroke-width="6"/><text x="50" y="58" font-family="Arial Black" font-weight="900" font-size="22" text-anchor="middle" fill="${color}">FDA</text></svg>`
    },
    ul_mark: {
      name: 'Tiêu chuẩn UL (UL Listed)',
      cat: 'cert', code: 'UL 969',
      svg: (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="38" fill="none" stroke="${color}" stroke-width="6"/><text x="50" y="58" font-family="Arial Black" font-weight="900" font-size="24" text-anchor="middle" fill="${color}">UL</text></svg>`
    },
    food_safe: {
      name: 'An toàn thực phẩm (Food Safe)',
      cat: 'cert', code: 'EC 1935/2004',
      svg: mkSvg('<path d="M26 22 h26 c0 16 -8 26 -11 30 v26 h-4 v-26 c-3 -4 -11 -14 -11 -30 z M31 28 c1 10 5 18 8 20 c3 -2 7 -10 8 -20 z M58 22 h4 v24 h5 v-24 h4 v24 h5 v-24 h4 v32 c0 6 -4 10 -9 10 v14 h-4 v-14 c-5 0 -9 -4 -9 -10 z"/>')
    },
    halal: {
      name: 'Chứng nhận Halal (Halal Food)',
      cat: 'cert', code: 'HALAL',
      svg: (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="38" fill="none" stroke="${color}" stroke-width="6"/><text x="50" y="57" font-family="Arial" font-weight="900" font-size="16" text-anchor="middle" fill="${color}">HALAL</text></svg>`
    },
    kosher: {
      name: 'Chứng nhận Kosher (Kosher Food)',
      cat: 'cert', code: 'KOSHER',
      svg: (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="38" fill="none" stroke="${color}" stroke-width="6"/><text x="50" y="60" font-family="Arial Black" font-weight="900" font-size="28" text-anchor="middle" fill="${color}">K</text></svg>`
    },
    iso_seal: {
      name: 'Chứng nhận ISO 9001 (ISO Seal)',
      cat: 'cert', code: 'ISO 9001',
      svg: (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="38" fill="none" stroke="${color}" stroke-width="5"/><circle cx="50" cy="50" r="32" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="4,3"/><text x="50" y="47" font-family="Arial Black" font-weight="900" font-size="16" text-anchor="middle" fill="${color}">ISO</text><text x="50" y="64" font-family="Arial" font-weight="700" font-size="12" text-anchor="middle" fill="${color}">9001</text></svg>`
    },
    cruelty_free: {
      name: 'Không thí nghiệm động vật (Cruelty-Free)',
      cat: 'cert', code: 'PETA / Leaping Bunny',
      svg: mkSvg('<path d="M34 60 c0 -16 12 -28 28 -28 c0 -12 6 -18 14 -18 c4 0 6 4 4 10 c10 2 12 12 8 20 c10 4 10 12 4 16 z"/>')
    },
    vegan: {
      name: '100% Thuần chay (Vegan)',
      cat: 'cert', code: 'VEGAN',
      svg: (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="38" fill="none" stroke="${color}" stroke-width="6"/><path d="M32 36 l18 36 l18 -36" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round"/><path d="M50 48 c4 -10 14 -14 20 -10 c0 12 -12 16 -20 10 z" fill="${color}"/></svg>`
    },
    gmp_seal: {
      name: 'Thực hành sản xuất tốt (GMP)',
      cat: 'cert', code: 'WHO-GMP',
      svg: (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="38" fill="none" stroke="${color}" stroke-width="6"/><text x="50" y="58" font-family="Arial Black" font-weight="900" font-size="20" text-anchor="middle" fill="${color}">GMP</text></svg>`
    },

    // 5. DƯỢC PHẨM, Y TẾ & BẢO QUẢN
    temperature: {
      name: 'Giới hạn nhiệt độ (Temperature)',
      cat: 'medical', code: 'ISO 780',
      svg: mkSvg('<path d="M44 20 a7 7 0 0 1 14 0 v36 a14 14 0 1 1 -14 0 z M48 22 v34 l-2 2 a10 10 0 1 0 10 0 l-2 -2 v-34 z"/><circle cx="51" cy="68" r="6"/><rect x="50" y="38" width="2" height="26"/>')
    },
    use_by_date: {
      name: 'Hạn dùng / Đồng hồ cát (Use-By Date)',
      cat: 'medical', code: 'ISO 15223',
      svg: mkSvg('<path d="M32 20 h36 v8 l-14 18 l14 18 v16 h-36 v-16 l14 -18 l-14 -18 z M38 26 l12 16 l12 -16 z M38 74 h24 l-12 -14 z"/>')
    },
    mfg_factory: {
      name: 'Ngày sản xuất / Nhà máy (Manufacture Date)',
      cat: 'medical', code: 'ISO 15223',
      svg: mkSvg('<path d="M20 78 h60 v-36 l-20 12 v-12 l-20 12 v-22 h-20 z M28 44 h6 v10 h-6 z M48 44 h6 v10 h-6 z M68 44 h6 v10 h-6 z"/>')
    },
    do_not_reuse: {
      name: 'Không tái sử dụng (Single Use Only)',
      cat: 'medical', code: 'ISO 15223',
      svg: (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="38" fill="none" stroke="${color}" stroke-width="6"/><text x="50" y="62" font-family="Arial Black" font-weight="900" font-size="34" text-anchor="middle" fill="${color}">2</text><path d="M22 22 l56 56" stroke="${color}" stroke-width="6" stroke-linecap="round"/></svg>`
    },
    rx_only: {
      name: 'Thuốc theo đơn (Prescription Rx)',
      cat: 'medical', code: 'FDA Rx',
      svg: (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50" y="66" font-family="Times New Roman" font-style="italic" font-weight="900" font-size="52" text-anchor="middle" fill="${color}">Rx</text></svg>`
    },
    sterile: {
      name: 'Vô trùng (Sterile Packaging)',
      cat: 'medical', code: 'ISO 15223',
      svg: (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="12" y="32" width="76" height="36" rx="4" fill="none" stroke="${color}" stroke-width="6"/><text x="50" y="56" font-family="Arial" font-weight="900" font-size="14" text-anchor="middle" fill="${color}">STERILE</text></svg>`
    },
    consult_instructions: {
      name: 'Đọc kỹ hướng dẫn (Consult IFU)',
      cat: 'medical', code: 'ISO 15223',
      svg: mkSvg('<path d="M22 26 h24 v48 h-24 z M54 26 h24 v48 h-24 z" fill="none" stroke="currentColor" stroke-width="5"/><circle cx="66" cy="40" r="3"/><rect x="64" y="48" width="4" height="16"/>')
    },
    lot_batch: {
      name: 'Mã số lô (Batch Code LOT)',
      cat: 'medical', code: 'ISO 15223',
      svg: (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="16" y="32" width="68" height="36" rx="4" fill="none" stroke="${color}" stroke-width="6"/><text x="50" y="57" font-family="Arial Black" font-weight="900" font-size="18" text-anchor="middle" fill="${color}">LOT</text></svg>`
    },

    // 6. THƯƠNG MẠI & LIÊN HỆ
    made_in_vn: {
      name: 'Made in Vietnam (Hàng VN)',
      cat: 'commercial', code: 'VN',
      svg: (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="38" fill="none" stroke="${color}" stroke-width="5"/><path d="M50 24 l6 16 h18 l-14 10 l5 18 l-15 -11 l-15 11 l5 -18 l-14 -10 h18 z" fill="${color}"/><text x="50" y="82" font-family="Arial" font-weight="900" font-size="9" text-anchor="middle" fill="${color}">VIETNAM</text></svg>`
    },
    phone_hotline: {
      name: 'Hotline / Số điện thoại',
      cat: 'commercial', code: 'TEL',
      svg: mkSvg('<path d="M30 24 c0 26 20 46 46 46 l8 -12 l-14 -8 l-6 6 c-12 -6 -16 -10 -22 -22 l6 -6 l-8 -14 z"/>')
    },
    location_pin: {
      name: 'Địa chỉ xưởng / Định vị',
      cat: 'commercial', code: 'MAP',
      svg: mkSvg('<path d="M50 16 c-16 0 -28 12 -28 28 c0 20 28 42 28 42 s28 -22 28 -42 c0 -16 -12 -28 -28 -28 z M50 36 a8 8 0 1 1 0 16 a8 8 0 1 1 0 -16 z"/>')
    },
    email_mail: {
      name: 'Hộp thư điện tử (Email)',
      cat: 'commercial', code: 'MAIL',
      svg: mkSvg('<rect x="18" y="28" width="64" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="6"/><path d="M22 34 l28 22 l28 -22" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>')
    },
    website_globe: {
      name: 'Website / Quả địa cầu',
      cat: 'commercial', code: 'WEB',
      svg: mkSvg('<circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" stroke-width="6"/><path d="M14 50 h72 M50 14 v72" stroke="currentColor" stroke-width="4"/><ellipse cx="50" cy="50" rx="20" ry="36" fill="none" stroke="currentColor" stroke-width="5"/>')
    },
    quality_seal: {
      name: '100% Chất lượng cao (Quality)',
      cat: 'commercial', code: '100% QC',
      svg: (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="44" r="28" fill="none" stroke="${color}" stroke-width="6"/><path d="M38 68 l-6 20 l18 -8 l18 8 l-6 -20" fill="${color}"/><text x="50" y="50" font-family="Arial Black" font-weight="900" font-size="14" text-anchor="middle" fill="${color}">100%</text></svg>`
    }
  };

  /**
   * THƯ VIỆN CÁC LOẠI MÃ VẠCH (KÈM HÌNH ẢNH MẪU THỰC TẾ CHUẨN BARTENDER)
   * Giúp người dùng nhìn thấy ngay hình dáng thực tế của từng loại mã thay vì chỉ nhìn tên số khó hình dung
   */
  const BARCODE_CATALOG = {
    // 1. BÁN LẺ & SIÊU THỊ
    ean13: {
      key: 'ean13',
      name: 'EAN-13 (13 Số Siêu Thị VN & Toàn Cầu)',
      cat: 'retail',
      type: 'barcode',
      badge: 'Chuẩn Siêu Thị',
      desc: 'Mã vạch chuẩn hóa toàn cầu cho hàng hóa bán lẻ (đầu số 893 tại VN), có chữ số dưới và vạch phân cách dài.',
      svg: `<svg viewBox="0 0 160 70" xmlns="http://www.w3.org/2000/svg" class="w-full h-full"><rect width="160" height="70" fill="#fff" rx="4"/><g fill="#000"><rect x="18" y="8" width="2.5" height="46"/><rect x="23" y="8" width="2.5" height="46"/><rect x="29" y="8" width="3.5" height="38"/><rect x="35" y="8" width="1.5" height="38"/><rect x="40" y="8" width="4" height="38"/><rect x="47" y="8" width="2" height="38"/><rect x="52" y="8" width="3" height="38"/><rect x="58" y="8" width="1.5" height="38"/><rect x="63" y="8" width="4" height="38"/><rect x="70" y="8" width="2" height="38"/><rect x="76" y="8" width="2.5" height="46"/><rect x="81" y="8" width="2.5" height="46"/><rect x="87" y="8" width="3" height="38"/><rect x="93" y="8" width="1.5" height="38"/><rect x="98" y="8" width="4" height="38"/><rect x="105" y="8" width="2" height="38"/><rect x="110" y="8" width="3.5" height="38"/><rect x="117" y="8" width="1.5" height="38"/><rect x="122" y="8" width="4" height="38"/><rect x="129" y="8" width="2" height="38"/><rect x="135" y="8" width="2.5" height="46"/><rect x="140" y="8" width="2.5" height="46"/></g><text x="9" y="58" font-family="monospace" font-size="11" font-weight="900" fill="#000">8</text><text x="51" y="58" font-family="monospace" font-size="11" font-weight="900" fill="#000" text-anchor="middle">938501</text><text x="109" y="58" font-family="monospace" font-size="11" font-weight="900" fill="#000" text-anchor="middle">942846</text><text x="151" y="58" font-family="monospace" font-size="11" font-weight="900" fill="#000">&gt;</text></svg>`
    },
    ean8: {
      key: 'ean8',
      name: 'EAN-8 (Bao Bì Nhỏ Gọn 8 Số)',
      cat: 'retail',
      type: 'barcode',
      badge: 'Bao Bì Nhỏ',
      desc: 'Phiên bản rút gọn 8 chữ số của EAN dành cho tem nhãn kích thước nhỏ (kẹo, son môi, bút).',
      svg: `<svg viewBox="0 0 160 70" xmlns="http://www.w3.org/2000/svg" class="w-full h-full"><rect width="160" height="70" fill="#fff" rx="4"/><g fill="#000"><rect x="25" y="8" width="2.5" height="46"/><rect x="30" y="8" width="2.5" height="46"/><rect x="37" y="8" width="4" height="38"/><rect x="45" y="8" width="2" height="38"/><rect x="51" y="8" width="3" height="38"/><rect x="58" y="8" width="1.5" height="38"/><rect x="64" y="8" width="4" height="38"/><rect x="76" y="8" width="2.5" height="46"/><rect x="81" y="8" width="2.5" height="46"/><rect x="88" y="8" width="3" height="38"/><rect x="95" y="8" width="4" height="38"/><rect x="103" y="8" width="2" height="38"/><rect x="109" y="8" width="3.5" height="38"/><rect x="117" y="8" width="1.5" height="38"/><rect x="127" y="8" width="2.5" height="46"/><rect x="132" y="8" width="2.5" height="46"/></g><text x="56" y="58" font-family="monospace" font-size="11" font-weight="900" fill="#000" text-anchor="middle">8938</text><text x="107" y="58" font-family="monospace" font-size="11" font-weight="900" fill="#000" text-anchor="middle">5012</text><text x="144" y="58" font-family="monospace" font-size="11" font-weight="900" fill="#000">&gt;</text></svg>`
    },
    upca: {
      key: 'upca',
      name: 'UPC-A (Xuất Khẩu Bắc Mỹ & Mỹ 12 Số)',
      cat: 'retail',
      type: 'barcode',
      badge: 'Xuất Khẩu Mỹ',
      desc: 'Mã vạch tiêu chuẩn bắt buộc cho hàng tiêu dùng xuất khẩu sang thị trường Mỹ và Canada.',
      svg: `<svg viewBox="0 0 160 70" xmlns="http://www.w3.org/2000/svg" class="w-full h-full"><rect width="160" height="70" fill="#fff" rx="4"/><g fill="#000"><rect x="22" y="8" width="2.5" height="46"/><rect x="27" y="8" width="2.5" height="46"/><rect x="34" y="8" width="4" height="38"/><rect x="42" y="8" width="2" height="38"/><rect x="48" y="8" width="3" height="38"/><rect x="55" y="8" width="1.5" height="38"/><rect x="61" y="8" width="4" height="38"/><rect x="69" y="8" width="2" height="38"/><rect x="77" y="8" width="2.5" height="46"/><rect x="82" y="8" width="2.5" height="46"/><rect x="89" y="8" width="3" height="38"/><rect x="96" y="8" width="4" height="38"/><rect x="104" y="8" width="2" height="38"/><rect x="110" y="8" width="3.5" height="38"/><rect x="118" y="8" width="1.5" height="38"/><rect x="125" y="8" width="4" height="38"/><rect x="132" y="8" width="2.5" height="46"/><rect x="137" y="8" width="2.5" height="46"/></g><text x="12" y="36" font-family="monospace" font-size="11" font-weight="900" fill="#000">0</text><text x="52" y="58" font-family="monospace" font-size="10" font-weight="900" fill="#000" text-anchor="middle">12345</text><text x="107" y="58" font-family="monospace" font-size="10" font-weight="900" fill="#000" text-anchor="middle">67890</text><text x="148" y="36" font-family="monospace" font-size="11" font-weight="900" fill="#000">5</text></svg>`
    },
    upce: {
      key: 'upce',
      name: 'UPC-E (UPC Rút Gọn 6 Số)',
      cat: 'retail',
      type: 'barcode',
      badge: 'UPC Rút Gọn',
      desc: 'Bản nén 6 số không có vạch phân cách giữa, dùng cho bao bì siêu nhỏ xuất khẩu Mỹ.',
      svg: `<svg viewBox="0 0 160 70" xmlns="http://www.w3.org/2000/svg" class="w-full h-full"><rect width="160" height="70" fill="#fff" rx="4"/><g fill="#000"><rect x="25" y="8" width="2.5" height="46"/><rect x="30" y="8" width="2.5" height="46"/><rect x="38" y="8" width="3" height="38"/><rect x="45" y="8" width="4" height="38"/><rect x="54" y="8" width="2" height="38"/><rect x="60" y="8" width="5" height="38"/><rect x="69" y="8" width="3" height="38"/><rect x="76" y="8" width="2" height="38"/><rect x="83" y="8" width="4" height="38"/><rect x="91" y="8" width="3" height="38"/><rect x="98" y="8" width="5" height="38"/><rect x="108" y="8" width="2" height="38"/><rect x="115" y="8" width="4" height="38"/><rect x="125" y="8" width="2.5" height="46"/><rect x="130" y="8" width="2" height="46"/><rect x="134" y="8" width="2.5" height="46"/></g><text x="14" y="34" font-family="monospace" font-size="11" font-weight="900" fill="#000">0</text><text x="80" y="58" font-family="monospace" font-size="10" font-weight="900" fill="#000" text-anchor="middle">123456</text><text x="146" y="34" font-family="monospace" font-size="11" font-weight="900" fill="#000">7</text></svg>`
    },

    // 2. KHO VẬN & THÙNG CARTON
    code128: {
      key: 'code128',
      name: 'Code 128 (Đa Năng: Số, Chữ & Ký Tự)',
      cat: 'logistics',
      type: 'barcode',
      badge: 'Phổ Biến Nhất',
      desc: 'Mã vạch thông dụng nhất hiện nay, mã hóa toàn bộ bảng mã ASCII (chữ hoa, chữ thường, số, ký tự đặc biệt).',
      svg: `<svg viewBox="0 0 160 70" xmlns="http://www.w3.org/2000/svg" class="w-full h-full"><rect width="160" height="70" fill="#fff" rx="4"/><g fill="#000"><rect x="14" y="10" width="2" height="40"/><rect x="18" y="10" width="4" height="40"/><rect x="25" y="10" width="2" height="40"/><rect x="30" y="10" width="3" height="40"/><rect x="35" y="10" width="5" height="40"/><rect x="43" y="10" width="2" height="40"/><rect x="48" y="10" width="1.5" height="40"/><rect x="52" y="10" width="4" height="40"/><rect x="59" y="10" width="2" height="40"/><rect x="63" y="10" width="5" height="40"/><rect x="71" y="10" width="1.5" height="40"/><rect x="75" y="10" width="3" height="40"/><rect x="81" y="10" width="4" height="40"/><rect x="88" y="10" width="2" height="40"/><rect x="93" y="10" width="1.5" height="40"/><rect x="97" y="10" width="4" height="40"/><rect x="104" y="10" width="3" height="40"/><rect x="110" y="10" width="2" height="40"/><rect x="115" y="10" width="5" height="40"/><rect x="123" y="10" width="1.5" height="40"/><rect x="127" y="10" width="3" height="40"/><rect x="133" y="10" width="4" height="40"/><rect x="140" y="10" width="2" height="40"/><rect x="144" y="10" width="2" height="40"/></g><text x="80" y="62" font-family="monospace" font-size="10" font-weight="bold" fill="#000" text-anchor="middle">CODE 128 - AUTO</text></svg>`
    },
    itf14: {
      key: 'itf14',
      name: 'ITF-14 (Khung Viền Thùng Carton Vận Chuyển)',
      cat: 'logistics',
      type: 'barcode',
      badge: 'Thùng Carton',
      desc: 'Mã vạch chuyên dùng cho thùng carton lớn, có khung viền đen dày (Bearer Bar) bao bọc chống nhòe mực khi in trực tiếp lên sóng carton.',
      svg: `<svg viewBox="0 0 160 70" xmlns="http://www.w3.org/2000/svg" class="w-full h-full"><rect width="160" height="70" fill="#fff" rx="4"/><rect x="8" y="6" width="144" height="46" fill="none" stroke="#000" stroke-width="4.5"/><g fill="#000"><rect x="18" y="10" width="2.5" height="38"/><rect x="23" y="10" width="5" height="38"/><rect x="31" y="10" width="2.5" height="38"/><rect x="36" y="10" width="5" height="38"/><rect x="45" y="10" width="2.5" height="38"/><rect x="50" y="10" width="2.5" height="38"/><rect x="56" y="10" width="5" height="38"/><rect x="64" y="10" width="2.5" height="38"/><rect x="70" y="10" width="5" height="38"/><rect x="78" y="10" width="2.5" height="38"/><rect x="84" y="10" width="5" height="38"/><rect x="92" y="10" width="2.5" height="38"/><rect x="98" y="10" width="5" height="38"/><rect x="106" y="10" width="2.5" height="38"/><rect x="112" y="10" width="5" height="38"/><rect x="120" y="10" width="2.5" height="38"/><rect x="126" y="10" width="5" height="38"/><rect x="135" y="10" width="2.5" height="38"/></g><text x="80" y="64" font-family="monospace" font-size="10" font-weight="900" fill="#000" text-anchor="middle">1 89 38501 94284 3</text></svg>`
    },
    'gs1-128': {
      key: 'gs1-128',
      name: 'GS1-128 (Vận Chuyển Pallet & Logistics Toàn Cầu)',
      cat: 'logistics',
      type: 'barcode',
      badge: 'Pallet & Kho',
      desc: 'Mã vạch vận chuyển tiêu chuẩn thế giới có định danh dữ liệu AI (01, 10, 17...) chứa hạn dùng, số lô và số lượng.',
      svg: `<svg viewBox="0 0 160 70" xmlns="http://www.w3.org/2000/svg" class="w-full h-full"><rect width="160" height="70" fill="#fff" rx="4"/><g fill="#000"><rect x="12" y="10" width="2" height="38"/><rect x="16" y="10" width="3" height="38"/><rect x="22" y="10" width="1.5" height="38"/><rect x="26" y="10" width="4" height="38"/><rect x="33" y="10" width="2" height="38"/><rect x="38" y="10" width="5" height="38"/><rect x="46" y="10" width="1.5" height="38"/><rect x="50" y="10" width="3" height="38"/><rect x="56" y="10" width="4" height="38"/><rect x="63" y="10" width="2" height="38"/><rect x="68" y="10" width="3.5" height="38"/><rect x="74" y="10" width="1.5" height="38"/><rect x="78" y="10" width="4" height="38"/><rect x="85" y="10" width="2" height="38"/><rect x="90" y="10" width="3" height="38"/><rect x="96" y="10" width="5" height="38"/><rect x="104" y="10" width="2" height="38"/><rect x="109" y="10" width="1.5" height="38"/><rect x="113" y="10" width="4" height="38"/><rect x="120" y="10" width="3" height="38"/><rect x="126" y="10" width="2" height="38"/><rect x="131" y="10" width="5" height="38"/><rect x="139" y="10" width="1.5" height="38"/><rect x="144" y="10" width="3" height="38"/></g><text x="80" y="62" font-family="monospace" font-size="9" font-weight="900" fill="#000" text-anchor="middle">(01) 08938501942846</text></svg>`
    },
    interleaved2of5: {
      key: 'interleaved2of5',
      name: 'Interleaved 2 of 5 (I2of5 Mật Độ Số Cao)',
      cat: 'logistics',
      type: 'barcode',
      badge: 'Công Nghiệp Kho',
      desc: 'Mã vạch chỉ chứa các cặp chữ số với mật độ rất cao, bền bỉ khi quét xa.',
      svg: `<svg viewBox="0 0 160 70" xmlns="http://www.w3.org/2000/svg" class="w-full h-full"><rect width="160" height="70" fill="#fff" rx="4"/><g fill="#000"><rect x="20" y="10" width="2" height="40"/><rect x="24" y="10" width="2" height="40"/><rect x="29" y="10" width="5" height="40"/><rect x="37" y="10" width="2" height="40"/><rect x="42" y="10" width="5" height="40"/><rect x="50" y="10" width="2" height="40"/><rect x="55" y="10" width="5" height="40"/><rect x="63" y="10" width="2" height="40"/><rect x="68" y="10" width="5" height="40"/><rect x="76" y="10" width="2" height="40"/><rect x="81" y="10" width="5" height="40"/><rect x="89" y="10" width="2" height="40"/><rect x="94" y="10" width="5" height="40"/><rect x="102" y="10" width="2" height="40"/><rect x="107" y="10" width="5" height="40"/><rect x="115" y="10" width="2" height="40"/><rect x="120" y="10" width="5" height="40"/><rect x="128" y="10" width="2" height="40"/><rect x="133" y="10" width="4" height="40"/><rect x="139" y="10" width="2" height="40"/></g><text x="80" y="62" font-family="monospace" font-size="10" font-weight="bold" fill="#000" text-anchor="middle">1234567890</text></svg>`
    },

    // 3. DƯỢC PHẨM & Y TẾ
    pharmacode: {
      key: 'pharmacode',
      name: 'Pharmacode (Mã Vạch Dược Phẩm / Vỏ Hộp Thuốc)',
      cat: 'medical',
      type: 'barcode',
      badge: 'Ngành Dược',
      desc: 'Mã vạch đặc thù ngành dược với các thanh dày mỏng phân cách đều, dùng cho máy đóng gói tự động kiểm soát chống lẫn vỏ hộp thuốc.',
      svg: `<svg viewBox="0 0 160 70" xmlns="http://www.w3.org/2000/svg" class="w-full h-full"><rect width="160" height="70" fill="#fff" rx="4"/><g fill="#000"><rect x="22" y="12" width="3.5" height="38"/><rect x="36" y="12" width="7.5" height="38"/><rect x="54" y="12" width="3.5" height="38"/><rect x="68" y="12" width="3.5" height="38"/><rect x="82" y="12" width="7.5" height="38"/><rect x="100" y="12" width="7.5" height="38"/><rect x="118" y="12" width="3.5" height="38"/><rect x="132" y="12" width="7.5" height="38"/></g><text x="80" y="62" font-family="monospace" font-size="10" font-weight="900" fill="#000" text-anchor="middle">PHARMACODE: 118545</text></svg>`
    },
    codabar: {
      key: 'codabar',
      name: 'Codabar / NW-7 (Ngân Hàng Máu & Thư Viện)',
      cat: 'medical',
      type: 'barcode',
      badge: 'Y Tế & Máu',
      desc: 'Mã vạch y tế cổ điển chuyên dùng dán túi máu, mẫu xét nghiệm sinh học và thẻ độc giả thư viện.',
      svg: `<svg viewBox="0 0 160 70" xmlns="http://www.w3.org/2000/svg" class="w-full h-full"><rect width="160" height="70" fill="#fff" rx="4"/><g fill="#000"><rect x="18" y="12" width="2" height="38"/><rect x="22" y="12" width="4" height="38"/><rect x="30" y="12" width="2" height="38"/><rect x="36" y="12" width="5" height="38"/><rect x="45" y="12" width="2" height="38"/><rect x="51" y="12" width="4" height="38"/><rect x="58" y="12" width="2" height="38"/><rect x="64" y="12" width="5" height="38"/><rect x="73" y="12" width="2" height="38"/><rect x="79" y="12" width="4" height="38"/><rect x="87" y="12" width="2" height="38"/><rect x="93" y="12" width="5" height="38"/><rect x="102" y="12" width="2" height="38"/><rect x="108" y="12" width="4" height="38"/><rect x="116" y="12" width="2" height="38"/><rect x="122" y="12" width="5" height="38"/><rect x="131" y="12" width="2" height="38"/><rect x="137" y="12" width="4" height="38"/></g><text x="80" y="62" font-family="monospace" font-size="10" font-weight="bold" fill="#000" text-anchor="middle">A 12345678 B</text></svg>`
    },

    // 4. MA TRẬN 2D & QR
    datamatrix: {
      key: 'datamatrix',
      name: 'Data Matrix ECC 200 (Bo Mạch, Dược Phẩm & Linh Kiện)',
      cat: 'matrix2d',
      type: 'qrcode',
      badge: 'Chuẩn 2D Công Nghiệp',
      desc: 'Ma trận vuông khắc laser trên chip điện tử, thiết bị y tế và tem dược phẩm với đường biên chữ L đặc trưng.',
      svg: `<svg viewBox="0 0 160 70" xmlns="http://www.w3.org/2000/svg" class="w-full h-full"><rect width="160" height="70" fill="#fff" rx="4"/><g transform="translate(56, 8)"><rect x="0" y="0" width="3.5" height="42" fill="#000"/><rect x="0" y="38.5" width="42" height="3.5" fill="#000"/><rect x="7" y="0" width="3.5" height="3.5" fill="#000"/><rect x="14" y="0" width="3.5" height="3.5" fill="#000"/><rect x="21" y="0" width="3.5" height="3.5" fill="#000"/><rect x="28" y="0" width="3.5" height="3.5" fill="#000"/><rect x="35" y="0" width="3.5" height="3.5" fill="#000"/><rect x="38.5" y="7" width="3.5" height="3.5" fill="#000"/><rect x="38.5" y="14" width="3.5" height="3.5" fill="#000"/><rect x="38.5" y="21" width="3.5" height="3.5" fill="#000"/><rect x="38.5" y="28" width="3.5" height="3.5" fill="#000"/><rect x="7" y="7" width="7" height="7" fill="#000"/><rect x="17.5" y="7" width="3.5" height="3.5" fill="#000"/><rect x="28" y="7" width="7" height="3.5" fill="#000"/><rect x="7" y="17.5" width="3.5" height="7" fill="#000"/><rect x="14" y="14" width="7" height="7" fill="#000"/><rect x="24.5" y="17.5" width="10.5" height="3.5" fill="#000"/><rect x="7" y="28" width="7" height="7" fill="#000"/><rect x="21" y="24.5" width="7" height="7" fill="#000"/><rect x="31.5" y="28" width="3.5" height="7" fill="#000"/></g><text x="80" y="62" font-family="monospace" font-size="9" font-weight="900" fill="#000" text-anchor="middle">DATA MATRIX ECC 200</text></svg>`
    },
    qrcode: {
      key: 'qrcode',
      name: 'QR Code Tiêu Chuẩn (3 Góc Định Vị Vuông)',
      cat: 'matrix2d',
      type: 'qrcode',
      badge: 'Truy Xuất Nguồn Gốc',
      desc: 'Mã QR phổ biến nhất hành tinh, quét được bằng mọi camera điện thoại, chứa đường link website, bảo hành điện tử.',
      svg: `<svg viewBox="0 0 160 70" xmlns="http://www.w3.org/2000/svg" class="w-full h-full"><rect width="160" height="70" fill="#fff" rx="4"/><g transform="translate(58, 6)"><rect x="1" y="1" width="14" height="14" fill="none" stroke="#000" stroke-width="2.5"/><rect x="4.5" y="4.5" width="7" height="7" fill="#000"/><rect x="25" y="1" width="14" height="14" fill="none" stroke="#000" stroke-width="2.5"/><rect x="28.5" y="4.5" width="7" height="7" fill="#000"/><rect x="1" y="25" width="14" height="14" fill="none" stroke="#000" stroke-width="2.5"/><rect x="4.5" y="28.5" width="7" height="7" fill="#000"/><rect x="18" y="3" width="3.5" height="3.5" fill="#000"/><rect x="18" y="10" width="3.5" height="3.5" fill="#000"/><rect x="17" y="18" width="6" height="3.5" fill="#000"/><rect x="3" y="18" width="10" height="3.5" fill="#000"/><rect x="27" y="18" width="10" height="3.5" fill="#000"/><rect x="18" y="27" width="3.5" height="10" fill="#000"/><rect x="27" y="27" width="5" height="5" fill="#000"/><rect x="34" y="34" width="5" height="5" fill="#000"/></g><text x="80" y="62" font-family="monospace" font-size="9" font-weight="900" fill="#000" text-anchor="middle">QR CODE (ISO 18004)</text></svg>`
    },
    microqrcode: {
      key: 'microqrcode',
      name: 'Micro QR Code (Siêu Nhỏ Cho Tem Dưới 10mm)',
      cat: 'matrix2d',
      type: 'qrcode',
      badge: 'Tem Nhỏ <10mm',
      desc: 'Mã QR thu nhỏ chỉ có duy nhất 1 mắt vuông góc trên trái, dành cho tem vàng bạc trang sức, phụ kiện tí hon.',
      svg: `<svg viewBox="0 0 160 70" xmlns="http://www.w3.org/2000/svg" class="w-full h-full"><rect width="160" height="70" fill="#fff" rx="4"/><g transform="translate(62, 8)"><rect x="1" y="1" width="16" height="16" fill="none" stroke="#000" stroke-width="3"/><rect x="5" y="5" width="8" height="8" fill="#000"/><rect x="22" y="2" width="4" height="4" fill="#000"/><rect x="30" y="2" width="4" height="4" fill="#000"/><rect x="22" y="10" width="12" height="4" fill="#000"/><rect x="2" y="22" width="12" height="4" fill="#000"/><rect x="18" y="20" width="6" height="6" fill="#000"/><rect x="28" y="20" width="6" height="6" fill="#000"/><rect x="6" y="30" width="8" height="4" fill="#000"/><rect x="18" y="30" width="16" height="4" fill="#000"/></g><text x="80" y="62" font-family="monospace" font-size="9" font-weight="900" fill="#000" text-anchor="middle">MICRO QR (1 GÓC VUÔNG)</text></svg>`
    },
    pdf417: {
      key: 'pdf417',
      name: 'PDF417 (Mã Vạch 2D Xếp Tầng Vận Đơn & Thẻ)',
      cat: 'matrix2d',
      type: 'qrcode',
      badge: 'Vận Đơn & ID',
      desc: 'Mã vạch 2D dạng vân xếp tầng trên vận đơn bưu chính chuyển phát nhanh FedEx, thẻ căn cước và vé máy bay.',
      svg: `<svg viewBox="0 0 160 70" xmlns="http://www.w3.org/2000/svg" class="w-full h-full"><rect width="160" height="70" fill="#fff" rx="4"/><g fill="#000"><rect x="14" y="10" width="3.5" height="38"/><rect x="19" y="10" width="1.5" height="38"/><rect x="22" y="10" width="2.5" height="38"/><rect x="26" y="10" width="5" height="9"/><rect x="33" y="10" width="2" height="9"/><rect x="37" y="10" width="7" height="9"/><rect x="46" y="10" width="3.5" height="9"/><rect x="52" y="10" width="9" height="9"/><rect x="63" y="10" width="3.5" height="9"/><rect x="68" y="10" width="5" height="9"/><rect x="75" y="10" width="7" height="9"/><rect x="84" y="10" width="3.5" height="9"/><rect x="89" y="10" width="9" height="9"/><rect x="100" y="10" width="5" height="9"/><rect x="107" y="10" width="3.5" height="9"/><rect x="112" y="10" width="7" height="9"/><rect x="121" y="10" width="4" height="9"/><rect x="127" y="10" width="8" height="9"/><rect x="26" y="20" width="2" height="9"/><rect x="30" y="20" width="7" height="9"/><rect x="39" y="20" width="3.5" height="9"/><rect x="44" y="20" width="5" height="9"/><rect x="51" y="20" width="2.5" height="9"/><rect x="55" y="20" width="8" height="9"/><rect x="65" y="20" width="3.5" height="9"/><rect x="70" y="20" width="9" height="9"/><rect x="81" y="20" width="3.5" height="9"/><rect x="86" y="20" width="5" height="9"/><rect x="93" y="20" width="7" height="9"/><rect x="102" y="20" width="2.5" height="9"/><rect x="106" y="20" width="11" height="9"/><rect x="119" y="20" width="5" height="9"/><rect x="126" y="20" width="9" height="9"/><rect x="26" y="30" width="8" height="9"/><rect x="36" y="30" width="2.5" height="9"/><rect x="40" y="30" width="6" height="9"/><rect x="48" y="30" width="5" height="9"/><rect x="55" y="30" width="2" height="9"/><rect x="58" y="30" width="9" height="9"/><rect x="69" y="30" width="4" height="9"/><rect x="75" y="30" width="6" height="9"/><rect x="83" y="30" width="3.5" height="9"/><rect x="88" y="30" width="9" height="9"/><rect x="99" y="30" width="3.5" height="9"/><rect x="104" y="30" width="5" height="9"/><rect x="111" y="30" width="5" height="9"/><rect x="118" y="30" width="9" height="9"/><rect x="129" y="30" width="6" height="9"/><rect x="26" y="40" width="3.5" height="8"/><rect x="31" y="40" width="5" height="8"/><rect x="38" y="40" width="7" height="8"/><rect x="47" y="40" width="3.5" height="8"/><rect x="52" y="40" width="9" height="8"/><rect x="63" y="40" width="4" height="8"/><rect x="69" y="40" width="6" height="8"/><rect x="77" y="40" width="3.5" height="8"/><rect x="82" y="40" width="9" height="8"/><rect x="93" y="40" width="5" height="8"/><rect x="100" y="40" width="5" height="8"/><rect x="107" y="40" width="3.5" height="8"/><rect x="112" y="40" width="10" height="8"/><rect x="124" y="40" width="4" height="8"/><rect x="130" y="40" width="5" height="8"/><rect x="138" y="10" width="2.5" height="38"/><rect x="142" y="10" width="4" height="38"/></g><text x="80" y="62" font-family="monospace" font-size="9" font-weight="900" fill="#000" text-anchor="middle">PDF417 (VẬN ĐƠN & THẺ)</text></svg>`
    },
    azteccode: {
      key: 'azteccode',
      name: 'Aztec Code (Mắt Vuông Tâm Giữa - Vé Tàu & Máy Bay)',
      cat: 'matrix2d',
      type: 'qrcode',
      badge: 'Vé Điện Tử',
      desc: 'Ma trận vuông có tâm mắt bò đồng tâm ở chính giữa, cho phép đọc cực nhanh ngay cả khi mép tem bị rách.',
      svg: `<svg viewBox="0 0 160 70" xmlns="http://www.w3.org/2000/svg" class="w-full h-full"><rect width="160" height="70" fill="#fff" rx="4"/><g transform="translate(60, 6)"><rect x="3" y="3" width="34" height="34" fill="none" stroke="#000" stroke-width="2.5"/><rect x="8" y="8" width="24" height="24" fill="none" stroke="#000" stroke-width="2.5"/><rect x="13" y="13" width="14" height="14" fill="none" stroke="#000" stroke-width="2.5"/><rect x="17.5" y="17.5" width="5" height="5" fill="#000"/><rect x="0" y="0" width="3" height="3" fill="#000"/><rect x="37" y="0" width="3" height="3" fill="#000"/><rect x="0" y="37" width="3" height="3" fill="#000"/><rect x="37" y="37" width="3" height="3" fill="#000"/><rect x="10" y="0" width="4" height="2" fill="#000"/><rect x="26" y="0" width="4" height="2" fill="#000"/><rect x="0" y="18" width="2" height="4" fill="#000"/><rect x="38" y="18" width="2" height="4" fill="#000"/></g><text x="80" y="62" font-family="monospace" font-size="9" font-weight="900" fill="#000" text-anchor="middle">AZTEC CODE (BULLSEYE)</text></svg>`
    },

    // 5. CÔNG NGHIỆP & CHẾ TẠO
    code39: {
      key: 'code39',
      name: 'Code 39 (Công Nghiệp, Quân Sự & Ô Tô)',
      cat: 'industrial',
      type: 'barcode',
      badge: 'Công Nghiệp Ô Tô',
      desc: 'Chuẩn mã vạch công nghiệp tự kiểm tra lỗi, bắt đầu và kết thúc bằng dấu sao (*).',
      svg: `<svg viewBox="0 0 160 70" xmlns="http://www.w3.org/2000/svg" class="w-full h-full"><rect width="160" height="70" fill="#fff" rx="4"/><g fill="#000"><rect x="18" y="10" width="2" height="38"/><rect x="23" y="10" width="5" height="38"/><rect x="31" y="10" width="5" height="38"/><rect x="39" y="10" width="2" height="38"/><rect x="44" y="10" width="2" height="38"/><rect x="49" y="10" width="5" height="38"/><rect x="57" y="10" width="2" height="38"/><rect x="62" y="10" width="5" height="38"/><rect x="70" y="10" width="2" height="38"/><rect x="75" y="10" width="5" height="38"/><rect x="83" y="10" width="2" height="38"/><rect x="88" y="10" width="2" height="38"/><rect x="93" y="10" width="5" height="38"/><rect x="101" y="10" width="2" height="38"/><rect x="106" y="10" width="5" height="38"/><rect x="114" y="10" width="2" height="38"/><rect x="119" y="10" width="5" height="38"/><rect x="127" y="10" width="2" height="38"/><rect x="132" y="10" width="5" height="38"/><rect x="140" y="10" width="2" height="38"/></g><text x="80" y="62" font-family="monospace" font-size="10" font-weight="900" fill="#000" text-anchor="middle">* CODE 39 *</text></svg>`
    },
    code93: {
      key: 'code93',
      name: 'Code 93 (Công Nghiệp Mật Độ Ký Tự Cao)',
      cat: 'industrial',
      type: 'barcode',
      badge: 'Mật Độ Cao',
      desc: 'Bản nâng cấp gọn gàng hơn của Code 39 với 2 ký tự kiểm tra an toàn cao.',
      svg: `<svg viewBox="0 0 160 70" xmlns="http://www.w3.org/2000/svg" class="w-full h-full"><rect width="160" height="70" fill="#fff" rx="4"/><g fill="#000"><rect x="18" y="10" width="2" height="38"/><rect x="22" y="10" width="3" height="38"/><rect x="27" y="10" width="4" height="38"/><rect x="33" y="10" width="2" height="38"/><rect x="37" y="10" width="5" height="38"/><rect x="44" y="10" width="2" height="38"/><rect x="48" y="10" width="3" height="38"/><rect x="53" y="10" width="4" height="38"/><rect x="59" y="10" width="2" height="38"/><rect x="63" y="10" width="5" height="38"/><rect x="70" y="10" width="2" height="38"/><rect x="74" y="10" width="3" height="38"/><rect x="79" y="10" width="4" height="38"/><rect x="85" y="10" width="2" height="38"/><rect x="89" y="10" width="5" height="38"/><rect x="96" y="10" width="2" height="38"/><rect x="100" y="10" width="3" height="38"/><rect x="105" y="10" width="4" height="38"/><rect x="111" y="10" width="2" height="38"/><rect x="115" y="10" width="5" height="38"/><rect x="122" y="10" width="2" height="38"/><rect x="126" y="10" width="3" height="38"/><rect x="131" y="10" width="4" height="38"/><rect x="137" y="10" width="2" height="38"/><rect x="141" y="10" width="2" height="38"/></g><text x="80" y="62" font-family="monospace" font-size="10" font-weight="900" fill="#000" text-anchor="middle">CODE 93 COMPACT</text></svg>`
    }
  };

  // Giữ alias tương thích
  const PACKAGING_ICONS = BARTENDER_SYMBOLS;

  const svgIconCache = {};
  function createSvgIconImage(iconKey, color = '#0f172a') {
    const cacheKey = `${iconKey}_${color}`;
    if (svgIconCache[cacheKey]) return svgIconCache[cacheKey];

    const iconDef = BARTENDER_SYMBOLS[iconKey] || BARTENDER_SYMBOLS['fragile'];
    const svgString = iconDef.svg(color);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.src = url;
    svgIconCache[cacheKey] = img;
    return img;
  }

  /**
   * TẠO ẢNH MÃ VẠCH 1D ĐA ĐỊNH DẠNG BẰNG BWIP-JS VÀ JSBARCODE
   * Hỗ trợ: Code 128, GS1-128, EAN-13, EAN-8, UPC-A, UPC-E, Code 39, Code 93, ITF-14, I2of5, Pharmacode, Codabar, GS1 DataBar, MSI, Telepen
   */
  function generateBarcodeImage(codeStr, format = 'code128', displayValue = true, lineColor = '#000000') {
    const tempCanvas = document.createElement('canvas');
    let text = String(codeStr || '893850194284').trim();
    let fmt = String(format || 'code128').toLowerCase();

    // Chuẩn hóa và tự động tính toán check digit để mã vạch luôn hợp lệ 100%
    if (fmt === 'ean13') {
      text = text.replace(/\D/g, '');
      if (text.length < 12) text = (text + '893850194284').slice(0, 12);
      if (text.length === 12) {
        let sum = 0;
        for (let i = 0; i < 12; i++) sum += parseInt(text[i], 10) * (i % 2 === 0 ? 1 : 3);
        text = text + String((10 - (sum % 10)) % 10);
      } else if (text.length > 13) {
        text = text.slice(0, 13);
      }
    } else if (fmt === 'ean8') {
      text = text.replace(/\D/g, '');
      if (text.length < 7) text = (text + '8938501').slice(0, 7);
      if (text.length === 7) {
        let sum = 0;
        for (let i = 0; i < 7; i++) sum += parseInt(text[i], 10) * (i % 2 === 0 ? 3 : 1);
        text = text + String((10 - (sum % 10)) % 10);
      } else if (text.length > 8) {
        text = text.slice(0, 8);
      }
    } else if (fmt === 'upca' || fmt === 'upc') {
      fmt = 'upca';
      text = text.replace(/\D/g, '');
      if (text.length < 11) text = (text + '01234567890').slice(0, 11);
      if (text.length === 11) {
        let sum = 0;
        for (let i = 0; i < 11; i++) sum += parseInt(text[i], 10) * (i % 2 === 0 ? 3 : 1);
        text = text + String((10 - (sum % 10)) % 10);
      } else if (text.length > 12) {
        text = text.slice(0, 12);
      }
    } else if (fmt === 'upce') {
      text = text.replace(/\D/g, '');
      if (text.length < 6) text = (text + '012345').slice(0, 6);
      else if (text.length > 8) text = text.slice(0, 7);
    } else if (fmt === 'itf14') {
      text = text.replace(/\D/g, '');
      if (text.length < 13) text = (text + '1893850194284').slice(0, 13);
      if (text.length === 13) {
        let sum = 0;
        for (let i = 0; i < 13; i++) sum += parseInt(text[i], 10) * (i % 2 === 0 ? 3 : 1);
        text = text + String((10 - (sum % 10)) % 10);
      } else if (text.length > 14) {
        text = text.slice(0, 14);
      }
    } else if (fmt === 'interleaved2of5') {
      text = text.replace(/\D/g, '');
      if (text.length % 2 !== 0) text = '0' + text;
      if (!text) text = '123456';
    } else if (fmt === 'pharmacode') {
      let num = parseInt(text.replace(/\D/g, ''), 10);
      if (isNaN(num) || num < 3 || num > 131070) num = (num % 131070) || 12345;
      text = String(num);
    } else if (fmt === 'codabar') {
      fmt = 'rationalizedCodabar';
      if (!/^[A-Da-d]/.test(text)) text = 'A' + text;
      if (!/[A-Da-d]$/.test(text)) text = text + 'B';
    } else if (fmt === 'code39') {
      text = text.toUpperCase().replace(/[^0-9A-Z\-.$/+% ]/g, '-');
      if (!text) text = 'CODE39-TEST';
    }

    // 1. Dùng bwip-js (Bộ sinh mã vạch hoàn chỉnh nhất thế giới)
    // LƯU Ý QUAN TRỌNG: Render includetext: false để tách biệt phần vạch và chữ số (chuẩn BarTender),
    // giúp chữ số KHÔNG BAO GIỜ BỊ MÉO khi co dãn kích thước và cho phép di chuyển số xa / gần vạch tùy ý.
    if (window.bwipjs && typeof window.bwipjs.toCanvas === 'function') {
      try {
        const cleanColor = (lineColor || '#000000').replace('#', '');
        window.bwipjs.toCanvas(tempCanvas, {
          bcid: fmt,
          text: text,
          scale: 3,
          height: 12,
          includetext: false,
          barcolor: cleanColor,
          paddingwidth: 1,
          paddingheight: 0
        });
        const img = new Image();
        img.src = tempCanvas.toDataURL('image/png');
        return img;
      } catch (err) {
        console.warn(`bwip-js render fallback for ${fmt}:`, err);
      }
    }

    // 2. Dự phòng qua JsBarcode nếu có
    if (window.JsBarcode) {
      try {
        let jFmt = fmt.toUpperCase();
        if (jFmt === 'UPCA') jFmt = 'UPC';
        JsBarcode(tempCanvas, text, {
          format: jFmt,
          lineColor: lineColor || '#000000',
          width: 3,
          height: 75,
          displayValue: false,
          margin: 0,
          background: 'transparent'
        });
        const img = new Image();
        img.src = tempCanvas.toDataURL('image/png');
        return img;
      } catch (e) {
        console.warn('JsBarcode render error:', e);
      }
    }

    const img = new Image();
    img.src = tempCanvas.toDataURL('image/png');
    return img;
  }

  /**
   * ĐỊNH DẠNG CHUỖI HIỂN THỊ CHỮ SỐ MÃ VẠCH (CHUẨN BARTENDER)
   * Tách nhóm số cách đều đẹp mắt cho EAN-13, EAN-8, UPC-A, ITF-14
   */
  function formatBarcodeDisplayString(rawText, format) {
    const text = String(rawText || '').trim();
    const fmt = String(format || 'code128').toLowerCase();

    if (fmt === 'ean13' && /^\d{12,13}$/.test(text)) {
      const d = text.length === 12 ? text + '0' : text;
      return `${d[0]}  ${d.slice(1, 7)}  ${d.slice(7, 13)}`;
    }
    if (fmt === 'ean8' && /^\d{7,8}$/.test(text)) {
      return `${text.slice(0, 4)}  ${text.slice(4, 8)}`;
    }
    if ((fmt === 'upca' || fmt === 'upc') && /^\d{11,12}$/.test(text)) {
      return `${text[0]}  ${text.slice(1, 6)}  ${text.slice(6, 11)}  ${text.slice(11, 12)}`;
    }
    if (fmt === 'itf14' && /^\d{13,14}$/.test(text)) {
      return `${text[0]}  ${text.slice(1, 3)}  ${text.slice(3, 8)}  ${text.slice(8, 13)}  ${text.slice(13)}`;
    }
    return text;
  }

  /**
   * VẼ ĐỐI TƯỢNG MÃ VẠCH 1D LÊN CANVAS THEO CHUẨN BARTENDER
   * - Phần vạch (bars) tự động co dãn theo khung W x H
   * - Chữ số (Human-Readable) vẽ bằng vector typography 1:1, TUYỆT ĐỐI KHÔNG BỊ MÉO
   * - Tùy chỉnh khoảng cách xa/gần (textDistance), dịch ngang (textXOffset), cỡ chữ, font OCR-B
   */
  function renderBarcodeElement(c, el) {
    if (!el) return;
    const sf = getScaleFactor();
    const left = Math.round(el.x - el.w / 2);
    const top = Math.round(el.y - el.h / 2);
    const isShowingText = el.displayValue !== false;

    if (!isShowingText) {
      if (el.img && el.img.complete) {
        c.drawImage(el.img, left, top, el.w, el.h);
      } else if (el.img) {
        el.img.onload = () => render();
      }
      return;
    }

    // 1. Tính toán khoảng cách và cỡ chữ số (chuẩn BarTender Human-Readable)
    const distMm = el.textDistance !== undefined ? el.textDistance : 1.5; // mm (mặc định 1.5mm)
    const distPx = distMm * sf.scaleY;
    const xOffsetPx = (el.textXOffset || 0) * sf.scaleX;
    const yOffsetPx = (el.textYOffset || 0) * sf.scaleY;

    // Cỡ chữ số: nếu có el.textSize người dùng chỉ định thì dùng, không thì tự động theo tỷ lệ
    const defaultFSize = Math.max(11, Math.min(26, Math.round(el.h * 0.22)));
    const fSize = el.textSize ? Math.max(8, Math.round(el.textSize * (sf.scaleY * 0.35))) : defaultFSize;

    // Chiều cao phần vạch (bars)
    const barH = Math.max(10, el.h - fSize - Math.max(0, distPx + yOffsetPx));

    // 2. Vẽ các vạch mã vạch (bars)
    if (el.img && el.img.complete) {
      c.drawImage(el.img, left, top, el.w, barH);
    } else if (el.img) {
      el.img.onload = () => render();
    }

    // 3. Vẽ chữ số vector chuẩn xác 100%, KHÔNG BAO GIỜ BỊ MÉO
    c.save();
    c.fillStyle = el.color || '#000000';
    const weight = el.textBold !== false ? 'bold' : 'normal';
    const family = el.fontFamily || "'OCR-B', 'Consolas', 'Courier New', monospace";
    c.font = `${weight} ${fSize}px ${family}`;
    c.textBaseline = 'top';

    const textY = top + barH + distPx + yOffsetPx;
    const align = el.textAlign || 'center';
    c.textAlign = align;

    let textX = el.x + xOffsetPx;
    if (align === 'left') textX = left + 4 + xOffsetPx;
    else if (align === 'right') textX = left + el.w - 4 + xOffsetPx;

    const displayText = formatBarcodeDisplayString(el.text, el.format);
    c.fillText(displayText, textX, textY);
    c.restore();
  }

  /**
   * TẠO ẢNH MÃ 2D / MA TRẬN / QR CODE BẰNG BWIP-JS VÀ QRCODE.JS
   * Hỗ trợ: QR Code, Micro QR, GS1 QR, Data Matrix (ECC 200), GS1 DataMatrix, PDF417, MicroPDF417, Aztec Code, MaxiCode, DotCode
   */
  function generateQRCodeImage(str, format = 'qrcode', color = '#000000', bgType = 'white') {
    const tempCanvas = document.createElement('canvas');
    const text = String(str || 'https://barcode.vn').trim();
    const fmt = String(format || 'qrcode').toLowerCase();
    const cleanColor = (color || '#000000').replace('#', '');
    const cleanBg = bgType === 'transparent' ? undefined : (bgType === 'white' ? 'ffffff' : undefined);

    if (window.bwipjs && typeof window.bwipjs.toCanvas === 'function') {
      try {
        const opts = {
          bcid: fmt,
          text: text,
          scale: (fmt === 'datamatrix' || fmt === 'gs1datamatrix' || fmt === 'microqrcode') ? 4 : 3,
          barcolor: cleanColor,
          paddingwidth: 4,
          paddingheight: 4
        };
        if (cleanBg) opts.backgroundcolor = cleanBg;

        window.bwipjs.toCanvas(tempCanvas, opts);
        const img = new Image();
        img.src = tempCanvas.toDataURL('image/png');
        return img;
      } catch (err) {
        console.warn(`bwip-js 2D code error (${fmt}):`, err);
      }
    }

    // Dự phòng qua QRCode.js
    if (window.QRCode) {
      try {
        const tempDiv = document.createElement('div');
        new QRCode(tempDiv, {
          text: text,
          width: 240,
          height: 240,
          colorDark: color || '#000000',
          colorLight: bgType === 'transparent' ? 'transparent' : '#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });
        const qrCanvas = tempDiv.querySelector('canvas');
        if (qrCanvas) {
          const img = new Image();
          img.src = qrCanvas.toDataURL('image/png');
          return img;
        }
      } catch (e) {
        console.warn('QRCode.js fallback failed:', e);
      }
    }

    const img = new Image();
    img.src = tempCanvas.toDataURL('image/png');
    return img;
  }

  /**
   * RENDER TOÀN BỘ NỘI DUNG LÊN CANVAS 2D
   */
  function render(skipSelection = false) {
    if (!ctx || !canvas) return;

    const S = window.AppState;
    const cw = canvas.width;
    const ch = canvas.height;

    // 1. Xóa nền và vẽ màu nền con tem
    ctx.clearRect(0, 0, cw, ch);

    // Vẽ hình dáng con tem theo bo góc Radius hoặc đường tròn
    ctx.save();
    drawLabelShapePath(ctx, 0, 0, cw, ch, S.cornerRadius * (cw / (S.labelWidth || 50)));

    // Đổ màu / hiệu ứng vật liệu nền
    if (S.materialFinish === 'gold') {
      const grad = ctx.createLinearGradient(0, 0, cw, ch);
      grad.addColorStop(0, '#e5c053');
      grad.addColorStop(0.25, '#fff4b8');
      grad.addColorStop(0.5, '#d4af37');
      grad.addColorStop(0.75, '#b8860b');
      grad.addColorStop(1, '#ffd700');
      ctx.fillStyle = grad;
    } else if (S.materialFinish === 'metallic' || S.materialType === 'silver') {
      const grad = ctx.createLinearGradient(0, 0, cw, ch);
      grad.addColorStop(0, '#c5ccd6');
      grad.addColorStop(0.3, '#e5ebf2');
      grad.addColorStop(0.65, '#b4bcc8');
      grad.addColorStop(1, '#d0d8e2');
      ctx.fillStyle = grad;
    } else if (S.materialFinish === 'kraft') {
      ctx.fillStyle = '#c5a069';
    } else if (S.materialFinish === 'clear') {
      ctx.fillStyle = 'rgba(240, 245, 255, 0.45)';
    } else {
      ctx.fillStyle = S.labelColor || '#FFFFFF';
    }
    ctx.fill();

    // Viền mép tem nhẹ
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.clip(); // Giới hạn chỉ vẽ bên trong khuôn tem

    // 2. Vẽ tất cả các phần tử (text, barcode, line, rect, logo...)
    for (const el of elements) {
      if (el.type === 'text') {
        const family = el.fontFamily || "'Plus Jakarta Sans', sans-serif";
        const weight = el.fontWeight === 'bold' ? 'bold' : 'normal';
        const style = el.fontStyle === 'italic' ? 'italic' : 'normal';
        ctx.font = `${style} ${weight} ${el.fontSize}px ${family}`;
        ctx.textAlign = el.align || 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = el.color || '#000000';
        ctx.fillText(el.text, el.x, el.y);

        // Đo kích thước để phục vụ click chọn và bounding box
        const metrics = ctx.measureText(el.text || ' ');
        el.w = Math.ceil(metrics.width) + 12;
      } else if (el.type === 'icon') {
        const iconImg = createSvgIconImage(el.iconKey || 'fragile', el.color || '#0f172a');
        if (iconImg && iconImg.complete) {
          ctx.drawImage(iconImg, el.x - el.w / 2, el.y - el.h / 2, el.w, el.h);
        } else if (iconImg) {
          iconImg.onload = () => render();
        }
      } else if (el.type === 'barcode') {
        renderBarcodeElement(ctx, el);
      } else if (el.type === 'qrcode' || el.type === 'image') {
        if (el.img && el.img.complete) {
          ctx.drawImage(el.img, el.x - el.w / 2, el.y - el.h / 2, el.w, el.h);
        } else if (el.img) {
          el.img.onload = () => render();
        }

      } else if (el.type === 'line') {
        ctx.save();
        if (el.dash) ctx.setLineDash(el.dash);
        ctx.beginPath();
        ctx.moveTo(el.x1, el.y1);
        ctx.lineTo(el.x2, el.y2);
        ctx.strokeStyle = el.color || '#cbd5e1';
        ctx.lineWidth = el.lineWidth || 1.5;
        ctx.stroke();
        ctx.restore();

      } else if (el.type === 'rect') {
        ctx.save();
        if (el.dash) ctx.setLineDash(el.dash);
        ctx.beginPath();
        if (el.radius && typeof ctx.roundRect === 'function') {
          ctx.roundRect(el.x, el.y, el.w, el.h, el.radius);
        } else {
          ctx.rect(el.x, el.y, el.w, el.h);
        }
        if (el.fill && el.fill !== 'transparent') {
          ctx.fillStyle = el.fill;
          ctx.fill();
        }
        if (el.stroke) {
          ctx.strokeStyle = el.stroke;
          ctx.lineWidth = el.lineWidth || 1.5;
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    ctx.restore();

    // 3. ĐỒNG BỘ NGAY LẬP TỨC SANG 3D VÀ BẢN VẼ 2D (Bản in sạch vĩnh viễn không dính viền chọn và 8 tay cầm)
    if (!clean3dCanvas) {
      clean3dCanvas = document.createElement('canvas');
    }
    if (clean3dCanvas.width !== canvas.width || clean3dCanvas.height !== canvas.height) {
      clean3dCanvas.width = canvas.width;
      clean3dCanvas.height = canvas.height;
    }
    const cleanCtx = clean3dCanvas.getContext('2d');
    cleanCtx.clearRect(0, 0, clean3dCanvas.width, clean3dCanvas.height);
    cleanCtx.drawImage(canvas, 0, 0);

    if (window.Roll3D) {
      window.Roll3D.syncLabelTexture(clean3dCanvas);
    }

    // 4. VẼ KHUNG VIỀN CHỌN VÀ 8 TAY CẦM CO DÃN CHO GIAO DIỆN THIẾT KẾ 2D
    if (!skipSelection) {
      for (const el of elements) {
        if (selectedElementIds.includes(el.id) || el.id === selectedElementId) {
          drawSelectionBox(ctx, el);
        }
      }
    }
  }

  /**
   * VẼ ĐƯỜNG KHUÔN CON TEM (HỖ TRỢ TEM TRÒN, VUÔNG, BO GÓC, ELIP)
   */
  function drawLabelShapePath(c, x, y, w, h, r) {
    const S = window.AppState;

    if (S.shape === 'circle') {
      const rad = Math.min(w, h) / 2 - 2;
      c.beginPath();
      c.arc(x + w / 2, y + h / 2, rad, 0, Math.PI * 2);
      c.closePath();
      return;
    }

    if (S.shape === 'oval') {
      c.beginPath();
      c.ellipse(x + w / 2, y + h / 2, w / 2 - 2, h / 2 - 2, 0, 0, Math.PI * 2);
      c.closePath();
      return;
    }

    r = Math.min(r, w / 2 - 1, h / 2 - 1);
    r = Math.max(0, r);

    c.beginPath();
    if (r === 0 || S.shape === 'rect') {
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
  }

  /**
   * =========================================================
   * BARTENDER CORE ENGINE: BOUNDS, HANDLES, MM CONVERSION, HISTORY
   * =========================================================
   */

  let isResizing = false;
  let activeHandleKey = null;
  let startBounds = null;
  let startMouse = null;
  const historyStack = [];
  let historyIndex = -1;

  function saveHistory() {
    try {
      if (historyIndex < historyStack.length - 1) {
        historyStack.splice(historyIndex + 1);
      }
      const snapshot = elements.map(el => {
        const copy = Object.assign({}, el);
        delete copy.img; // Tránh circular/heavy DOM objects
        return copy;
      });
      historyStack.push(JSON.stringify(snapshot));
      if (historyStack.length > 30) historyStack.shift();
      historyIndex = historyStack.length - 1;
    } catch (e) {}
  }

  function undo() {
    if (historyIndex > 0) {
      historyIndex--;
      restoreHistoryState(historyStack[historyIndex]);
    }
  }

  function redo() {
    if (historyIndex < historyStack.length - 1) {
      historyIndex++;
      restoreHistoryState(historyStack[historyIndex]);
    }
  }

  function restoreHistoryState(jsonStr) {
    try {
      const raw = JSON.parse(jsonStr);
      elements = raw.map(el => {
        if (el.type === 'barcode') el.img = generateBarcodeImage(el.text);
        if (el.type === 'qrcode') el.img = generateQRCodeImage(el.text);
        if (el.type === 'image' && uploadedLogoImg) el.img = uploadedLogoImg;
        return el;
      });
      const current = elements.find(e => e.id === selectedElementId);
      if (!current) selectedElementId = null;
      syncSelectedElementToUI(current);
      render();
    } catch (e) {}
  }

  function getScaleFactor() {
    const S = window.AppState;
    const labelW = S.shape === 'circle' ? (S.labelDiameter || 40) : (S.labelWidth || 50);
    const labelH = S.shape === 'circle' ? (S.labelDiameter || 40) : (S.labelHeight || 38);
    return {
      scaleX: canvasWidth / labelW,
      scaleY: canvasHeight / labelH,
      labelW,
      labelH
    };
  }

  function pxToMm(px, isY = false) {
    const sf = getScaleFactor();
    const scale = isY ? sf.scaleY : sf.scaleX;
    return parseFloat((px / scale).toFixed(1));
  }

  function mmToPx(mm, isY = false) {
    const sf = getScaleFactor();
    const scale = isY ? sf.scaleY : sf.scaleX;
    return Math.round(mm * scale);
  }

  function getElementBounds(el) {
    if (!el) return { x: 0, y: 0, w: 0, h: 0 };

    if (el.type === 'line') {
      const minX = Math.min(el.x1, el.x2);
      const maxX = Math.max(el.x1, el.x2);
      const minY = Math.min(el.y1, el.y2);
      const maxY = Math.max(el.y1, el.y2);
      const isH = Math.abs(maxY - minY) < 4;
      const isV = Math.abs(maxX - minX) < 4;
      const pad = 8;
      if (isH) {
        return { x: minX, y: minY - pad, w: Math.max(maxX - minX, 12), h: pad * 2 };
      } else if (isV) {
        return { x: minX - pad, y: minY, w: pad * 2, h: Math.max(maxY - minY, 12) };
      } else {
        return { x: minX - pad, y: minY - pad, w: Math.max(maxX - minX, 12) + pad * 2, h: Math.max(maxY - minY, 12) + pad * 2 };
      }
    }

    if (el.type === 'rect') {
      return { x: el.x, y: el.y, w: el.w, h: el.h };
    }

    // Text: đo chính xác chiều rộng và chiều cao dựa trên đúng font, cỡ chữ và kiểu căn lề (align)
    if (el.type === 'text') {
      ctx.save();
      const family = el.fontFamily || "'Plus Jakarta Sans', sans-serif";
      const weight = el.fontWeight === 'bold' ? 'bold' : 'normal';
      const style = el.fontStyle === 'italic' ? 'italic' : 'normal';
      ctx.font = `${style} ${weight} ${el.fontSize || 36}px ${family}`;
      const measured = ctx.measureText(el.text || ' ').width;
      ctx.restore();

      const paddingH = 6;
      el.w = Math.ceil(measured) + paddingH * 2;
      el.h = Math.round((el.fontSize || 36) * 1.25);

      const align = el.align || 'left';
      let bx;
      if (align === 'center') {
        bx = Math.round(el.x - el.w / 2);
      } else if (align === 'right') {
        bx = Math.round(el.x - el.w + paddingH);
      } else { // 'left'
        bx = Math.round(el.x - paddingH);
      }
      const by = Math.round(el.y - el.h / 2);
      return { x: bx, y: by, w: el.w, h: el.h };
    }

    // Barcode, QR, Image, Icon
    const w = el.w || (el.type === 'icon' ? 64 : 140);
    const h = el.h || (el.type === 'icon' ? 64 : 60);
    return { x: Math.round(el.x - w / 2), y: Math.round(el.y - h / 2), w, h };
  }

  /**
   * DỊCH CHUYỂN BOUNDING BOX CỦA ĐỐI TƯỢNG ĐẾN TỌA ĐỘ MỚI (newBx, newBy)
   * Tự động tương thích với kiểu căn lề của văn bản, khung chữ nhật, đường kẻ hoặc ảnh
   */
  function moveElementTo(el, newBx, newBy) {
    if (!el) return;
    if (el.type === 'line') {
      const curMinX = Math.min(el.x1, el.x2);
      const curMinY = Math.min(el.y1, el.y2);
      const isH = Math.abs(el.y2 - el.y1) < 4;
      const isV = Math.abs(el.x2 - el.x1) < 4;
      const targetX = typeof newBx === 'number' ? newBx : curMinX;
      const targetY = typeof newBy === 'number' ? newBy : curMinY;
      const shiftX = targetX - curMinX;
      const shiftY = targetY - curMinY;
      el.x1 += shiftX;
      el.x2 += shiftX;
      el.y1 += shiftY;
      el.y2 += shiftY;
    } else if (el.type === 'rect') {
      el.x = newBx;
      if (typeof newBy === 'number') el.y = newBy;
    } else if (el.type === 'text') {
      const paddingH = 6;
      const align = el.align || 'left';
      if (align === 'center') {
        el.x = Math.round(newBx + (el.w || 60) / 2);
      } else if (align === 'right') {
        el.x = Math.round(newBx + (el.w || 60) - paddingH);
      } else {
        el.x = Math.round(newBx + paddingH);
      }
      if (typeof newBy === 'number') {
        el.y = Math.round(newBy + (el.h || 30) / 2);
      }
    } else {
      // Barcode, QR, Image
      el.x = Math.round(newBx + (el.w || 140) / 2);
      if (typeof newBy === 'number') {
        el.y = Math.round(newBy + (el.h || 60) / 2);
      }
    }
  }

  /**
   * THAY ĐỔI KIỂU CĂN LỀ CHỮ (LEFT, CENTER, RIGHT)
   * Giữ nguyên vị trí hộp bao (Bounding box) để chữ không bị lệch hay nhảy vị trí
   */
  function setTextAlign(el, newAlign) {
    if (!el || el.type !== 'text') return;
    if (el.align === newAlign) return;

    const oldB = getElementBounds(el);
    const paddingH = 6;

    el.align = newAlign;

    if (newAlign === 'left') {
      el.x = oldB.x + paddingH;
    } else if (newAlign === 'center') {
      el.x = Math.round(oldB.x + oldB.w / 2);
    } else if (newAlign === 'right') {
      el.x = oldB.x + oldB.w - paddingH;
    }

    saveHistory();
    syncSelectedElementToUI(el);
    render();
  }

  function getHandles(b) {
    const halfW = b.w / 2;
    const halfH = b.h / 2;
    return [
      { key: 'nw', x: b.x, y: b.y, cursor: 'nwse-resize' },
      { key: 'n',  x: b.x + halfW, y: b.y, cursor: 'ns-resize' },
      { key: 'ne', x: b.x + b.w, y: b.y, cursor: 'nesw-resize' },
      { key: 'e',  x: b.x + b.w, y: b.y + halfH, cursor: 'ew-resize' },
      { key: 'se', x: b.x + b.w, y: b.y + b.h, cursor: 'nwse-resize' },
      { key: 's',  x: b.x + halfW, y: b.y + b.h, cursor: 'ns-resize' },
      { key: 'sw', x: b.x, y: b.y + b.h, cursor: 'nesw-resize' },
      { key: 'w',  x: b.x, y: b.y + halfH, cursor: 'ew-resize' }
    ];
  }

  /**
   * VẼ KHUNG VIỀN CHỌN VÀ 8 TAY CẦM KÉO THẢ CHUẨN BARTENDER
   */
  function drawSelectionBox(c, el) {
    const b = getElementBounds(el);
    c.save();

    if (el.type === 'line') {
      const isH = Math.abs(el.y2 - el.y1) < 4;
      const isV = Math.abs(el.x2 - el.x1) < 4;
      const lengthPx = Math.hypot(el.x2 - el.x1, el.y2 - el.y1);
      const lengthMm = pxToMm(lengthPx, isV);

      // 1. Viền bao quanh nét đứt màu xanh BarTender
      c.strokeStyle = '#2563eb';
      c.lineWidth = 1.5;
      c.setLineDash([5, 3]);
      c.strokeRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
      c.setLineDash([]);

      // 2. Hai tay cầm ở 2 ĐẦU ĐƯỜNG KẺ (Endpoint Handles 9px nổi bật, kéo dài ngắn tự do)
      const hs = 9;
      const drawLineEndHandle = (hx, hy) => {
        c.fillStyle = '#ffffff';
        c.strokeStyle = '#2563eb';
        c.lineWidth = 2;
        c.fillRect(Math.round(hx - hs / 2), Math.round(hy - hs / 2), hs, hs);
        c.strokeRect(Math.round(hx - hs / 2), Math.round(hy - hs / 2), hs, hs);
      };
      drawLineEndHandle(el.x1, el.y1);
      drawLineEndHandle(el.x2, el.y2);

      // 3. Tooltip chiều dài milimet (ví dụ: "Ngang: 46.7 mm" hoặc "Đứng: 28.0 mm")
      const orientLabel = isV ? 'Đứng' : (isH ? 'Ngang' : 'Kẻ');
      const tipText = `${orientLabel}: ${lengthMm} mm`;
      c.font = 'bold 11px monospace';
      const tipW = c.measureText(tipText).width + 12;
      const tipX = b.x + b.w / 2 - tipW / 2;
      const tipY = Math.max(16, b.y - 8);

      c.fillStyle = 'rgba(15, 23, 42, 0.9)';
      c.strokeStyle = '#3b82f6';
      c.lineWidth = 1;
      c.beginPath();
      if (typeof c.roundRect === 'function') {
        c.roundRect(tipX, tipY - 14, tipW, 16, 4);
      } else {
        c.rect(tipX, tipY - 14, tipW, 16);
      }
      c.fill();
      c.stroke();

      c.fillStyle = '#60a5fa';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(tipText, b.x + b.w / 2, tipY - 6);

      c.restore();
      return;
    }

    // 1. Viền bao quanh nét đứt màu xanh BarTender
    c.strokeStyle = '#2563eb';
    c.lineWidth = 1.5;
    c.setLineDash([5, 3]);
    c.strokeRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
    c.setLineDash([]);

    // 2. Vẽ 8 tay cầm co dãn (Handles: hình vuông trắng viền xanh 7px)
    const handles = getHandles(b);
    const hs = 7;
    handles.forEach(h => {
      c.fillStyle = '#ffffff';
      c.strokeStyle = '#2563eb';
      c.lineWidth = 1.5;
      c.fillRect(Math.round(h.x - hs / 2), Math.round(h.y - hs / 2), hs, hs);
      c.strokeRect(Math.round(h.x - hs / 2), Math.round(h.y - hs / 2), hs, hs);
    });

    // 3. Tooltip kích thước milimet nhỏ gắn ở mép trên hộp chọn
    const wMm = pxToMm(b.w);
    const hMm = pxToMm(b.h, true);
    const tipText = `${wMm} × ${hMm} mm`;
    c.font = 'bold 11px monospace';
    const tipW = c.measureText(tipText).width + 10;
    const tipX = b.x + b.w / 2 - tipW / 2;
    const tipY = Math.max(16, b.y - 8);

    c.fillStyle = 'rgba(15, 23, 42, 0.9)';
    c.strokeStyle = '#3b82f6';
    c.lineWidth = 1;
    c.beginPath();
    if (typeof c.roundRect === 'function') {
      c.roundRect(tipX, tipY - 14, tipW, 16, 4);
    } else {
      c.rect(tipX, tipY - 14, tipW, 16);
    }
    c.fill();
    c.stroke();

    c.fillStyle = '#60a5fa';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(tipText, b.x + b.w / 2, tipY - 6);

    c.restore();
  }

  /**
   * =========================================================
   * CĂN CHỈNH & GIÓNG HÀNG ĐỐI TƯỢNG CHUẨN PHẦN MỀM BARTENDER
   * Hỗ trợ chọn nhiều đối tượng (Shift+Click) hoặc căn theo đối tượng gần nhất
   * =========================================================
   */
  function getActiveSelection() {
    let targets = elements.filter(item => selectedElementIds.includes(item.id));
    if (targets.length === 0 && selectedElementId) {
      const el = elements.find(item => item.id === selectedElementId);
      if (el) targets = [el];
    }
    return targets;
  }

  function getReferenceElement(currentEl) {
    if (!currentEl) return null;
    let closest = null;
    let minDist = Infinity;
    const curB = getElementBounds(currentEl);
    for (const other of elements) {
      if (other.id === currentEl.id) continue;
      const ob = getElementBounds(other);
      const dist = Math.hypot(ob.x - curB.x, ob.y - curB.y);
      if (dist < minDist) {
        minDist = dist;
        closest = other;
      }
    }
    return closest;
  }

  // 1. Căn thẳng lề trái (Align Left Edges)
  function alignLeftEdges() {
    const targets = getActiveSelection();
    if (targets.length >= 2) {
      const primary = targets[0];
      const targetLeftX = getElementBounds(primary).x;
      for (let i = 1; i < targets.length; i++) {
        const b = getElementBounds(targets[i]);
        moveElementTo(targets[i], targetLeftX, b.y);
      }
    } else if (targets.length === 1) {
      const ref = getReferenceElement(targets[0]);
      if (ref) {
        const targetLeftX = getElementBounds(ref).x;
        const b = getElementBounds(targets[0]);
        moveElementTo(targets[0], targetLeftX, b.y);
      }
    }
    saveHistory();
    syncSelectedElementToUI(elements.find(it => it.id === selectedElementId));
    render();
  }

  // 2. Căn thẳng tâm giữa ngang (Align Horizontal Centers)
  function alignCenterH() {
    const targets = getActiveSelection();
    if (targets.length >= 2) {
      const primary = targets[0];
      const pb = getElementBounds(primary);
      const targetCenterX = pb.x + pb.w / 2;
      for (let i = 1; i < targets.length; i++) {
        const b = getElementBounds(targets[i]);
        moveElementTo(targets[i], Math.round(targetCenterX - b.w / 2), b.y);
      }
    } else if (targets.length === 1) {
      const ref = getReferenceElement(targets[0]);
      if (ref) {
        const rb = getElementBounds(ref);
        const targetCenterX = rb.x + rb.w / 2;
        const b = getElementBounds(targets[0]);
        moveElementTo(targets[0], Math.round(targetCenterX - b.w / 2), b.y);
      }
    }
    saveHistory();
    syncSelectedElementToUI(elements.find(it => it.id === selectedElementId));
    render();
  }

  // 3. Căn thẳng lề phải (Align Right Edges)
  function alignRightEdges() {
    const targets = getActiveSelection();
    if (targets.length >= 2) {
      const primary = targets[0];
      const pb = getElementBounds(primary);
      const targetRightX = pb.x + pb.w;
      for (let i = 1; i < targets.length; i++) {
        const b = getElementBounds(targets[i]);
        moveElementTo(targets[i], Math.round(targetRightX - b.w), b.y);
      }
    } else if (targets.length === 1) {
      const ref = getReferenceElement(targets[0]);
      if (ref) {
        const rb = getElementBounds(ref);
        const targetRightX = rb.x + rb.w;
        const b = getElementBounds(targets[0]);
        moveElementTo(targets[0], Math.round(targetRightX - b.w), b.y);
      }
    }
    saveHistory();
    syncSelectedElementToUI(elements.find(it => it.id === selectedElementId));
    render();
  }

  // 4. Căn thẳng mép trên đỉnh (Align Tops)
  function alignTopEdges() {
    const targets = getActiveSelection();
    if (targets.length >= 2) {
      const primary = targets[0];
      const targetTopY = getElementBounds(primary).y;
      for (let i = 1; i < targets.length; i++) {
        const b = getElementBounds(targets[i]);
        moveElementTo(targets[i], b.x, targetTopY);
      }
    } else if (targets.length === 1) {
      const ref = getReferenceElement(targets[0]);
      if (ref) {
        const targetTopY = getElementBounds(ref).y;
        const b = getElementBounds(targets[0]);
        moveElementTo(targets[0], b.x, targetTopY);
      }
    }
    saveHistory();
    syncSelectedElementToUI(elements.find(it => it.id === selectedElementId));
    render();
  }

  // 5. Căn thẳng trục giữa tâm dọc (Align Vertical Centers)
  function alignCenterV() {
    const targets = getActiveSelection();
    if (targets.length >= 2) {
      const primary = targets[0];
      const pb = getElementBounds(primary);
      const targetCenterY = pb.y + pb.h / 2;
      for (let i = 1; i < targets.length; i++) {
        const b = getElementBounds(targets[i]);
        moveElementTo(targets[i], b.x, Math.round(targetCenterY - b.h / 2));
      }
    } else if (targets.length === 1) {
      const ref = getReferenceElement(targets[0]);
      if (ref) {
        const rb = getElementBounds(ref);
        const targetCenterY = rb.x + rb.h / 2;
        const b = getElementBounds(targets[0]);
        moveElementTo(targets[0], b.x, Math.round(targetCenterY - b.h / 2));
      }
    }
    saveHistory();
    syncSelectedElementToUI(elements.find(it => it.id === selectedElementId));
    render();
  }

  // 6. Căn thẳng mép dưới đáy (Align Bottoms)
  function alignBottomEdges() {
    const targets = getActiveSelection();
    if (targets.length >= 2) {
      const primary = targets[0];
      const pb = getElementBounds(primary);
      const targetBottomY = pb.y + pb.h;
      for (let i = 1; i < targets.length; i++) {
        const b = getElementBounds(targets[i]);
        moveElementTo(targets[i], b.x, Math.round(targetBottomY - b.h));
      }
    } else if (targets.length === 1) {
      const ref = getReferenceElement(targets[0]);
      if (ref) {
        const rb = getElementBounds(ref);
        const targetBottomY = rb.y + rb.h;
        const b = getElementBounds(targets[0]);
        moveElementTo(targets[0], b.x, Math.round(targetBottomY - b.h));
      }
    }
    saveHistory();
    syncSelectedElementToUI(elements.find(it => it.id === selectedElementId));
    render();
  }

  // 7. Cùng chiều rộng (Make Same Width)
  function makeSameWidth() {
    const targets = getActiveSelection();
    if (targets.length >= 2) {
      const targetW = targets[0].w || getElementBounds(targets[0]).w;
      for (let i = 1; i < targets.length; i++) {
        targets[i].w = targetW;
        if (targets[i].type === 'line') targets[i].x2 = targets[i].x1 + targetW;
      }
    } else if (targets.length === 1) {
      const ref = getReferenceElement(targets[0]);
      if (ref) {
        targets[0].w = ref.w || getElementBounds(ref).w;
      }
    }
    saveHistory();
    syncSelectedElementToUI(elements.find(it => it.id === selectedElementId));
    render();
  }

  // 8. Cùng chiều cao (Make Same Height)
  function makeSameHeight() {
    const targets = getActiveSelection();
    if (targets.length >= 2) {
      const targetH = targets[0].h || getElementBounds(targets[0]).h;
      for (let i = 1; i < targets.length; i++) {
        targets[i].h = targetH;
        if (targets[i].type === 'text') targets[i].fontSize = Math.round(targetH * 0.78);
      }
    } else if (targets.length === 1) {
      const ref = getReferenceElement(targets[0]);
      if (ref) {
        targets[0].h = ref.h || getElementBounds(ref).h;
        if (targets[0].type === 'text') targets[0].fontSize = Math.round(targets[0].h * 0.78);
      }
    }
    saveHistory();
    syncSelectedElementToUI(elements.find(it => it.id === selectedElementId));
    render();
  }

  // 9. Căn theo khổ con tem (Align to Label)
  function alignToLabel(mode) {
    const targets = getActiveSelection();
    if (targets.length === 0) return;
    const padX = Math.round(canvasWidth * 0.06);
    const padY = Math.round(canvasHeight * 0.06);
    targets.forEach(el => {
      const b = getElementBounds(el);
      if (mode === 'left') {
        moveElementTo(el, padX, b.y);
      } else if (mode === 'center') {
        moveElementTo(el, Math.round(canvasWidth / 2 - b.w / 2), Math.round(canvasHeight / 2 - b.h / 2));
      } else if (mode === 'right') {
        moveElementTo(el, Math.round(canvasWidth - padX - b.w), b.y);
      } else if (mode === 'top') {
        moveElementTo(el, b.x, padY);
      } else if (mode === 'bottom') {
        moveElementTo(el, b.x, Math.round(canvasHeight - padY - b.h));
      }
    });
    saveHistory();
    syncSelectedElementToUI(elements.find(it => it.id === selectedElementId));
    render();
  }

  /**
   * THIẾT LẬP CÁC SỰ KIỆN CHUỘT / TOUCH / BÀN PHÍM CHUẨN BARTENDER
   */
  function setupEventListeners() {
    // Lưu trạng thái ban đầu vào lịch sử
    saveHistory();

    // 1. CHUỘT NHẤN XUỐNG (MOUSE DOWN)
    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      // KIỂM TRA CLICK TRÚNG 1 TRONG CÁC TAY CẦM (HANDLES) CỦA ĐỐI TƯỢNG ĐANG CHỌN
      if (selectedElementId) {
        const curEl = elements.find(item => item.id === selectedElementId);
        if (curEl) {
          if (curEl.type === 'line') {
            const hs = 16; // Vùng bấm tay cầm 2 đầu đường kẻ rộng rãi, dễ kéo dài ngắn
            if (Math.hypot(mouseX - curEl.x1, mouseY - curEl.y1) <= hs) {
              isResizing = true;
              activeHandleKey = 'line_p1';
              startBounds = { x1: curEl.x1, y1: curEl.y1, x2: curEl.x2, y2: curEl.y2 };
              startMouse = { x: mouseX, y: mouseY };
              return;
            }
            if (Math.hypot(mouseX - curEl.x2, mouseY - curEl.y2) <= hs) {
              isResizing = true;
              activeHandleKey = 'line_p2';
              startBounds = { x1: curEl.x1, y1: curEl.y1, x2: curEl.x2, y2: curEl.y2 };
              startMouse = { x: mouseX, y: mouseY };
              return;
            }
            const b = getElementBounds(curEl);
            const handles = getHandles(b);
            for (const h of handles) {
              if (Math.abs(mouseX - h.x) <= 8 && Math.abs(mouseY - h.y) <= 8) {
                isResizing = true;
                activeHandleKey = h.key;
                startBounds = { ...b, x1: curEl.x1, y1: curEl.y1, x2: curEl.x2, y2: curEl.y2 };
                startMouse = { x: mouseX, y: mouseY };
                return;
              }
            }
          } else {
            const b = getElementBounds(curEl);
            const handles = getHandles(b);
            for (const h of handles) {
              if (Math.abs(mouseX - h.x) <= 8 && Math.abs(mouseY - h.y) <= 8) {
                isResizing = true;
                activeHandleKey = h.key;
                startBounds = { ...b };
                startMouse = { x: mouseX, y: mouseY };
                return;
              }
            }
          }
        }
      }

      // KIỂM TRA CLICK CHỌN ĐỐI TƯỢNG TRÊN BÀN VẼ (HỖ TRỢ SHIFT+CLICK CHỌN NHIỀU ĐỐI TƯỢNG)
      let hitElement = null;
      for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        const b = getElementBounds(el);
        if (mouseX >= b.x - 4 && mouseX <= b.x + b.w + 4 &&
            mouseY >= b.y - 4 && mouseY <= b.y + b.h + 4) {
          hitElement = el;
          break;
        }
      }

      if (hitElement) {
        if (e.shiftKey || e.ctrlKey) {
          const idx = selectedElementIds.indexOf(hitElement.id);
          if (idx >= 0) {
            selectedElementIds.splice(idx, 1);
          } else {
            selectedElementIds.push(hitElement.id);
          }
          selectedElementId = selectedElementIds[selectedElementIds.length - 1] || null;
        } else {
          if (!selectedElementIds.includes(hitElement.id)) {
            selectedElementIds = [hitElement.id];
          }
          selectedElementId = hitElement.id;
        }
        isDragging = true;
        dragOffsetX = mouseX;
        dragOffsetY = mouseY;
        dragInitialPositions = {};
        selectedElementIds.forEach(id => {
          const el = elements.find(item => item.id === id);
          if (el) {
            const eb = getElementBounds(el);
            dragInitialPositions[id] = { bx: eb.x, by: eb.y };
          }
        });
        syncSelectedElementToUI(elements.find(it => it.id === selectedElementId));
      } else {
        selectedElementIds = [];
        selectedElementId = null;
        syncSelectedElementToUI(null);
      }
      render();
    });

    // 2. CHUỘT DI CHUYỂN (MOUSE MOVE)
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      // KHI ĐANG CO DÃN BẰNG TAY CẦM (RESIZING)
      if (isResizing && selectedElementId && startBounds && startMouse) {
        const el = elements.find(item => item.id === selectedElementId);
        if (!el) return;

        // XỬ LÝ KÉO CO DÃN ĐƯỜNG KẺ Ở 2 ĐẦU
        if (el.type === 'line') {
          const dx = mouseX - startMouse.x;
          const dy = mouseY - startMouse.y;
          const isH = Math.abs(startBounds.y2 - startBounds.y1) < 4;
          const isV = Math.abs(startBounds.x2 - startBounds.x1) < 4;

          if (activeHandleKey === 'line_p1') {
            if (isH) {
              el.x1 = Math.round(startBounds.x1 + dx);
              el.y1 = startBounds.y1;
              el.y2 = startBounds.y2;
            } else if (isV) {
              el.y1 = Math.round(startBounds.y1 + dy);
              el.x1 = startBounds.x1;
              el.x2 = startBounds.x2;
            } else {
              el.x1 = Math.round(startBounds.x1 + dx);
              el.y1 = Math.round(startBounds.y1 + dy);
            }
          } else if (activeHandleKey === 'line_p2') {
            if (isH) {
              el.x2 = Math.round(startBounds.x2 + dx);
              el.y1 = startBounds.y1;
              el.y2 = startBounds.y2;
            } else if (isV) {
              el.y2 = Math.round(startBounds.y2 + dy);
              el.x1 = startBounds.x1;
              el.x2 = startBounds.x2;
            } else {
              el.x2 = Math.round(startBounds.x2 + dx);
              el.y2 = Math.round(startBounds.y2 + dy);
            }
          } else if (activeHandleKey === 'w' || activeHandleKey === 'nw' || activeHandleKey === 'sw') {
            if (isH) el.x1 = Math.round(startBounds.x1 + dx);
            else if (isV) el.y1 = Math.round(startBounds.y1 + dy);
          } else if (activeHandleKey === 'e' || activeHandleKey === 'ne' || activeHandleKey === 'se') {
            if (isH) el.x2 = Math.round(startBounds.x2 + dx);
            else if (isV) el.y2 = Math.round(startBounds.y2 + dy);
          } else if (activeHandleKey === 'n') {
            if (isV) el.y1 = Math.round(startBounds.y1 + dy);
          } else if (activeHandleKey === 's') {
            if (isV) el.y2 = Math.round(startBounds.y2 + dy);
          }

          el.w = Math.abs(el.x2 - el.x1);
          el.h = Math.abs(el.y2 - el.y1);
          syncSelectedElementToUI(el);
          render();
          return;
        }

        const dx = mouseX - startMouse.x;
        const dy = mouseY - startMouse.y;
        let newX = startBounds.x;
        let newY = startBounds.y;
        let newW = startBounds.w;
        let newH = startBounds.h;

        switch (activeHandleKey) {
          case 'se':
            newW = Math.max(20, startBounds.w + dx);
            newH = Math.max(16, startBounds.h + dy);
            break;
          case 'e':
            newW = Math.max(20, startBounds.w + dx);
            break;
          case 's':
            newH = Math.max(16, startBounds.h + dy);
            break;
          case 'ne':
            newW = Math.max(20, startBounds.w + dx);
            newY = startBounds.y + dy;
            newH = Math.max(16, startBounds.h - dy);
            break;
          case 'n':
            newY = startBounds.y + dy;
            newH = Math.max(16, startBounds.h - dy);
            break;
          case 'nw':
            newX = startBounds.x + dx;
            newY = startBounds.y + dy;
            newW = Math.max(20, startBounds.w - dx);
            newH = Math.max(16, startBounds.h - dy);
            break;
          case 'w':
            newX = startBounds.x + dx;
            newW = Math.max(20, startBounds.w - dx);
            break;
          case 'sw':
            newX = startBounds.x + dx;
            newW = Math.max(20, startBounds.w - dx);
            newH = Math.max(16, startBounds.h + dy);
            break;
        }

        el.w = Math.round(newW);
        el.h = Math.round(newH);
        if (el.type === 'text') {
          el.fontSize = Math.max(10, Math.min(200, Math.round(newH * 0.78)));
        }
        moveElementTo(el, Math.round(newX), Math.round(newY));

        syncSelectedElementToUI(el);
        render();
        return;
      }

      // KHI ĐANG KÉO DI CHUYỂN (DRAGGING - HỖ TRỢ KÉO NHIỀU ĐỐI TƯỢNG CÙNG LÚC)
      if (isDragging && selectedElementIds.length > 0) {
        const dx = mouseX - dragOffsetX;
        const dy = mouseY - dragOffsetY;
        selectedElementIds.forEach(id => {
          const el = elements.find(item => item.id === id);
          const init = dragInitialPositions[id];
          if (el && init) {
            moveElementTo(el, Math.round(init.bx + dx), Math.round(init.by + dy));
          }
        });
        const primaryEl = elements.find(it => it.id === selectedElementId);
        syncSelectedElementToUI(primaryEl);
        render();
        return;
      }

      // THAY ĐỔI CON TRỎ CHUỘT THÔNG MINH KHI RÊ QUA TAY CẦM HOẶC ĐỐI TƯỢNG
      if (selectedElementId) {
        const curEl = elements.find(item => item.id === selectedElementId);
        if (curEl) {
          if (curEl.type === 'line') {
            const hs = 16;
            const isH = Math.abs(curEl.y2 - curEl.y1) < 4;
            const isV = Math.abs(curEl.x2 - curEl.x1) < 4;
            const lineCursor = isH ? 'ew-resize' : (isV ? 'ns-resize' : 'crosshair');
            if (Math.hypot(mouseX - curEl.x1, mouseY - curEl.y1) <= hs ||
                Math.hypot(mouseX - curEl.x2, mouseY - curEl.y2) <= hs) {
              canvas.style.cursor = lineCursor;
              return;
            }
          }
          const b = getElementBounds(curEl);
          const handles = getHandles(b);
          for (const h of handles) {
            if (Math.abs(mouseX - h.x) <= 8 && Math.abs(mouseY - h.y) <= 8) {
              canvas.style.cursor = h.cursor;
              return;
            }
          }
        }
      }

      // Kiểm tra rê chuột qua đối tượng để hiện cursor 'move'
      let hoverEl = null;
      for (let i = elements.length - 1; i >= 0; i--) {
        const b = getElementBounds(elements[i]);
        if (mouseX >= b.x && mouseX <= b.x + b.w && mouseY >= b.y && mouseY <= b.y + b.h) {
          hoverEl = elements[i];
          break;
        }
      }
      canvas.style.cursor = hoverEl ? 'move' : 'default';
    });

    // 3. CHUỘT THẢ RA (MOUSE UP)
    window.addEventListener('mouseup', () => {
      if (isDragging || isResizing) {
        isDragging = false;
        isResizing = false;
        activeHandleKey = null;
        startBounds = null;
        startMouse = null;
        saveHistory();
        render();
      }
    });

    // 4. PHÍM TẮT BARTENDER (MŨI TÊN DỊCH 1MM, DELETE, CTR+Z, CTR+Y, CTR+D)
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

      // Undo: Ctrl+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Ctrl+Y hoặc Ctrl+Shift+Z
      if (((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) ||
          ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z'))) {
        e.preventDefault();
        redo();
        return;
      }

      // Duplicate: Ctrl+D
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        duplicateSelectedElement();
        return;
      }

      if (!selectedElementId) return;
      const el = elements.find(item => item.id === selectedElementId);
      if (!el) return;

      // Xóa: Delete hoặc Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelectedElement();
        return;
      }

      // Dịch chuyển bằng phím mũi tên: Mặc định 1mm, Shift = 5mm
      const stepMm = e.shiftKey ? 5 : 1;
      const stepPx = mmToPx(stepMm);

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const b = getElementBounds(el);
        moveElementTo(el, b.x - stepPx, b.y);
        syncSelectedElementToUI(el);
        render();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const b = getElementBounds(el);
        moveElementTo(el, b.x + stepPx, b.y);
        syncSelectedElementToUI(el);
        render();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const b = getElementBounds(el);
        moveElementTo(el, b.x, b.y - stepPx);
        syncSelectedElementToUI(el);
        render();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const b = getElementBounds(el);
        moveElementTo(el, b.x, b.y + stepPx);
        syncSelectedElementToUI(el);
        render();
      }
    });

    // 5. CÁC NÚT THANH CÔNG CỤ RIBBON (UNDO, REDO, CĂN LỀ, TẢI ẢNH)
    document.getElementById('btn-bartender-undo')?.addEventListener('click', () => undo());
    document.getElementById('btn-bartender-redo')?.addEventListener('click', () => redo());

    // CĂN CHỈNH ĐỐI TƯỢNG (CHUẨN PHẦN MỀM BARTENDER)
    // Gióng hàng giữa các đối tượng (Hỗ trợ Shift+Click chọn 2 mục hoặc căn theo mục gần nhất)
    document.getElementById('btn-align-left-edges')?.addEventListener('click', alignLeftEdges);
    document.getElementById('btn-align-center-h')?.addEventListener('click', alignCenterH);
    document.getElementById('btn-align-right-edges')?.addEventListener('click', alignRightEdges);
    document.getElementById('btn-align-top-edges')?.addEventListener('click', alignTopEdges);
    document.getElementById('btn-align-center-v')?.addEventListener('click', alignCenterV);
    document.getElementById('btn-align-bottom-edges')?.addEventListener('click', alignBottomEdges);
    document.getElementById('btn-make-same-width')?.addEventListener('click', makeSameWidth);
    document.getElementById('btn-make-same-height')?.addEventListener('click', makeSameHeight);

    // Căn theo khổ con tem
    document.getElementById('btn-align-label-left')?.addEventListener('click', () => alignToLabel('left'));
    document.querySelectorAll('#btn-align-label-center, #inspector-btn-center, #btn-align-center-label, .btn-action-center-element').forEach(btn => {
      btn.addEventListener('click', () => alignToLabel('center'));
    });
    document.getElementById('btn-align-label-right')?.addEventListener('click', () => alignToLabel('right'));

    // 6. CĂN LỀ CHỮ (TEXT ALIGNMENT): TRÁI, GIỮA, PHẢI (CẢ TRÊN RIBBON VÀ INSPECTOR)
    document.querySelectorAll('#btn-text-align-left, #btn-insp-align-left').forEach(btn => {
      btn.addEventListener('click', () => {
        const el = elements.find(item => item.id === selectedElementId);
        if (el) setTextAlign(el, 'left');
      });
    });

    document.querySelectorAll('#btn-text-align-center, #btn-insp-align-center').forEach(btn => {
      btn.addEventListener('click', () => {
        const el = elements.find(item => item.id === selectedElementId);
        if (el) setTextAlign(el, 'center');
      });
    });

    document.querySelectorAll('#btn-text-align-right, #btn-insp-align-right').forEach(btn => {
      btn.addEventListener('click', () => {
        const el = elements.find(item => item.id === selectedElementId);
        if (el) setTextAlign(el, 'right');
      });
    });

    // Nhân bản đối tượng (Duplicate)
    const duplicateSelectedElement = () => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el) {
        const copy = JSON.parse(JSON.stringify(el));
        copy.id = el.type + '_' + Date.now();
        if (copy.type === 'line') { copy.y1 += 30; copy.y2 += 30; }
        else if (copy.type === 'rect') { copy.x += 25; copy.y += 25; }
        else { copy.x += 20; copy.y += 30; }
        if (el.img) copy.img = el.img;
        elements.push(copy);
        selectedElementId = copy.id;
        saveHistory();
        syncSelectedElementToUI(copy);
        render();
      }
    };
    document.querySelectorAll('.btn-action-duplicate-element, #btn-duplicate-element, #inspector-btn-duplicate').forEach(btn => {
      btn.addEventListener('click', duplicateSelectedElement);
    });

    // Xóa đối tượng (Delete)
    const deleteSelectedElement = () => {
      if (!selectedElementId) return;
      elements = elements.filter(item => item.id !== selectedElementId);
      selectedElementId = null;
      saveHistory();
      syncSelectedElementToUI(null);
      render();
    };
    document.querySelectorAll('#btn-delete-element, #btn-designer-delete').forEach(btn => {
      btn.addEventListener('click', deleteSelectedElement);
    });

    // Xuất file PNG / Mở Modal tùy chọn kích thước
    document.getElementById('btn-download-designer-png')?.addEventListener('click', () => {
      if (typeof window.openCustomExportModal === 'function') {
        window.openCustomExportModal('designer');
      } else {
        exportCustomLabelImage({ width: 800, height: 800, format: 'png', bgOption: 'white' });
      }
    });

    // 6. THÊM CÁC ĐỐI TƯỢNG TỪ TOOLBOX (TEXT, BARCODE, QR, BOX, LINE, LOGO)
    document.querySelectorAll('.btn-action-add-text').forEach(btn => {
      btn.addEventListener('click', () => {
        const newEl = {
          id: 'text_' + Date.now(),
          type: 'text',
          text: 'Tên Sản Phẩm',
          x: Math.round(canvasWidth / 2),
          y: Math.round(canvasHeight / 2),
          fontSize: 44,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 'bold',
          align: 'center',
          color: '#0f172a'
        };
        elements.push(newEl);
        selectedElementId = newEl.id;
        saveHistory();
        syncSelectedElementToUI(newEl);
        render();
      });
    });

    document.querySelectorAll('.btn-action-add-barcode').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = '893850' + Math.floor(100000 + Math.random() * 900000);
        const format = 'CODE128';
        const img = generateBarcodeImage(code, format, true, '#000000');
        const newEl = {
          id: 'barcode_' + Date.now(),
          type: 'barcode',
          text: code,
          format: format,
          displayValue: true,
          color: '#000000',
          img: img,
          x: Math.round(canvasWidth / 2),
          y: Math.round(canvasHeight / 2),
          w: Math.min(Math.round(canvasWidth * 0.7), 360),
          h: Math.min(Math.round(canvasHeight * 0.3), 100)
        };
        elements.push(newEl);
        selectedElementId = newEl.id;
        saveHistory();
        syncSelectedElementToUI(newEl);
        render();
      });
    });

    document.querySelectorAll('.btn-action-add-qrcode').forEach(btn => {
      btn.addEventListener('click', () => {
        const qrText = 'https://hacode.vn';
        const img = generateQRCodeImage(qrText, 'qrcode', '#000000', 'white');
        const newEl = {
          id: 'qrcode_' + Date.now(),
          type: 'qrcode',
          text: qrText,
          format: 'qrcode',
          color: '#000000',
          bgType: 'white',
          img: img,
          x: Math.round(canvasWidth / 2),
          y: Math.round(canvasHeight / 2),
          w: 130,
          h: 130
        };
        elements.push(newEl);
        selectedElementId = newEl.id;
        saveHistory();
        syncSelectedElementToUI(newEl);
        render();
      });
    });

    document.querySelectorAll('.btn-action-add-box').forEach(btn => {
      btn.addEventListener('click', () => {
        const newEl = {
          id: 'box_' + Date.now(),
          type: 'rect',
          x: Math.round(canvasWidth / 2 - 140),
          y: Math.round(canvasHeight / 2 - 28),
          w: 280,
          h: 56,
          radius: 4,
          stroke: '#0f172a',
          lineWidth: 3.5,
          fill: 'transparent'
        };
        elements.push(newEl);
        selectedElementId = newEl.id;
        saveHistory();
        syncSelectedElementToUI(newEl);
        render();
      });
    });

    document.querySelectorAll('.btn-action-add-line').forEach(btn => {
      btn.addEventListener('click', () => {
        const newEl = {
          id: 'line_' + Date.now(),
          type: 'line',
          x1: 40,
          y1: Math.round(canvasHeight / 2),
          x2: canvasWidth - 40,
          y2: Math.round(canvasHeight / 2),
          color: '#0f172a',
          lineWidth: 3.0
        };
        elements.push(newEl);
        selectedElementId = newEl.id;
        selectedElementIds = [newEl.id];
        saveHistory();
        syncSelectedElementToUI(newEl);
        render();
      });
    });

    document.querySelectorAll('.btn-action-add-line-vertical').forEach(btn => {
      btn.addEventListener('click', () => {
        const newEl = {
          id: 'line_' + Date.now(),
          type: 'line',
          x1: Math.round(canvasWidth / 2),
          y1: 40,
          x2: Math.round(canvasWidth / 2),
          y2: canvasHeight - 40,
          color: '#0f172a',
          lineWidth: 3.0
        };
        elements.push(newEl);
        selectedElementId = newEl.id;
        selectedElementIds = [newEl.id];
        saveHistory();
        syncSelectedElementToUI(newEl);
        render();
      });
    });

    // Upload Logo
    document.getElementById('input-upload-logo-designer')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        uploadedLogoImg = new Image();
        uploadedLogoImg.onload = () => {
          const aspect = (uploadedLogoImg.width || 100) / (uploadedLogoImg.height || 100);
          const logoH = Math.min(Math.round(canvasHeight * 0.25), 100);
          const logoW = Math.round(logoH * aspect);
          const newEl = {
            id: 'logo_' + Date.now(),
            type: 'image',
            img: uploadedLogoImg,
            x: Math.round(canvasWidth / 2),
            y: Math.round(canvasHeight * 0.25),
            w: logoW,
            h: logoH
          };
          elements.push(newEl);
          selectedElementId = newEl.id;
          saveHistory();
          syncSelectedElementToUI(newEl);
          render();
        };
        uploadedLogoImg.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });

    // Thêm Biểu Tượng Ngành In & Bao Bì (1-Click)
    document.querySelectorAll('.btn-add-packaging-icon').forEach(btn => {
      btn.addEventListener('click', () => {
        const iconKey = btn.dataset.icon || 'fragile';
        const iconName = btn.dataset.name || 'Biểu tượng';
        const size = Math.min(Math.round(canvasWidth * 0.18), 75);
        const newEl = {
          id: 'icon_' + Date.now(),
          type: 'icon',
          iconKey: iconKey,
          name: iconName,
          color: '#0f172a',
          x: Math.round(canvasWidth / 2),
          y: Math.round(canvasHeight / 2),
          w: size,
          h: size
        };
        elements.push(newEl);
        selectedElementId = newEl.id;
        saveHistory();
        syncSelectedElementToUI(newEl);
        render();
      });
    });

    // 7. THÊM NHANH CẶP Ô IN SẴN (QUICK FIELD CHIPS)
    document.querySelectorAll('.btn-quick-field').forEach(btn => {
      btn.addEventListener('click', () => {
        const labelName = btn.dataset.label || 'Mục';
        const cw = canvasWidth;
        const ch = canvasHeight;

        // Tìm vị trí Y phù hợp bên dưới các mục hiện có
        let nextY = Math.round(ch * 0.2);
        elements.forEach(item => {
          const b = getElementBounds(item);
          if (b.y + b.h + 15 > nextY) nextY = b.y + b.h + 15;
        });
        if (nextY > ch - 60) nextY = Math.round(ch * 0.35);

        const textEl = {
          id: 'text_' + Date.now(),
          type: 'text',
          text: labelName + ':',
          x: Math.round(cw * 0.15),
          y: nextY,
          fontSize: 38,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 'bold',
          color: '#0f172a',
          align: 'left'
        };

        const boxEl = {
          id: 'box_' + (Date.now() + 1),
          type: 'rect',
          x: Math.round(cw * 0.38),
          y: Math.round(nextY - 22),
          w: Math.round(cw * 0.52),
          h: 46,
          radius: 4,
          stroke: '#0f172a',
          lineWidth: 3.5,
          fill: 'transparent'
        };

        elements.push(textEl, boxEl);
        selectedElementId = textEl.id;
        saveHistory();
        syncSelectedElementToUI(textEl);
        render();
      });
    });

    // 8. ĐỒNG BỘ 2 CHIỀU TỪ BẢNG THUỘC TÍNH (INSPECTOR)
    const inpPosX = document.getElementById('inspector-pos-x');
    const inpPosY = document.getElementById('inspector-pos-y');
    const inpSizeW = document.getElementById('inspector-size-w');
    const inpSizeH = document.getElementById('inspector-size-h');
    const editText = document.getElementById('edit-element-text');
    const inpFontFamily = document.getElementById('inspector-font-family');
    const ribbonFontFamily = document.getElementById('ribbon-font-family');
    const inpFontSize = document.getElementById('inspector-font-size');
    const ribbonFontSize = document.getElementById('edit-element-size');
    const btnFontInc = document.getElementById('btn-font-inc');
    const btnFontDec = document.getElementById('btn-font-dec');
    const btnBold = document.getElementById('btn-toggle-bold');
    const btnItalic = document.getElementById('btn-toggle-italic');
    const editAlign = document.getElementById('edit-element-align');
    const inpTextColor = document.getElementById('inspector-text-color');
    const inpTextColorHex = document.getElementById('inspector-text-color-hex');
    const inpBorderWidth = document.getElementById('inspector-border-width');
    const inpBorderRadius = document.getElementById('inspector-border-radius');
    const inpBorderColor = document.getElementById('inspector-border-color');
    const inpBorderColorHex = document.getElementById('inspector-border-color-hex');

    // Thay đổi tọa độ X (mm)
    inpPosX?.addEventListener('input', (e) => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el) {
        const valMm = parseFloat(e.target.value) || 0;
        const valPx = mmToPx(valMm);
        if (el.type === 'rect') el.x = valPx;
        else if (el.type === 'line') {
          const minX = Math.min(el.x1, el.x2);
          const shift = valPx - minX;
          el.x1 += shift;
          el.x2 += shift;
        }
        else el.x = valPx + (el.w || 60) / 2;
        render();
      }
    });

    // Thay đổi tọa độ Y (mm)
    inpPosY?.addEventListener('input', (e) => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el) {
        const valMm = parseFloat(e.target.value) || 0;
        const valPx = mmToPx(valMm, true);
        if (el.type === 'rect') el.y = valPx;
        else if (el.type === 'line') {
          const minY = Math.min(el.y1, el.y2);
          const shift = valPx - minY;
          el.y1 += shift;
          el.y2 += shift;
        }
        else el.y = valPx + (el.h || 30) / 2;
        render();
      }
    });

    // Thay đổi chiều rộng W (mm)
    inpSizeW?.addEventListener('input', (e) => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el) {
        const valMm = Math.max(1, parseFloat(e.target.value) || 1);
        const valPx = mmToPx(valMm);
        if (el.type === 'line') {
          const isV = Math.abs(el.x2 - el.x1) < 4;
          if (!isV) {
            const minX = Math.min(el.x1, el.x2);
            if (el.x2 >= el.x1) el.x2 = minX + valPx;
            else el.x1 = minX + valPx;
            el.w = valPx;
          }
        } else {
          el.w = valPx;
        }
        render();
      }
    });

    // Thay đổi chiều cao H (mm)
    inpSizeH?.addEventListener('input', (e) => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el) {
        const valMm = Math.max(1, parseFloat(e.target.value) || 1);
        const valPx = mmToPx(valMm, true);
        if (el.type === 'line') {
          const isV = Math.abs(el.x2 - el.x1) < 4;
          if (isV) {
            const minY = Math.min(el.y1, el.y2);
            if (el.y2 >= el.y1) el.y2 = minY + valPx;
            else el.y1 = minY + valPx;
            el.h = valPx;
          }
        } else {
          el.h = valPx;
          if (el.type === 'text') el.fontSize = Math.round(valPx * 0.78);
        }
        render();
      }
    });

    // Nhập nội dung văn bản / mã vạch / QR
    editText?.addEventListener('input', (e) => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el) {
        el.text = e.target.value;
        if (el.type === 'barcode') el.img = generateBarcodeImage(el.text, el.format, el.displayValue !== false, el.color || '#000000');
        if (el.type === 'qrcode') el.img = generateQRCodeImage(el.text);
        if (el.type === 'text') {
          // Đo lại chiều rộng
          ctx.save();
          ctx.font = `${el.fontWeight === 'bold' ? 'bold' : 'normal'} ${el.fontSize || 36}px ${el.fontFamily || "'Plus Jakarta Sans', sans-serif"}`;
          el.w = Math.ceil(ctx.measureText(el.text || ' ').width) + 16;
          ctx.restore();
        }
        render();
      }
    });

    // Thay đổi Phông chữ (đồng bộ cả Ribbon & Inspector)
    const updateFontFamily = (val) => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el && el.type === 'text') {
        el.fontFamily = val;
        if (inpFontFamily) inpFontFamily.value = val;
        if (ribbonFontFamily) ribbonFontFamily.value = val;
        render();
      }
    };
    inpFontFamily?.addEventListener('change', (e) => updateFontFamily(e.target.value));
    ribbonFontFamily?.addEventListener('change', (e) => updateFontFamily(e.target.value));

    // Thay đổi Cỡ chữ
    const updateFontSize = (val) => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el && el.type === 'text') {
        el.fontSize = Math.max(8, Math.min(200, parseInt(val) || 36));
        el.h = Math.round(el.fontSize * 1.3);
        if (inpFontSize) inpFontSize.value = el.fontSize;
        if (ribbonFontSize) ribbonFontSize.value = el.fontSize;
        render();
      }
    };
    inpFontSize?.addEventListener('input', (e) => updateFontSize(e.target.value));
    ribbonFontSize?.addEventListener('input', (e) => updateFontSize(e.target.value));

    btnFontInc?.addEventListener('click', () => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el && el.type === 'text') updateFontSize((el.fontSize || 44) + 2);
    });

    btnFontDec?.addEventListener('click', () => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el && el.type === 'text') updateFontSize((el.fontSize || 44) - 2);
    });

    // In đậm (Bold)
    btnBold?.addEventListener('click', () => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el && el.type === 'text') {
        el.fontWeight = el.fontWeight === 'bold' ? 'normal' : 'bold';
        btnBold.classList.toggle('bg-blue-600', el.fontWeight === 'bold');
        btnBold.classList.toggle('text-white', el.fontWeight === 'bold');
        render();
      }
    });

    // In nghiêng (Italic)
    btnItalic?.addEventListener('click', () => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el && el.type === 'text') {
        el.fontStyle = el.fontStyle === 'italic' ? 'normal' : 'italic';
        btnItalic.classList.toggle('bg-blue-600', el.fontStyle === 'italic');
        btnItalic.classList.toggle('text-white', el.fontStyle === 'italic');
        render();
      }
    });

    // Căn lề
    editAlign?.addEventListener('change', (e) => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el && el.type === 'text') {
        el.align = e.target.value;
        render();
      }
    });

    // Màu chữ
    inpTextColor?.addEventListener('input', (e) => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el && el.type === 'text') {
        el.color = e.target.value;
        if (inpTextColorHex) inpTextColorHex.value = e.target.value.toUpperCase();
        render();
      }
    });
    inpTextColorHex?.addEventListener('input', (e) => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el && el.type === 'text' && e.target.value.startsWith('#')) {
        el.color = e.target.value;
        if (inpTextColor) inpTextColor.value = e.target.value;
        render();
      }
    });

    // Khung ô: Độ dày viền
    inpBorderWidth?.addEventListener('input', (e) => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el && el.type === 'rect') {
        el.lineWidth = parseFloat(e.target.value) || 1;
        render();
      }
    });

    // Khung ô: Bo góc
    inpBorderRadius?.addEventListener('input', (e) => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el && el.type === 'rect') {
        el.radius = parseInt(e.target.value) || 0;
        render();
      }
    });

    // Khung ô: Màu viền
    inpBorderColor?.addEventListener('input', (e) => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el && el.type === 'rect') {
        el.stroke = e.target.value;
        if (inpBorderColorHex) inpBorderColorHex.value = e.target.value.toUpperCase();
        render();
      }
    });
    inpBorderColorHex?.addEventListener('input', (e) => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el && el.type === 'rect' && e.target.value.startsWith('#')) {
        el.stroke = e.target.value;
        if (inpBorderColor) inpBorderColor.value = e.target.value;
        render();
      }
    });

    // ===== THUỘC TÍNH ĐƯỜNG KẺ (LINE) =====
    const btnLineOrientH = document.getElementById('btn-line-orient-horizontal');
    const btnLineOrientV = document.getElementById('btn-line-orient-vertical');
    const btnLineRotate90 = document.getElementById('btn-line-rotate-90');
    const inpLineLength = document.getElementById('inspector-line-length');
    const inpLineThickness = document.getElementById('inspector-line-width');
    const selLineStyle = document.getElementById('inspector-line-style');
    const inpLineColor = document.getElementById('inspector-line-color');
    const inpLineColorHex = document.getElementById('inspector-line-color-hex');

    // Chuyển sang nằm ngang
    btnLineOrientH?.addEventListener('click', () => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el && el.type === 'line') {
        const cx = Math.min(canvasWidth - 30, Math.max(30, (el.x1 + el.x2) / 2));
        const cy = Math.min(canvasHeight - 30, Math.max(30, (el.y1 + el.y2) / 2));
        const maxLen = canvasWidth - 60;
        const curLen = Math.hypot(el.x2 - el.x1, el.y2 - el.y1) || 100;
        const len = Math.min(curLen, maxLen);
        el.x1 = Math.round(cx - len / 2);
        el.x2 = Math.round(cx + len / 2);
        el.y1 = Math.round(cy);
        el.y2 = Math.round(cy);
        el.w = Math.abs(el.x2 - el.x1);
        el.h = 0;
        saveHistory();
        syncSelectedElementToUI(el);
        render();
      }
    });

    // Chuyển sang dựng đứng (dọc)
    btnLineOrientV?.addEventListener('click', () => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el && el.type === 'line') {
        const cx = Math.min(canvasWidth - 30, Math.max(30, (el.x1 + el.x2) / 2));
        const cy = Math.min(canvasHeight - 30, Math.max(30, (el.y1 + el.y2) / 2));
        const maxLen = canvasHeight - 60;
        const curLen = Math.hypot(el.x2 - el.x1, el.y2 - el.y1) || 100;
        const len = Math.min(curLen, maxLen);
        el.x1 = Math.round(cx);
        el.x2 = Math.round(cx);
        el.y1 = Math.round(cy - len / 2);
        el.y2 = Math.round(cy + len / 2);
        el.w = 0;
        el.h = Math.abs(el.y2 - el.y1);
        saveHistory();
        syncSelectedElementToUI(el);
        render();
      }
    });

    // Xoay 90 độ quanh tâm
    btnLineRotate90?.addEventListener('click', () => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el && el.type === 'line') {
        const cx = Math.min(canvasWidth - 30, Math.max(30, (el.x1 + el.x2) / 2));
        const cy = Math.min(canvasHeight - 30, Math.max(30, (el.y1 + el.y2) / 2));
        const isV = Math.abs(el.x2 - el.x1) < 4;
        const curLen = Math.hypot(el.x2 - el.x1, el.y2 - el.y1) || 100;
        if (isV) {
          const maxLen = canvasWidth - 60;
          const len = Math.min(curLen, maxLen);
          el.x1 = Math.round(cx - len / 2);
          el.x2 = Math.round(cx + len / 2);
          el.y1 = Math.round(cy);
          el.y2 = Math.round(cy);
        } else {
          const maxLen = canvasHeight - 60;
          const len = Math.min(curLen, maxLen);
          el.x1 = Math.round(cx);
          el.x2 = Math.round(cx);
          el.y1 = Math.round(cy - len / 2);
          el.y2 = Math.round(cy + len / 2);
        }
        el.w = Math.abs(el.x2 - el.x1);
        el.h = Math.abs(el.y2 - el.y1);
        saveHistory();
        syncSelectedElementToUI(el);
        render();
      }
    });

    // Chiều dài đường kẻ (mm)
    inpLineLength?.addEventListener('input', (e) => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el && el.type === 'line') {
        const valMm = Math.max(1, parseFloat(e.target.value) || 1);
        const isV = Math.abs(el.x2 - el.x1) < 4;
        const valPx = mmToPx(valMm, isV);
        const cx = (el.x1 + el.x2) / 2;
        const cy = (el.y1 + el.y2) / 2;
        if (isV) {
          el.x1 = Math.round(cx);
          el.x2 = Math.round(cx);
          el.y1 = Math.round(cy - valPx / 2);
          el.y2 = Math.round(cy + valPx / 2);
        } else {
          el.y1 = Math.round(cy);
          el.y2 = Math.round(cy);
          el.x1 = Math.round(cx - valPx / 2);
          el.x2 = Math.round(cx + valPx / 2);
        }
        el.w = Math.abs(el.x2 - el.x1);
        el.h = Math.abs(el.y2 - el.y1);
        render();
      }
    });
    inpLineLength?.addEventListener('change', () => saveHistory());

    // Độ dày nét vẽ (px)
    inpLineThickness?.addEventListener('input', (e) => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el && el.type === 'line') {
        el.lineWidth = Math.max(0.5, parseFloat(e.target.value) || 1);
        render();
      }
    });
    inpLineThickness?.addEventListener('change', () => saveHistory());

    // Kiểu nét vẽ (solid, dashed, dotted)
    selLineStyle?.addEventListener('change', (e) => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el && el.type === 'line') {
        const style = e.target.value;
        if (style === 'dashed') el.dash = [8, 5];
        else if (style === 'dotted') el.dash = [3, 4];
        else el.dash = null;
        saveHistory();
        render();
      }
    });

    // Màu nét kẻ
    inpLineColor?.addEventListener('input', (e) => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el && el.type === 'line') {
        el.color = e.target.value;
        if (inpLineColorHex) inpLineColorHex.value = e.target.value.toUpperCase();
        render();
      }
    });
    inpLineColor?.addEventListener('change', () => saveHistory());

    inpLineColorHex?.addEventListener('input', (e) => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el && el.type === 'line' && e.target.value.startsWith('#')) {
        el.color = e.target.value;
        if (inpLineColor) inpLineColor.value = e.target.value;
        render();
      }
    });
    inpLineColorHex?.addEventListener('change', () => saveHistory());

    // Cài đặt Loại Mã Vạch 1D (Symbology)
    const selBcFormat = document.getElementById('inspector-barcode-format');
    selBcFormat?.addEventListener('change', (e) => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el && el.type === 'barcode') {
        el.format = e.target.value;
        const fmt = String(el.format).toLowerCase();
        if (fmt === 'ean13' && (!/^\d{12,13}$/.test(el.text))) {
          el.text = '893850194284';
          if (editText) editText.value = el.text;
        } else if (fmt === 'ean8' && (!/^\d{7,8}$/.test(el.text))) {
          el.text = '8938501';
          if (editText) editText.value = el.text;
        } else if ((fmt === 'upca' || fmt === 'upc') && (!/^\d{11,12}$/.test(el.text))) {
          el.text = '01234567890';
          if (editText) editText.value = el.text;
        } else if (fmt === 'itf14' && (!/^\d{13,14}$/.test(el.text))) {
          el.text = '1893850194284';
          if (editText) editText.value = el.text;
        }
        el.img = generateBarcodeImage(el.text, el.format, el.displayValue !== false, el.color || '#000000');
        saveHistory();
        syncSelectedElementToUI(el);
        render();
      }
    });

    // Ẩn / Hiện chữ số dưới mã vạch 1D
    const checkBcShowText = document.getElementById('inspector-barcode-show-text');
    checkBcShowText?.addEventListener('change', (e) => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el && el.type === 'barcode') {
        el.displayValue = e.target.checked;
        const textSettingsBox = document.getElementById('inspector-barcode-text-settings');
        if (textSettingsBox) textSettingsBox.classList.toggle('hidden', !el.displayValue);
        saveHistory();
        render();
      }
    });

    // 1. Khoảng cách số tới vạch (Xa / Gần vạch)
    const inpBcTextDist = document.getElementById('inspector-barcode-text-dist');
    const inpBcTextDistNum = document.getElementById('inspector-barcode-text-dist-num');
    const valBcTextDist = document.getElementById('val-barcode-text-dist');
    const updateBcTextDist = (val) => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el && el.type === 'barcode') {
        const num = parseFloat(val);
        el.textDistance = isNaN(num) ? 1.5 : num;
        if (inpBcTextDist) inpBcTextDist.value = el.textDistance;
        if (inpBcTextDistNum) inpBcTextDistNum.value = el.textDistance;
        if (valBcTextDist) valBcTextDist.textContent = `${el.textDistance} mm`;
        render();
      }
    };
    inpBcTextDist?.addEventListener('input', (e) => {
      updateBcTextDist(e.target.value);
      saveHistory();
    });
    inpBcTextDistNum?.addEventListener('input', (e) => {
      updateBcTextDist(e.target.value);
      saveHistory();
    });

    // 2. Dịch chuyển ngang (Trái / Phải)
    const inpBcTextXOffset = document.getElementById('inspector-barcode-text-xoffset');
    const inpBcTextXOffsetNum = document.getElementById('inspector-barcode-text-xoffset-num');
    const valBcTextXOffset = document.getElementById('val-barcode-text-xoffset');
    const updateBcTextXOffset = (val) => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el && el.type === 'barcode') {
        const num = parseFloat(val);
        el.textXOffset = isNaN(num) ? 0 : num;
        if (inpBcTextXOffset) inpBcTextXOffset.value = el.textXOffset;
        if (inpBcTextXOffsetNum) inpBcTextXOffsetNum.value = el.textXOffset;
        if (valBcTextXOffset) valBcTextXOffset.textContent = `${el.textXOffset} mm`;
        render();
      }
    };
    inpBcTextXOffset?.addEventListener('input', (e) => {
      updateBcTextXOffset(e.target.value);
      saveHistory();
    });
    inpBcTextXOffsetNum?.addEventListener('input', (e) => {
      updateBcTextXOffset(e.target.value);
      saveHistory();
    });

    // 3. Cỡ chữ số
    const inpBcTextSize = document.getElementById('inspector-barcode-text-size');
    inpBcTextSize?.addEventListener('input', (e) => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el && el.type === 'barcode') {
        const sz = parseFloat(e.target.value);
        el.textSize = isNaN(sz) || sz <= 0 ? null : sz;
        saveHistory();
        render();
      }
    });

    // 4. Kiểu font chữ số
    const selBcFontFamily = document.getElementById('inspector-barcode-font-family');
    selBcFontFamily?.addEventListener('change', (e) => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el && el.type === 'barcode') {
        el.fontFamily = e.target.value;
        saveHistory();
        render();
      }
    });

    // 5. Căn lề số (Trái / Giữa / Phải)
    const setBcAlign = (align) => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el && el.type === 'barcode') {
        el.textAlign = align;
        ['left', 'center', 'right'].forEach(a => {
          const btn = document.getElementById(`btn-barcode-align-${a}`);
          if (btn) {
            btn.classList.toggle('bg-blue-600', a === align);
            btn.classList.toggle('text-white', a === align);
            btn.classList.toggle('text-slate-400', a !== align);
          }
        });
        saveHistory();
        render();
      }
    };
    document.getElementById('btn-barcode-align-left')?.addEventListener('click', () => setBcAlign('left'));
    document.getElementById('btn-barcode-align-center')?.addEventListener('click', () => setBcAlign('center'));
    document.getElementById('btn-barcode-align-right')?.addEventListener('click', () => setBcAlign('right'));

    // 6. In đậm số
    document.getElementById('btn-barcode-text-bold')?.addEventListener('click', () => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el && el.type === 'barcode') {
        el.textBold = el.textBold === false ? true : false;
        const btnBold = document.getElementById('btn-barcode-text-bold');
        if (btnBold) {
          btnBold.classList.toggle('bg-blue-600', el.textBold);
          btnBold.classList.toggle('text-white', el.textBold);
          btnBold.classList.toggle('bg-slate-800', !el.textBold);
          btnBold.classList.toggle('text-slate-400', !el.textBold);
        }
        saveHistory();
        render();
      }
    });

    // Màu nét vạch 1D
    const inpBcColor = document.getElementById('inspector-barcode-color');
    const inpBcColorHex = document.getElementById('inspector-barcode-color-hex');
    const updateBcColor = (val) => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el && el.type === 'barcode') {
        el.color = val;
        if (inpBcColor) inpBcColor.value = val;
        if (inpBcColorHex) inpBcColorHex.value = val.toUpperCase();
        el.img = generateBarcodeImage(el.text, el.format || 'code128', el.displayValue !== false, el.color);
        render();
      }
    };
    inpBcColor?.addEventListener('input', (e) => updateBcColor(e.target.value));
    inpBcColorHex?.addEventListener('input', (e) => {
      const v = e.target.value.startsWith('#') ? e.target.value : '#' + e.target.value;
      if (/^#[0-9A-Fa-f]{6}$/.test(v)) updateBcColor(v);
    });

    // Cài đặt Loại Mã 2D / Ma Trận / QR Code
    const selQrFormat = document.getElementById('inspector-qrcode-format');
    selQrFormat?.addEventListener('change', (e) => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el && el.type === 'qrcode') {
        el.format = e.target.value;
        el.img = generateQRCodeImage(el.text, el.format, el.color || '#000000', el.bgType || 'white');
        saveHistory();
        syncSelectedElementToUI(el);
        render();
      }
    });

    // Màu mã 2D / QR Code
    const inpQrColor = document.getElementById('inspector-qrcode-color');
    const inpQrColorHex = document.getElementById('inspector-qrcode-color-hex');
    const updateQrColor = (val) => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el && el.type === 'qrcode') {
        el.color = val;
        if (inpQrColor) inpQrColor.value = val;
        if (inpQrColorHex) inpQrColorHex.value = val.toUpperCase();
        el.img = generateQRCodeImage(el.text, el.format || 'qrcode', el.color, el.bgType || 'white');
        render();
      }
    };
    inpQrColor?.addEventListener('input', (e) => updateQrColor(e.target.value));
    inpQrColorHex?.addEventListener('input', (e) => {
      const v = e.target.value.startsWith('#') ? e.target.value : '#' + e.target.value;
      if (/^#[0-9A-Fa-f]{6}$/.test(v)) updateQrColor(v);
    });

    // Nền mã 2D (White / Transparent)
    const selQrBgType = document.getElementById('inspector-qrcode-bg-type');
    selQrBgType?.addEventListener('change', (e) => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el && el.type === 'qrcode') {
        el.bgType = e.target.value;
        el.img = generateQRCodeImage(el.text, el.format || 'qrcode', el.color || '#000000', el.bgType);
        saveHistory();
        render();
      }
    });

    // Màu biểu tượng in ấn & bao bì
    const inpIcnColor = document.getElementById('inspector-icon-color');
    const inpIcnColorHex = document.getElementById('inspector-icon-color-hex');
    const updateIcnColor = (val) => {
      const el = elements.find(item => item.id === selectedElementId);
      if (el && el.type === 'icon') {
        el.color = val;
        if (inpIcnColor) inpIcnColor.value = val;
        if (inpIcnColorHex) inpIcnColorHex.value = val.toUpperCase();
        render();
      }
    };
    inpIcnColor?.addEventListener('input', (e) => updateIcnColor(e.target.value));
    inpIcnColorHex?.addEventListener('input', (e) => {
      const v = e.target.value.startsWith('#') ? e.target.value : '#' + e.target.value;
      if (/^#[0-9A-Fa-f]{6}$/.test(v)) updateIcnColor(v);
    });

    // Khởi tạo Modal Thư Viện Biểu Tượng BarTender
    initBartenderSymbolsModal();
    // Khởi tạo Modal Thư Viện Các Loại Mã Vạch Trực Quan (Kèm Hình Ảnh Mẫu)
    initVisualBarcodeModal();

    // 9. NÚT HOÀN TẤT & XEM 3D
    document.getElementById('btn-designer-finish-to-3d')?.addEventListener('click', () => {
      render();
      if (window.switchMainView) {
        window.switchMainView('view-3d');
      }
    });
  }

  /**
   * QUẢN LÝ MODAL THƯ VIỆN 60+ BIỂU TƯỢNG CHUẨN PHẦN MỀM BARTENDER
   */
  function initBartenderSymbolsModal() {
    const modal = document.getElementById('modal-bartender-symbols');
    const grid = document.getElementById('bartender-symbols-modal-grid');
    const emptyState = document.getElementById('bartender-symbols-empty');
    const searchInput = document.getElementById('symbol-search-input');
    const catPills = document.querySelectorAll('#symbol-category-pills .symbol-cat-btn');
    const btnOpen = document.getElementById('btn-open-bartender-symbols');
    const btnClose = document.getElementById('btn-close-bartender-symbols');
    const btnCloseFt = document.getElementById('btn-close-bartender-symbols-ft');
    const btnChangeInsp = document.getElementById('inspector-btn-change-icon');

    if (!modal || !grid) return;

    let activeCat = 'all';
    let searchQuery = '';
    let isReplacingCurrentIcon = false;

    function renderModalSymbols() {
      grid.innerHTML = '';
      const query = searchQuery.trim().toLowerCase();
      let matchCount = 0;

      Object.entries(BARTENDER_SYMBOLS).forEach(([key, sym]) => {
        if (activeCat !== 'all' && sym.cat !== activeCat) return;

        if (query) {
          const matchName = (sym.name || '').toLowerCase().includes(query);
          const matchCode = (sym.code || '').toLowerCase().includes(query);
          const matchKey = key.toLowerCase().includes(query);
          if (!matchName && !matchCode && !matchKey) return;
        }

        matchCount++;
        const card = document.createElement('div');
        card.className = 'bartender-symbol-card';
        card.title = `${sym.name} [${sym.code || 'ISO'}] - Bấm để chèn`;

        const svgContent = sym.svg('#38bdf8');
        card.innerHTML = `
          <div class="symbol-svg-wrapper">${svgContent}</div>
          <div class="w-full">
            <p class="text-[11px] font-semibold text-slate-200 truncate leading-tight mb-1">${sym.name.split('(')[0].trim()}</p>
            <span class="text-[9px] bg-slate-800 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold">${sym.code || 'ISO'}</span>
          </div>
        `;

        card.addEventListener('click', () => {
          if (isReplacingCurrentIcon) {
            const el = elements.find(item => item.id === selectedElementId);
            if (el && el.type === 'icon') {
              el.iconKey = key;
              el.name = sym.name;
              saveHistory();
              syncSelectedElementToUI(el);
              render();
            }
          } else {
            const size = Math.min(Math.round(canvasWidth * 0.18), 75);
            const newEl = {
              id: 'icon_' + Date.now(),
              type: 'icon',
              iconKey: key,
              name: sym.name,
              color: '#0f172a',
              x: Math.round(canvasWidth / 2),
              y: Math.round(canvasHeight / 2),
              w: size,
              h: size
            };
            elements.push(newEl);
            selectedElementId = newEl.id;
            saveHistory();
            syncSelectedElementToUI(newEl);
            render();
          }
          modal.classList.add('hidden');
        });

        grid.appendChild(card);
      });

      if (emptyState) {
        emptyState.classList.toggle('hidden', matchCount > 0);
      }
    }

    btnOpen?.addEventListener('click', () => {
      isReplacingCurrentIcon = false;
      activeCat = 'all';
      searchQuery = '';
      if (searchInput) searchInput.value = '';
      catPills.forEach(p => p.classList.toggle('active', p.dataset.cat === 'all'));
      renderModalSymbols();
      modal.classList.remove('hidden');
      searchInput?.focus();
    });

    btnChangeInsp?.addEventListener('click', () => {
      isReplacingCurrentIcon = true;
      activeCat = 'all';
      searchQuery = '';
      if (searchInput) searchInput.value = '';
      catPills.forEach(p => p.classList.toggle('active', p.dataset.cat === 'all'));
      renderModalSymbols();
      modal.classList.remove('hidden');
      searchInput?.focus();
    });

    const closeModal = () => modal.classList.add('hidden');
    btnClose?.addEventListener('click', closeModal);
    btnCloseFt?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    catPills.forEach(pill => {
      pill.addEventListener('click', () => {
        catPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeCat = pill.dataset.cat || 'all';
        renderModalSymbols();
      });
    });

    searchInput?.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderModalSymbols();
    });
  }

  /**
   * CẬP NHẬT MINI PREVIEW VÀ TÊN MÃ VẠCH TRÊN THANH CÔNG CỤ RIBBON
   */
  function updateRibbonBarcodePreview(formatKey, def) {
    const item = def || BARCODE_CATALOG[formatKey] || BARCODE_CATALOG['code128'];
    const nameEl = document.getElementById('ribbon-barcode-current-name');
    const badgeEl = document.getElementById('ribbon-barcode-cat-badge');
    const miniPreview = document.getElementById('ribbon-barcode-mini-preview');
    if (nameEl && item) nameEl.textContent = item.name.split('(')[0].trim();
    if (badgeEl && item) badgeEl.textContent = item.type === 'qrcode' ? 'MÃ 2D / MA TRẬN' : 'MÃ VẠCH 1D';
    if (miniPreview && item && item.svg) miniPreview.innerHTML = item.svg;
  }

  /**
   * QUẢN LÝ MODAL THƯ VIỆN CÁC LOẠI MÃ VẠCH (KÈM HÌNH ẢNH MẪU THỰC TẾ CHUẨN BARTENDER)
   */
  function initVisualBarcodeModal() {
    const modal = document.getElementById('modal-visual-barcodes');
    const btnOpen = document.getElementById('btn-open-visual-barcode-modal');
    const btnOpenInsp = document.getElementById('inspector-btn-open-visual-barcodes');
    const btnClose = document.getElementById('btn-close-visual-barcodes');
    const btnCloseFt = document.getElementById('btn-close-visual-barcodes-ft');
    const grid = document.getElementById('visual-barcodes-modal-grid');
    const searchInput = document.getElementById('barcode-catalog-search-input');
    const catPills = document.querySelectorAll('#barcode-catalog-category-pills button');
    const emptyState = document.getElementById('visual-barcodes-empty');

    if (!modal || !grid) return;

    let activeCat = 'all';
    let searchQuery = '';

    function renderModalBarcodes() {
      grid.innerHTML = '';
      let matchCount = 0;
      const curEl = elements.find(item => item.id === selectedElementId);
      const curFormat = curEl ? (curEl.format || (curEl.type === 'barcode' ? 'code128' : 'qrcode')) : null;

      Object.entries(BARCODE_CATALOG).forEach(([key, item]) => {
        if (activeCat !== 'all' && item.cat !== activeCat) return;

        if (searchQuery) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = item.name.toLowerCase().includes(q);
          const matchKey = key.toLowerCase().includes(q);
          const matchDesc = item.desc.toLowerCase().includes(q);
          const matchBadge = item.badge.toLowerCase().includes(q);
          if (!matchName && !matchKey && !matchDesc && !matchBadge) return;
        }

        matchCount++;
        const card = document.createElement('div');
        card.className = `barcode-visual-card ${curFormat === key ? 'active' : ''}`;
        card.innerHTML = `
          <div class="barcode-sample-img-wrapper">
            ${item.svg}
          </div>
          <div class="flex items-center justify-between gap-1 mb-1">
            <span class="text-[11px] font-bold text-white truncate">${item.name.split('(')[0].trim()}</span>
            <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold shrink-0">${item.badge}</span>
          </div>
          <p class="text-[10px] text-slate-400 line-clamp-2 leading-tight">${item.desc}</p>
        `;

        card.addEventListener('click', () => {
          applyBarcodeFormat(key, item);
          modal.classList.add('hidden');
        });

        grid.appendChild(card);
      });

      if (emptyState) emptyState.classList.toggle('hidden', matchCount > 0);
    }

    function applyBarcodeFormat(key, itemDef) {
      let targetEl = elements.find(it => it.id === selectedElementId);
      
      // Nếu chưa có đối tượng hoặc đối tượng không phải mã vạch/QR, tạo mới mã vạch tương ứng!
      if (!targetEl || (targetEl.type !== 'barcode' && targetEl.type !== 'qrcode')) {
        const is2D = itemDef.type === 'qrcode';
        if (is2D) {
          const qrText = 'https://hacode.vn';
          const img = generateQRCodeImage(qrText, key, '#000000', 'white');
          targetEl = {
            id: 'qrcode_' + Date.now(),
            type: 'qrcode',
            text: qrText,
            format: key,
            color: '#000000',
            bgType: 'white',
            img: img,
            x: Math.round(canvasWidth / 2),
            y: Math.round(canvasHeight / 2),
            w: 130,
            h: 130
          };
        } else {
          let code = '893850194284';
          if (key === 'ean8') code = '8938501';
          else if (key === 'itf14') code = '1893850194284';
          else if (key === 'pharmacode') code = '118545';
          const img = generateBarcodeImage(code, key, true, '#000000');
          targetEl = {
            id: 'barcode_' + Date.now(),
            type: 'barcode',
            text: code,
            format: key,
            displayValue: true,
            color: '#000000',
            img: img,
            x: Math.round(canvasWidth / 2),
            y: Math.round(canvasHeight / 2),
            w: Math.min(Math.round(canvasWidth * 0.7), 360),
            h: Math.min(Math.round(canvasHeight * 0.3), 100)
          };
        }
        elements.push(targetEl);
        selectedElementId = targetEl.id;
        selectedElementIds = [targetEl.id];
      } else {
        targetEl.type = itemDef.type;
        targetEl.format = key;
        if (itemDef.type === 'barcode') {
          targetEl.img = generateBarcodeImage(targetEl.text || '893850194284', key, targetEl.displayValue !== false, targetEl.color || '#000000');
        } else {
          targetEl.img = generateQRCodeImage(targetEl.text || 'https://hacode.vn', key, targetEl.color || '#000000', targetEl.bgType || 'white');
        }
      }

      saveHistory();
      syncSelectedElementToUI(targetEl);
      updateRibbonBarcodePreview(key, itemDef);
      render();
    }

    const openModal = () => {
      activeCat = 'all';
      searchQuery = '';
      if (searchInput) searchInput.value = '';
      catPills.forEach(p => p.classList.toggle('active', p.dataset.cat === 'all'));
      renderModalBarcodes();
      modal.classList.remove('hidden');
      searchInput?.focus();
    };

    btnOpen?.addEventListener('click', openModal);
    btnOpenInsp?.addEventListener('click', openModal);
    document.querySelectorAll('.btn-trigger-visual-modal-qr').forEach(b => b.addEventListener('click', openModal));
    const closeModal = () => modal.classList.add('hidden');
    btnClose?.addEventListener('click', closeModal);
    btnCloseFt?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    catPills.forEach(pill => {
      pill.addEventListener('click', () => {
        catPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeCat = pill.dataset.cat || 'all';
        renderModalBarcodes();
      });
    });

    searchInput?.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderModalBarcodes();
    });
  }

  /**
   * ĐỒNG BỘ THUỘC TÍNH ĐỐI TƯỢNG ĐANG CHỌN RA BẢNG INSPECTOR CHUẨN BARTENDER
   */
  function syncSelectedElementToUI(el) {
    const typeBadge = document.getElementById('inspector-element-type-badge');
    const inpPosX = document.getElementById('inspector-pos-x');
    const inpPosY = document.getElementById('inspector-pos-y');
    const inpSizeW = document.getElementById('inspector-size-w');
    const inpSizeH = document.getElementById('inspector-size-h');
    const liveCoords = document.getElementById('designer-live-coords');

    const groupContent = document.getElementById('inspector-group-content');
    const contentLabel = document.getElementById('inspector-content-label');
    const editText = document.getElementById('edit-element-text');

    const groupText = document.getElementById('inspector-group-text-styling');
    const inpFontFamily = document.getElementById('inspector-font-family');
    const ribbonFontFamily = document.getElementById('ribbon-font-family');
    const inpFontSize = document.getElementById('inspector-font-size');
    const ribbonFontSize = document.getElementById('edit-element-size');
    const btnBold = document.getElementById('btn-toggle-bold');
    const btnItalic = document.getElementById('btn-toggle-italic');
    const editAlign = document.getElementById('edit-element-align');
    const inpTextColor = document.getElementById('inspector-text-color');
    const inpTextColorHex = document.getElementById('inspector-text-color-hex');

    const groupBox = document.getElementById('inspector-group-box-styling');
    const inpBorderWidth = document.getElementById('inspector-border-width');
    const inpBorderRadius = document.getElementById('inspector-border-radius');
    const inpBorderColor = document.getElementById('inspector-border-color');
    const inpBorderColorHex = document.getElementById('inspector-border-color-hex');

    const groupLine = document.getElementById('inspector-group-line-styling');

    const groupBarcode = document.getElementById('inspector-group-barcode-styling');
    const selBarcodeFormat = document.getElementById('inspector-barcode-format');
    const checkBarcodeShowText = document.getElementById('inspector-barcode-show-text');
    const inpBarcodeColor = document.getElementById('inspector-barcode-color');
    const inpBarcodeColorHex = document.getElementById('inspector-barcode-color-hex');

    const groupQrcode = document.getElementById('inspector-group-qrcode-styling');
    const selQrcodeFormat = document.getElementById('inspector-qrcode-format');
    const inpQrcodeColor = document.getElementById('inspector-qrcode-color');
    const inpQrcodeColorHex = document.getElementById('inspector-qrcode-color-hex');
    const selQrcodeBgType = document.getElementById('inspector-qrcode-bg-type');

    const groupIcon = document.getElementById('inspector-group-icon-styling');
    const inpIconName = document.getElementById('inspector-icon-name');
    const inpIconColor = document.getElementById('inspector-icon-color');
    const inpIconColorHex = document.getElementById('inspector-icon-color-hex');

    const selCountBadge = document.getElementById('inspector-selection-count-badge');
    const selectedCount = (selectedElementIds && selectedElementIds.length) || (el ? 1 : 0);

    if (!el) {
      if (typeBadge) typeBadge.textContent = 'Chưa chọn';
      if (selCountBadge) {
        selCountBadge.textContent = 'Chưa chọn';
        selCountBadge.className = 'text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700';
      }
      if (inpPosX) inpPosX.value = '';
      if (inpPosY) inpPosY.value = '';
      if (inpSizeW) inpSizeW.value = '';
      if (inpSizeH) inpSizeH.value = '';
      if (editText) editText.value = '';
      if (liveCoords) liveCoords.textContent = 'Bấm vào đối tượng để kéo thả & co dãn 8 nút';
      if (groupText) groupText.classList.remove('hidden');
      if (groupBox) groupBox.classList.add('hidden');
      if (groupLine) groupLine.classList.add('hidden');
      if (groupBarcode) groupBarcode.classList.add('hidden');
      if (groupQrcode) groupQrcode.classList.add('hidden');
      if (groupIcon) groupIcon.classList.add('hidden');
      return;
    }

    if (selCountBadge) {
      if (selectedCount > 1) {
        selCountBadge.textContent = `${selectedCount} mục chọn (Shift)`;
        selCountBadge.className = 'text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-900 text-blue-300 border border-blue-600 font-bold';
      } else {
        selCountBadge.textContent = '1 mục chọn';
        selCountBadge.className = 'text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700';
      }
    }

    const b = getElementBounds(el);
    const xMm = pxToMm(b.x);
    const yMm = pxToMm(b.y, true);
    const wMm = pxToMm(b.w);
    const hMm = pxToMm(b.h, true);

    if (inpPosX) inpPosX.value = xMm;
    if (inpPosY) inpPosY.value = yMm;
    if (inpSizeW) inpSizeW.value = wMm;
    if (inpSizeH) inpSizeH.value = hMm;

    if (liveCoords) {
      liveCoords.textContent = `Vị trí: X ${xMm}mm, Y ${yMm}mm | Kích thước: ${wMm} × ${hMm} mm`;
    }

    // Ẩn tất cả các nhóm styling chuyên biệt trước khi bật lại nhóm tương ứng
    if (groupText) groupText.classList.add('hidden');
    if (groupBox) groupBox.classList.add('hidden');
    if (groupLine) groupLine.classList.add('hidden');
    if (groupBarcode) groupBarcode.classList.add('hidden');
    if (groupQrcode) groupQrcode.classList.add('hidden');
    if (groupIcon) groupIcon.classList.add('hidden');

    // Hiển thị theo từng loại đối tượng
    if (el.type === 'text') {
      if (typeBadge) typeBadge.textContent = 'Văn bản (Text)';
      if (groupContent) groupContent.classList.remove('hidden');
      if (contentLabel) contentLabel.textContent = 'Nội dung văn bản';
      if (editText) editText.value = el.text || '';
      if (groupText) groupText.classList.remove('hidden');

      if (inpFontFamily) inpFontFamily.value = el.fontFamily || "'Plus Jakarta Sans', sans-serif";
      if (ribbonFontFamily) ribbonFontFamily.value = el.fontFamily || "'Plus Jakarta Sans', sans-serif";

      if (inpFontSize) inpFontSize.value = el.fontSize || 44;
      if (ribbonFontSize) ribbonFontSize.value = el.fontSize || 44;

      if (btnBold) {
        btnBold.classList.toggle('bg-blue-600', el.fontWeight === 'bold');
        btnBold.classList.toggle('text-white', el.fontWeight === 'bold');
      }
      if (btnItalic) {
        btnItalic.classList.toggle('bg-blue-600', el.fontStyle === 'italic');
        btnItalic.classList.toggle('text-white', el.fontStyle === 'italic');
      }

      const curAlign = el.align || 'left';
      if (editAlign) editAlign.value = curAlign;

      const highlightAlignBtn = (btnId, isActive) => {
        const b = document.getElementById(btnId);
        if (b) {
          b.classList.toggle('bg-blue-600', isActive);
          b.classList.toggle('text-white', isActive);
          b.classList.toggle('border-blue-500', isActive);
        }
      };

      highlightAlignBtn('btn-text-align-left', curAlign === 'left');
      highlightAlignBtn('btn-insp-align-left', curAlign === 'left');
      highlightAlignBtn('btn-text-align-center', curAlign === 'center');
      highlightAlignBtn('btn-insp-align-center', curAlign === 'center');
      highlightAlignBtn('btn-text-align-right', curAlign === 'right');
      highlightAlignBtn('btn-insp-align-right', curAlign === 'right');

      if (inpTextColor) inpTextColor.value = el.color || '#0f172a';
      if (inpTextColorHex) inpTextColorHex.value = (el.color || '#0F172A').toUpperCase();

    } else if (el.type === 'barcode') {
      const fmt = el.format || 'code128';
      if (typeBadge) typeBadge.textContent = `Mã vạch 1D (${fmt.toUpperCase()})`;
      if (groupContent) groupContent.classList.remove('hidden');
      if (contentLabel) contentLabel.textContent = `Dữ liệu mã vạch (${fmt.toUpperCase()})`;
      if (editText) editText.value = el.text || '';
      if (groupText) groupText.classList.add('hidden');
      if (groupBox) groupBox.classList.add('hidden');
      if (groupBarcode) groupBarcode.classList.remove('hidden');
      if (groupQrcode) groupQrcode.classList.add('hidden');
      if (groupIcon) groupIcon.classList.add('hidden');

      if (selBarcodeFormat) selBarcodeFormat.value = fmt;
      const isShowingText = el.displayValue !== false;
      if (checkBarcodeShowText) checkBarcodeShowText.checked = isShowingText;
      if (inpBarcodeColor) inpBarcodeColor.value = el.color || '#000000';
      if (inpBarcodeColorHex) inpBarcodeColorHex.value = (el.color || '#000000').toUpperCase();

      const textSettingsBox = document.getElementById('inspector-barcode-text-settings');
      if (textSettingsBox) {
        textSettingsBox.classList.toggle('hidden', !isShowingText);
      }

      const inpTextDist = document.getElementById('inspector-barcode-text-dist');
      const inpTextDistNum = document.getElementById('inspector-barcode-text-dist-num');
      const valTextDist = document.getElementById('val-barcode-text-dist');
      const curDist = el.textDistance !== undefined ? el.textDistance : 1.5;
      if (inpTextDist) inpTextDist.value = curDist;
      if (inpTextDistNum) inpTextDistNum.value = curDist;
      if (valTextDist) valTextDist.textContent = `${curDist} mm`;

      const inpTextXOffset = document.getElementById('inspector-barcode-text-xoffset');
      const inpTextXOffsetNum = document.getElementById('inspector-barcode-text-xoffset-num');
      const valTextXOffset = document.getElementById('val-barcode-text-xoffset');
      const curXOffset = el.textXOffset !== undefined ? el.textXOffset : 0;
      if (inpTextXOffset) inpTextXOffset.value = curXOffset;
      if (inpTextXOffsetNum) inpTextXOffsetNum.value = curXOffset;
      if (valTextXOffset) valTextXOffset.textContent = `${curXOffset} mm`;

      const inpTextSize = document.getElementById('inspector-barcode-text-size');
      if (inpTextSize) inpTextSize.value = el.textSize || '';

      const selFontFamily = document.getElementById('inspector-barcode-font-family');
      if (selFontFamily) selFontFamily.value = el.fontFamily || "'OCR-B', 'Consolas', monospace";

      const curAlign = el.textAlign || 'center';
      const highlightBcAlign = (btnId, isActive) => {
        const b = document.getElementById(btnId);
        if (b) {
          b.classList.toggle('bg-blue-600', isActive);
          b.classList.toggle('text-white', isActive);
          b.classList.toggle('text-slate-400', !isActive);
        }
      };
      highlightBcAlign('btn-barcode-align-left', curAlign === 'left');
      highlightBcAlign('btn-barcode-align-center', curAlign === 'center');
      highlightBcAlign('btn-barcode-align-right', curAlign === 'right');

      const btnBold = document.getElementById('btn-barcode-text-bold');
      if (btnBold) {
        const isBold = el.textBold !== false;
        btnBold.classList.toggle('bg-blue-600', isBold);
        btnBold.classList.toggle('text-white', isBold);
        btnBold.classList.toggle('bg-slate-800', !isBold);
        btnBold.classList.toggle('text-slate-400', !isBold);
      }

      updateRibbonBarcodePreview(fmt);

    } else if (el.type === 'qrcode') {
      const fmt = el.format || 'qrcode';
      if (typeBadge) typeBadge.textContent = `Mã 2D / Ma trận (${fmt.toUpperCase()})`;
      if (groupContent) groupContent.classList.remove('hidden');
      if (contentLabel) contentLabel.textContent = `Dữ liệu mã 2D (${fmt.toUpperCase()})`;
      if (editText) editText.value = el.text || '';
      if (groupText) groupText.classList.add('hidden');
      if (groupBox) groupBox.classList.add('hidden');
      if (groupBarcode) groupBarcode.classList.add('hidden');
      if (groupQrcode) groupQrcode.classList.remove('hidden');
      if (groupIcon) groupIcon.classList.add('hidden');

      if (selQrcodeFormat) selQrcodeFormat.value = fmt;
      if (inpQrcodeColor) inpQrcodeColor.value = el.color || '#000000';
      if (inpQrcodeColorHex) inpQrcodeColorHex.value = (el.color || '#000000').toUpperCase();
      if (selQrcodeBgType) selQrcodeBgType.value = el.bgType || 'white';

      updateRibbonBarcodePreview(fmt);

    } else if (el.type === 'icon') {
      if (typeBadge) typeBadge.textContent = 'Biểu Tượng In Ấn';
      if (groupContent) groupContent.classList.add('hidden');
      if (groupText) groupText.classList.add('hidden');
      if (groupBox) groupBox.classList.add('hidden');
      if (groupBarcode) groupBarcode.classList.add('hidden');
      if (groupQrcode) groupQrcode.classList.add('hidden');
      if (groupIcon) groupIcon.classList.remove('hidden');

      if (inpIconName) inpIconName.value = el.name || el.iconKey || 'Biểu tượng';
      if (inpIconColor) inpIconColor.value = el.color || '#0f172a';
      if (inpIconColorHex) inpIconColorHex.value = (el.color || '#0F172A').toUpperCase();

    } else if (el.type === 'rect') {
      if (typeBadge) typeBadge.textContent = 'Khung Ô Trống [ ]';
      if (groupContent) groupContent.classList.add('hidden');
      if (groupBox) groupBox.classList.remove('hidden');

      if (inpBorderWidth) inpBorderWidth.value = el.lineWidth || 3.5;
      if (inpBorderRadius) inpBorderRadius.value = el.radius || 4;
      if (inpBorderColor) inpBorderColor.value = el.stroke || '#0f172a';
      if (inpBorderColorHex) inpBorderColorHex.value = (el.stroke || '#0F172A').toUpperCase();

    } else if (el.type === 'line') {
      const isV = Math.abs(el.x2 - el.x1) < 4;
      const isH = Math.abs(el.y2 - el.y1) < 4;
      const lengthPx = Math.hypot(el.x2 - el.x1, el.y2 - el.y1);
      const lengthMm = pxToMm(lengthPx, isV);

      if (typeBadge) typeBadge.textContent = isV ? 'Đường Kẻ Dọc (Vertical)' : 'Đường Kẻ Ngang (Horizontal)';
      if (groupContent) groupContent.classList.add('hidden');
      if (groupLine) groupLine.classList.remove('hidden');

      const btnOrientH = document.getElementById('btn-line-orient-horizontal');
      const btnOrientV = document.getElementById('btn-line-orient-vertical');
      if (btnOrientH) {
        btnOrientH.className = isH
          ? 'py-1 px-1.5 text-xs rounded bg-blue-600 text-white font-bold border border-blue-500 flex items-center justify-center gap-1 transition shadow-sm'
          : 'py-1 px-1.5 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center justify-center gap-1 transition';
      }
      if (btnOrientV) {
        btnOrientV.className = isV
          ? 'py-1 px-1.5 text-xs rounded bg-blue-600 text-white font-bold border border-blue-500 flex items-center justify-center gap-1 transition shadow-sm'
          : 'py-1 px-1.5 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center justify-center gap-1 transition';
      }

      const inpLineLen = document.getElementById('inspector-line-length');
      if (inpLineLen) inpLineLen.value = lengthMm;

      const inpLineW = document.getElementById('inspector-line-width');
      if (inpLineW) inpLineW.value = el.lineWidth || 2.5;

      const selLineStyle = document.getElementById('inspector-line-style');
      if (selLineStyle) {
        if (Array.isArray(el.dash) && el.dash.length > 0) {
          selLineStyle.value = el.dash[0] <= 4 ? 'dotted' : 'dashed';
        } else {
          selLineStyle.value = 'solid';
        }
      }

      const inpLineColor = document.getElementById('inspector-line-color');
      const inpLineColorHex = document.getElementById('inspector-line-color-hex');
      const colorVal = el.color || '#0f172a';
      if (inpLineColor) inpLineColor.value = colorVal;
      if (inpLineColorHex) inpLineColorHex.value = colorVal.toUpperCase();

    } else if (el.type === 'image') {
      if (typeBadge) typeBadge.textContent = 'Hình Ảnh / Logo';
      if (groupContent) groupContent.classList.add('hidden');
    }
  }

  /**
   * KHI KÍCH THƯỚC CON TEM HOẶC MÀU SẮC THAY ĐỔI
   */
  function onLabelSizeChanged() {
    setupCanvasDimensions();
    render();
    if (window.Roll3D && typeof window.Roll3D.syncLabelTexture === 'function') {
      window.Roll3D.syncLabelTexture(clean3dCanvas || canvas);
    }
  }

  function setBaseColor(colorHex) {
    render();
  }

  function exportCustomLabelImage({ width = 800, height = 800, format = 'png', bgOption = 'white', quality = 0.95 } = {}) {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = width;
    offCanvas.height = height;
    const offCtx = offCanvas.getContext('2d');

    // Nền
    if (bgOption === 'white') {
      offCtx.fillStyle = '#ffffff';
      offCtx.fillRect(0, 0, width, height);
    } else if (bgOption === 'studio') {
      offCtx.fillStyle = '#0a0f1d';
      offCtx.fillRect(0, 0, width, height);
    } // 'transparent' -> giữ trong suốt

    render(true);
    const cleanSrc = clean3dCanvas || canvas;

    const pad = Math.min(width, height) * 0.08;
    const availW = width - pad * 2;
    const availH = height - pad * 2;

    const scale = Math.min(availW / cleanSrc.width, availH / cleanSrc.height);
    const drawW = Math.round(cleanSrc.width * scale);
    const drawH = Math.round(cleanSrc.height * scale);
    const drawX = Math.round((width - drawW) / 2);
    const drawY = Math.round((height - drawH) / 2);

    if (bgOption !== 'transparent') {
      offCtx.save();
      offCtx.shadowColor = 'rgba(0, 0, 0, 0.25)';
      offCtx.shadowBlur = Math.round(16 * scale);
      offCtx.shadowOffsetY = Math.round(6 * scale);
      offCtx.drawImage(cleanSrc, drawX, drawY, drawW, drawH);
      offCtx.restore();
    } else {
      offCtx.drawImage(cleanSrc, drawX, drawY, drawW, drawH);
    }

    render(false);

    const mimeType = (format === 'jpeg' || format === 'jpg') ? 'image/jpeg' : 'image/png';
    const dataURL = offCanvas.toDataURL(mimeType, quality);

    const S = window.AppState;
    const ext = (format === 'jpeg' || format === 'jpg') ? 'jpg' : 'png';
    const filename = `Thiet-Ke-Tem-${S?.labelWidth || 50}x${S?.labelHeight || 30}mm-${width}x${height}.${ext}`;

    const link = document.createElement('a');
    link.download = filename;
    link.href = dataURL;
    link.click();

    return dataURL;
  }

  return {
    init,
    initBlankLabel,
    resetToBlank: initBlankLabel,
    setupCanvasDimensions,
    generateBlankFieldTemplate,
    generateSmartLayout,
    generateGridTableLayout,
    onLabelSizeChanged,
    setBaseColor,
    exportCustomLabelImage,
    render,
    getCanvas: () => canvas,
    getCleanCanvas: () => clean3dCanvas || canvas,
    getElements: () => elements,
    setElements: (newElements) => {
      if (Array.isArray(newElements)) {
        elements = JSON.parse(JSON.stringify(newElements));
        selectedElementId = elements.length > 0 ? elements[0].id : null;
        selectedElementIds = selectedElementId ? [selectedElementId] : [];
        setupCanvasDimensions();
        render();
        if (window.Roll3D && typeof window.Roll3D.syncLabelTexture === 'function') {
          window.Roll3D.syncLabelTexture(clean3dCanvas || canvas);
        }
      }
    },
    selectElement: (id) => {
      selectedElementId = id;
      const el = elements.find(item => item.id === id);
      syncSelectedElementToUI(el);
      render();
    }
  };
})();

// Tự động khởi tạo sau khi DOM load
document.addEventListener('DOMContentLoaded', () => {
  window.LabelDesigner.init();
});
