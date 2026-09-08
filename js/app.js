/**
 * APP.JS - Trình Quản Lý Trạng Thái & Điều Khiển Toàn Bộ Ứng Dụng
 * Đồng bộ hai chiều giữa Bảng thông số, Mô hình 3D, Bản vẽ 2D và Trình thiết kế AI
 */

window.AppState = {
  // Thông số kích thước con tem (mm) - Mặc định 50x30 mm
  labelWidth: 50,
  labelHeight: 30,
  labelDiameter: 40, // Đường kính tem tròn (khi shape = 'circle')
  cornerRadius: 2,
  shape: 'rounded', // 'rounded', 'rect', 'circle', 'oval'

  // Quy cách dàn hàng - Mặc định 1 tem / hàng
  ups: 1, // 1 tem 1 hàng
  gapX: 0, // 1 tem thì khoảng cách trên hàng = 0
  gapY: 3, // Khoảng cách bước nhảy giữa 2 hàng (mm)
  marginX: 2, // Lề biên 2 bên (mm)
  hasPerforation: true, // Đường răng cưa

  // Quy cách cuộn & lõi
  coreDiameter: 25.4, // Lõi 1 inch (25.4mm) chuẩn máy in để bàn
  coreName: '1 inch',
  rollLength: 50, // mét
  labelCount: 1515, // Tự tính cho 50m tem 30mm
  webWidth: 54, // Khổ cuộn: 50 + 2*2 = 54mm
  outerDiameter: 98, // Đường kính ngoài cuộn (mm)
  windDirection: 'out_top', // Hướng ra tem

  // Màu sắc & Chất liệu & Đặt hàng
  materialType: 'paper_normal', // 'paper_normal', 'paper_thermal', 'pvc', 'silver'
  leadTimeDays: 3,
  colorMode: 'white', // 'white', 'blue', 'red', 'preprint'
  labelColor: '#FFFFFF',
  linerColor: '#FFFFFF', // Trắng tinh sạch sẽ theo yêu cầu
  inkColor: '#000000',
  materialFinish: 'matte', // 'matte', 'gloss', 'metallic', 'gold', 'kraft'

  // Trạng thái hiển thị Thước đo 3D
  show3DDimensions: true,
  dimToggles: {
    width: true,  // Chiều rộng con tem (W)
    height: true, // Chiều cao con tem (H)
    gapY: true,   // Bước nhảy 2 hàng (mm)
    gapX: true,   // Cách nhau trên hàng (mm)
    margin: true, // Lề biên 2 bên (mm)
    core: true    // Kích thước lõi cuộn
  },

  // Trạng thái hiển thị Bảng thông số đặt hàng trên 3D (HUD Spec Card)
  showSpecCard: true,
  minOrder: 20,       // Đặt hàng tối thiểu (mặc định 20 cuộn, tùy chọn 20 - 30 - tự nhập)
  minOrderPreset: '20',
  specToggles: {
    material: true,   // 1. Chất liệu
    dimensions: true, // 2. Kích thước
    spec: true,       // 3. Quy cách (Bo góc & Số hàng)
    rollLength: true, // 4. Chiều dài cuộn (m)
    count: true,      // 5. Số tem ước tính
    core: true,       // 6. Lõi cuộn
    color: true,      // 7. Màu nền
    minOrder: true,   // 8. Đặt hàng tối thiểu (MOQ)
    leadTime: true    // 9. Thời gian SX
  },

  // Cỡ chữ và tỉ lệ hiển thị tuỳ biến
  dimTextScale: 1.35,  // Cỡ số đo 3D (mặc định 135% to rõ ràng, điều chỉnh được 70% - 230%)
  specCardScale: 1.0, // Cỡ chữ bảng thông số đặt hàng (mặc định 100%, điều chỉnh được 80% - 170%)

  autoSpin: false,
  studioBg: 'dark', // Nền đen Studio sang trọng mặc định
};

// CÁC MẪU SẴN PHỔ BIẾN NHẤT TRÊN THỊ TRƯỜNG HIỆN NAY (MARKET POPULAR PRESETS)
const LABEL_PRESETS = {
  // 0. Tem 1 tem/hàng (50x30mm) - Tem chuẩn mặc định ban đầu theo yêu cầu
  retail_50x30_1up: {
    labelWidth: 50,
    labelHeight: 30,
    cornerRadius: 2,
    shape: 'rounded',
    ups: 1,
    gapX: 0,
    gapY: 3,
    marginX: 2,
    coreDiameter: 25.4,
    coreName: '1 inch',
    rollLength: 50,
    labelColor: '#FFFFFF',
    linerColor: '#FFFFFF',
    hasPerforation: true,
    materialFinish: 'matte'
  },
  // 1. Tem 2 tem/hàng (50x30mm) - Tem phụ, mã vạch giá bán phổ biến nhất
  retail_50x30_2up: {
    labelWidth: 50,
    labelHeight: 30,
    cornerRadius: 2,
    shape: 'rounded',
    ups: 2,
    gapX: 3,
    gapY: 3,
    marginX: 2,
    coreDiameter: 25.4,
    coreName: '1 inch',
    rollLength: 50,
    labelColor: '#FFFFFF',
    linerColor: '#FFFFFF',
    hasPerforation: true,
    materialFinish: 'matte'
  },
  // 2. Tem 3 tem/hàng (35x22mm) - Tem siêu thị phổ biến nhất Việt Nam (KiotViet, Sapo, Suno)
  supermarket_35x22_3up: {
    labelWidth: 35,
    labelHeight: 22,
    cornerRadius: 1.5,
    shape: 'rounded',
    ups: 3,
    gapX: 2.5,
    gapY: 2.5,
    marginX: 2,
    coreDiameter: 25.4,
    coreName: '1 inch',
    rollLength: 50,
    labelColor: '#FFFFFF',
    linerColor: '#FFFFFF',
    hasPerforation: true,
    materialFinish: 'matte'
  },
  // 3. Tem 2 tem/hàng (35x22mm) - Khổ 75mm máy in mã vạch để bàn (Xprinter 350B, Gprinter)
  barcode_35x22_2up: {
    labelWidth: 35,
    labelHeight: 22,
    cornerRadius: 1.5,
    shape: 'rounded',
    ups: 2,
    gapX: 2.5,
    gapY: 2.5,
    marginX: 2,
    coreDiameter: 25.4,
    coreName: '1 inch',
    rollLength: 30,
    labelColor: '#FFFFFF',
    linerColor: '#FFFFFF',
    hasPerforation: true,
    materialFinish: 'matte'
  },
  // 4. Tem 4 tem/hàng (25x15mm) - Tem tiệm vàng bạc, trang sức, mắt kính, linh kiện nhỏ
  jewelry_25x15_4up: {
    labelWidth: 25,
    labelHeight: 15,
    cornerRadius: 1,
    shape: 'rounded',
    ups: 4,
    gapX: 2,
    gapY: 2,
    marginX: 2,
    coreDiameter: 25.4,
    coreName: '1 inch',
    rollLength: 50,
    labelColor: '#FFFFFF',
    linerColor: '#FFFFFF',
    hasPerforation: true,
    materialFinish: 'matte'
  },
  // 5. Tem 2 tem/hàng (40x30mm) - Mã vạch nhà thuốc, mỹ phẩm, thực phẩm
  pharma_40x30_2up: {
    labelWidth: 40,
    labelHeight: 30,
    cornerRadius: 2,
    shape: 'rounded',
    ups: 2,
    gapX: 3,
    gapY: 3,
    marginX: 2,
    coreDiameter: 25.4,
    coreName: '1 inch',
    rollLength: 50,
    labelColor: '#FFFFFF',
    linerColor: '#FFFFFF',
    hasPerforation: true,
    materialFinish: 'matte'
  },
  // 6. Tem vận chuyển TMĐT A6 (100x150mm) - Shopee, TikTok Shop, Lazada, GHTK, Viettel Post
  shipping_100x150_1up: {
    labelWidth: 100,
    labelHeight: 150,
    cornerRadius: 2,
    shape: 'rounded',
    ups: 1,
    gapX: 0,
    gapY: 4,
    marginX: 3,
    coreDiameter: 76.2,
    coreName: '3 inch',
    rollLength: 100,
    labelColor: '#FFFFFF',
    linerColor: '#FFFFFF',
    hasPerforation: true,
    materialFinish: 'matte'
  },
  // 7. Tem vuông kiện hàng (100x100mm) - Tem dán kiện hàng công nghiệp, logistics
  shipping_100x100_1up: {
    labelWidth: 100,
    labelHeight: 100,
    cornerRadius: 2,
    shape: 'rounded',
    ups: 1,
    gapX: 0,
    gapY: 3,
    marginX: 2.5,
    coreDiameter: 76.2,
    coreName: '3 inch',
    rollLength: 100,
    labelColor: '#FFFFFF',
    linerColor: '#FFFFFF',
    hasPerforation: true,
    materialFinish: 'matte'
  },
  // 8. Tem dán thùng carton (100x75mm) - Dán thùng hàng xuất nhập khẩu, pallet
  carton_100x75_1up: {
    labelWidth: 100,
    labelHeight: 75,
    cornerRadius: 2,
    shape: 'rounded',
    ups: 1,
    gapX: 0,
    gapY: 3,
    marginX: 2.5,
    coreDiameter: 76.2,
    coreName: '3 inch',
    rollLength: 100,
    labelColor: '#FFFFFF',
    linerColor: '#FFFFFF',
    hasPerforation: true,
    materialFinish: 'matte'
  },
  // 9. Tem thông tin sản phẩm (80x50mm) - Nhãn phụ xuất xứ, quy cách sản phẩm
  product_80x50_1up: {
    labelWidth: 80,
    labelHeight: 50,
    cornerRadius: 2,
    shape: 'rounded',
    ups: 1,
    gapX: 0,
    gapY: 3,
    marginX: 2.5,
    coreDiameter: 40,
    coreName: '1.5 inch',
    rollLength: 50,
    labelColor: '#FFFFFF',
    linerColor: '#FFFFFF',
    hasPerforation: true,
    materialFinish: 'matte'
  },
  // 10. Tem dán ly trà sữa (50x30mm) - Trà sữa Boba, ToCoToCo, Ding Tea, The Alley
  bubble_tea_50x30_1up: {
    labelWidth: 50,
    labelHeight: 30,
    cornerRadius: 2,
    shape: 'rounded',
    ups: 1,
    gapX: 0,
    gapY: 3,
    marginX: 2,
    coreDiameter: 40,
    coreName: '1.5 inch',
    rollLength: 30,
    labelColor: '#FFFFFF',
    linerColor: '#FFFFFF',
    hasPerforation: false,
    materialFinish: 'gloss'
  },
  // 11. Tem dán ly đồ uống cỡ lớn (50x40mm) - Cafe takeaway, sinh tố, đồ uống
  cup_50x40_1up: {
    labelWidth: 50,
    labelHeight: 40,
    cornerRadius: 2,
    shape: 'rounded',
    ups: 1,
    gapX: 0,
    gapY: 3,
    marginX: 2,
    coreDiameter: 40,
    coreName: '1.5 inch',
    rollLength: 30,
    labelColor: '#FFFFFF',
    linerColor: '#FFFFFF',
    hasPerforation: false,
    materialFinish: 'gloss'
  },
  // 12. Bản vẽ kỹ thuật chuẩn (4 tem 25x38mm, Lõi 30mm) - Mẫu gốc chuẩn maket
  technical_25x38_4up: {
    labelWidth: 25,
    labelHeight: 38,
    cornerRadius: 2,
    shape: 'rounded',
    ups: 4,
    gapX: 3,
    gapY: 3,
    marginX: 2,
    coreDiameter: 30,
    coreName: '30mm',
    rollLength: 50,
    labelColor: '#FFFFFF',
    linerColor: '#FFFFFF',
    hasPerforation: true,
    materialFinish: 'matte'
  },
  // 13. Tem tròn niêm phong (Ø 40mm, 2 tem/hàng) - Niêm phong hộp bánh, mỹ phẩm
  round_seal_40_2up: {
    labelWidth: 40,
    labelHeight: 40,
    cornerRadius: 20,
    shape: 'circle',
    ups: 2,
    gapX: 3,
    gapY: 3,
    marginX: 2,
    coreDiameter: 40,
    coreName: '1.5 inch',
    rollLength: 50,
    labelColor: '#FFFFFF',
    linerColor: '#FFFFFF',
    hasPerforation: true,
    materialFinish: 'gloss'
  },
  // 14. Tem tròn logo (Ø 50mm, 1 tem/hàng) - Nhãn dán túi giấy, ly giấy kraft
  round_seal_50_1up: {
    labelWidth: 50,
    labelHeight: 50,
    cornerRadius: 25,
    shape: 'circle',
    ups: 1,
    gapX: 0,
    gapY: 3,
    marginX: 2,
    coreDiameter: 40,
    coreName: '1.5 inch',
    rollLength: 50,
    labelColor: '#FFFFFF',
    linerColor: '#FFFFFF',
    hasPerforation: true,
    materialFinish: 'kraft'
  }
};

// Ánh xạ các key cũ để tương thích 100%
LABEL_PRESETS.mau_hinh_2 = LABEL_PRESETS.technical_25x38_4up;
LABEL_PRESETS.zebra_2ups = LABEL_PRESETS.retail_50x30_2up;
LABEL_PRESETS.barcode_1up = LABEL_PRESETS.product_80x50_1up;
LABEL_PRESETS.supermarket_3ups = LABEL_PRESETS.supermarket_35x22_3up;
LABEL_PRESETS.shipping_1up = LABEL_PRESETS.shipping_100x150_1up;
LABEL_PRESETS.bubble_tea = LABEL_PRESETS.bubble_tea_50x30_1up;
LABEL_PRESETS.round_label = LABEL_PRESETS.round_seal_40_2up;

/**
 * TÍNH TOÁN CÁC THÔNG SỐ VẬT LÝ CUỘN TEM
 */
function recalculatePhysics() {
  const S = window.AppState;

  const lw = (S.labelWidth && Number(S.labelWidth) > 0) ? Number(S.labelWidth) : 50;
  const lh = (S.labelHeight && Number(S.labelHeight) > 0) ? Number(S.labelHeight) : 30;
  const ups = (S.ups && Number(S.ups) > 0) ? Number(S.ups) : 1;

  // 1. Khổ cuộn giấy (Web Width mm)
  S.webWidth = (ups * lw) + ((ups - 1) * S.gapX) + (2 * S.marginX);

  // 2. Bước nhảy một bước tem (Pitch mm)
  const pitch = lh + S.gapY;

  // 3. Số hàng tem trên cuộn
  const effectiveLen = (S.rollLength && Number(S.rollLength) > 0) ? Number(S.rollLength) : 50;
  const totalRows = Math.floor((effectiveLen * 1000) / pitch);

  // 4. Tổng số con tem trên cuộn
  if (S.rollLength !== null && S.rollLength !== undefined && S.rollLength !== '') {
    S.labelCount = totalRows * ups;
  }

  // 5. Đường kính ngoài của cuộn tem (Outer Diameter - OD mm)
  // Công thức xấp xỉ ngành in: OD = sqrt(Core^2 + (4 * Thickness * Length / PI))
  // Độ dày trung bình giấy decal + đế glassine: ~0.15mm (150 microns)
  const caliper = 0.155; // mm
  const coreR = (S.coreDiameter || 76) / 2;
  const areaPaper = effectiveLen * 1000 * caliper;
  const totalArea = Math.PI * (coreR * coreR) + areaPaper;
  const outerR = Math.sqrt(totalArea / Math.PI);
  S.outerDiameter = Math.round(outerR * 2);

  // Cập nhật lên UI
  updateHUDAndBadges();
}

/**
 * CẬP NHẬT CÁC BADGE VÀ HUD HIỂN THỊ TRÊN GIAO DIỆN
 */
function updateHUDAndBadges() {
  const S = window.AppState;

  // 1. Thẻ chất liệu decal
  const materialNameMap = {
    paper_normal: 'Giấy thường (xé rách được)',
    paper_thermal: 'Giấy nhiệt (xé rách được)',
    pvc: 'PVC (xé không rách)',
    silver: 'Xi bạc'
  };
  const materialShortMap = {
    paper_normal: 'Giấy thường',
    paper_thermal: 'Giấy nhiệt',
    pvc: 'PVC',
    silver: 'Xi bạc'
  };

  const badgeMaterial = document.getElementById('badge-material-selected');
  if (badgeMaterial) {
    badgeMaterial.textContent = materialShortMap[S.materialType] || 'Giấy thường';
  }

  // 2. Thẻ kích thước con tem
  const badgeLabelDims = document.getElementById('badge-label-dims');
  if (badgeLabelDims) {
    badgeLabelDims.textContent = S.shape === 'circle' ? `Ø ${S.labelWidth} mm` : `${S.labelWidth} x ${S.labelHeight} mm`;
  }

  // 3. Thẻ quy cách tóm tắt
  const cornerStr = (S.cornerRadius === 0) ? 'Góc vuông' : `Bo góc R${S.cornerRadius}`;
  const badgeSpecSummary = document.getElementById('badge-spec-summary');
  if (badgeSpecSummary) {
    badgeSpecSummary.textContent = `${cornerStr} - ${S.ups} tem/hàng`;
  }

  const badgeRowLayout = document.getElementById('badge-row-layout');
  if (badgeRowLayout) badgeRowLayout.textContent = `${S.ups} tem / hàng`;

  // 4. Số tem ước tính & Chiều dài cuộn
  const countEstFormatted = (S.labelCount && Number(S.labelCount) > 0)
    ? `khoảng ${S.labelCount.toLocaleString('vi-VN')} tem / cuộn`
    : 'Chưa xác định';
  const badgeCountEst = document.getElementById('badge-label-count-est');
  if (badgeCountEst) badgeCountEst.textContent = countEstFormatted;

  const badgeOdEst = document.getElementById('badge-od-est');
  if (badgeOdEst) badgeOdEst.textContent = `OD: ~${S.outerDiameter} mm`;

  const inputLabelCount = document.getElementById('input-label-count');
  if (inputLabelCount && document.activeElement !== inputLabelCount) {
    inputLabelCount.value = (S.labelCount !== null && S.labelCount !== undefined) ? S.labelCount : '';
  }

  const inputRollLength = document.getElementById('input-roll-length');
  if (inputRollLength && document.activeElement !== inputRollLength) {
    inputRollLength.value = (S.rollLength !== null && S.rollLength !== undefined) ? S.rollLength : '';
  }

  // 5. Thẻ lõi cuộn
  const badgeCoreSize = document.getElementById('badge-core-size');
  if (badgeCoreSize) {
    badgeCoreSize.textContent = S.coreName.includes('inch')
      ? `${S.coreName} (${S.coreDiameter.toFixed(1)}mm)`
      : `Lõi ${S.coreDiameter.toFixed(0)}mm`;
  }

  // 6. Màu nền preview
  const badgeColor = document.getElementById('badge-color-preview');
  if (badgeColor) badgeColor.style.backgroundColor = S.labelColor;

  // 7. Thời gian sản xuất
  const badgeLeadTime = document.getElementById('badge-lead-time');
  const ltStr = S.leadTimeDays ? String(S.leadTimeDays).trim() : '';
  const leadTimeDisplay = ltStr ? (ltStr.toLowerCase().includes('ngày') ? ltStr : `${ltStr} ngày`) : '';

  if (badgeLeadTime) {
    badgeLeadTime.textContent = leadTimeDisplay || 'Chưa nhập';
  }

  // Cập nhật giá trị tính toán
  const calcWebWidth = document.getElementById('calc-web-width');
  if (calcWebWidth) calcWebWidth.textContent = `${S.webWidth.toFixed(1)} mm`;

  const calcOD = document.getElementById('calc-outer-diameter');
  if (calcOD) calcOD.textContent = `~${S.outerDiameter} mm`;

  // =========================================================
  // CẬP NHẬT NỘI DUNG THẺ THÔNG SỐ ĐẶT HÀNG TRÊN 3D (#hud-spec-card)
  // =========================================================
  const hudSpecBadgeDays = document.getElementById('hud-spec-badge-days');
  if (hudSpecBadgeDays) {
    if (shouldShowSpecRow('leadTime', S)) {
      hudSpecBadgeDays.style.display = '';
      hudSpecBadgeDays.textContent = `SX: ${leadTimeDisplay}`;
    } else {
      hudSpecBadgeDays.style.display = 'none';
    }
  }

  const hudValMat = document.getElementById('hud-val-material');
  if (hudValMat) hudValMat.textContent = materialNameMap[S.materialType] || 'Giấy thường (xé rách được)';

  const hudValDims = document.getElementById('hud-val-dimensions');
  if (hudValDims) hudValDims.textContent = `${S.labelWidth} x ${S.labelHeight} mm (ngang x cao)`;

  const hudValSpec = document.getElementById('hud-val-spec');
  if (hudValSpec) hudValSpec.textContent = `${cornerStr} - ${S.ups} tem/hàng`;

  const hudValLength = document.getElementById('hud-val-length');
  if (hudValLength) hudValLength.textContent = `${S.rollLength}m / cuộn`;

  const hudValCount = document.getElementById('hud-val-count');
  if (hudValCount) hudValCount.textContent = `khoảng ${S.labelCount ? S.labelCount.toLocaleString('vi-VN') : ''} tem`;

  const hudValCore = document.getElementById('hud-val-core');
  if (hudValCore) {
    hudValCore.textContent = S.coreName.includes('inch')
      ? `${S.coreName} (${S.coreDiameter.toFixed(1)}mm)`
      : `Lõi ${S.coreDiameter.toFixed(0)}mm`;
  }

  const hudValColor = document.getElementById('hud-val-color');
  const hudColorDot = document.getElementById('hud-color-dot');
  if (hudValColor) {
    if (S.colorMode === 'preprint') {
      hudValColor.textContent = 'In phôi sẵn';
      if (hudColorDot) hudColorDot.style.display = 'none';
    } else if (S.colorMode === 'white' || (S.labelColor && S.labelColor.toUpperCase() === '#FFFFFF')) {
      hudValColor.textContent = 'Trắng';
      if (hudColorDot) { hudColorDot.style.display = ''; hudColorDot.style.backgroundColor = '#FFFFFF'; }
    } else if (S.colorMode === 'blue') {
      hudValColor.textContent = 'Xanh';
      if (hudColorDot) { hudColorDot.style.display = ''; hudColorDot.style.backgroundColor = S.labelColor; }
    } else if (S.colorMode === 'red') {
      hudValColor.textContent = 'Đỏ';
      if (hudColorDot) { hudColorDot.style.display = ''; hudColorDot.style.backgroundColor = S.labelColor; }
    } else {
      hudValColor.textContent = S.labelColor;
      if (hudColorDot) { hudColorDot.style.display = ''; hudColorDot.style.backgroundColor = S.labelColor; }
    }
  }

  const hudValMinOrder = document.getElementById('hud-val-minorder');
  if (hudValMinOrder) hudValMinOrder.textContent = `${S.minOrder} cuộn`;

  const badgeMinOrder = document.getElementById('badge-min-order');
  if (badgeMinOrder) {
    badgeMinOrder.textContent = (S.minOrder && Number(S.minOrder) > 0) ? `${S.minOrder} cuộn` : 'Chưa nhập';
  }

  const hudValLead = document.getElementById('hud-val-leadtime');
  if (hudValLead) hudValLead.textContent = leadTimeDisplay || 'Chưa nhập';

  // HUD cũ (nếu còn tồn tại)
  const hudLabelSize = document.getElementById('hud-label-size');
  if (hudLabelSize) {
    hudLabelSize.textContent = S.shape === 'circle'
      ? `Tem Tròn Ø ${S.labelWidth} mm`
      : `${S.labelWidth} x ${S.labelHeight} mm (R=${S.cornerRadius}mm)`;
  }
  const hudRowLayout = document.getElementById('hud-row-layout');
  if (hudRowLayout) hudRowLayout.textContent = `${S.ups} tem / hàng (Gap: ${S.gapX}mm)`;
  const hudRollInfo = document.getElementById('hud-roll-info');
  if (hudRollInfo) hudRollInfo.textContent = `${S.webWidth.toFixed(1)}mm x Lõi ${S.coreName}`;

  syncSpecCardUI();
}

/**
 * KIỂM TRA MỘT HÀNG THÔNG SỐ CÓ ĐƯỢC HIỂN THỊ HAY KHÔNG
 * Điều kiện hiển thị:
 * 1. Không bị tắt trong menu tùy biến (S.specToggles[key] !== false)
 * 2. Người dùng ĐÃ NHẬP LIỆU (không bị rỗng, null, undefined hoặc <= 0)
 * @param {string} key - Tên trường thông số
 * @param {object} [state] - Đối tượng AppState (mặc định lấy window.AppState)
 * @returns {boolean}
 */
function shouldShowSpecRow(key, state) {
  const S = state || window.AppState;
  if (!S) return false;

  // 1. Kiểm tra toggle bật / tắt của người dùng trong menu tùy biến
  const toggles = S.specToggles || {};
  if (toggles[key] === false) return false;

  // 2. Kiểm tra dữ liệu thực tế người dùng nhập (nếu để trống hoặc = 0 thì ẩn)
  switch (key) {
    case 'material':
      return Boolean(S.materialType && S.materialType.trim() !== '');
    case 'dimensions':
      return Boolean(S.labelWidth && Number(S.labelWidth) > 0 && S.labelHeight && Number(S.labelHeight) > 0);
    case 'spec':
      return Boolean(S.ups && Number(S.ups) > 0);
    case 'rollLength':
      return Boolean(S.rollLength !== null && S.rollLength !== undefined && S.rollLength !== '' && Number(S.rollLength) > 0);
    case 'count':
      return Boolean(S.labelCount !== null && S.labelCount !== undefined && S.labelCount !== '' && Number(S.labelCount) > 0);
    case 'core':
      return Boolean(S.coreDiameter && Number(S.coreDiameter) > 0 && S.coreName);
    case 'color':
      return Boolean(S.colorMode === 'preprint' || (S.labelColor && S.labelColor.trim() !== ''));
    case 'minOrder':
      return Boolean(S.minOrder !== null && S.minOrder !== undefined && S.minOrder !== '' && Number(S.minOrder) > 0);
    case 'leadTime':
      return Boolean(S.leadTimeDays !== null && S.leadTimeDays !== undefined && String(S.leadTimeDays).trim() !== '' && String(S.leadTimeDays).trim() !== '0');
    default:
      return true;
  }
}
window.shouldShowSpecRow = shouldShowSpecRow;

/**
 * ĐỒNG BỘ HIỂN THỊ BẢNG THÔNG SỐ ĐẶT HÀNG TRÊN 3D THEO CÁC TOGGLE VÀ DỮ LIỆU NHẬP
 */
function syncSpecCardUI() {
  const S = window.AppState;
  const card = document.getElementById('hud-spec-card');
  const masterCheck = document.getElementById('check-master-spec-card');

  if (masterCheck) masterCheck.checked = S.showSpecCard;

  // Đồng bộ từng hàng
  const rowMap = {
    material: document.getElementById('spec-row-material'),
    dimensions: document.getElementById('spec-row-dimensions'),
    spec: document.getElementById('spec-row-spec'),
    rollLength: document.getElementById('spec-row-length'),
    count: document.getElementById('spec-row-count'),
    core: document.getElementById('spec-row-core'),
    color: document.getElementById('spec-row-color'),
    minOrder: document.getElementById('spec-row-minorder'),
    leadTime: document.getElementById('spec-row-leadtime')
  };

  let anyRowVisible = false;
  for (const [key, el] of Object.entries(rowMap)) {
    if (el) {
      const isShow = shouldShowSpecRow(key, S);
      el.style.display = isShow ? 'flex' : 'none';
      if (isShow) anyRowVisible = true;
    }
  }

  // Đồng bộ badge số ngày SX ở header thẻ nếu có
  const hudSpecBadgeDays = document.getElementById('hud-spec-badge-days');
  if (hudSpecBadgeDays) {
    if (shouldShowSpecRow('leadTime', S)) {
      hudSpecBadgeDays.style.display = '';
      const ltStr = S.leadTimeDays ? String(S.leadTimeDays).trim() : '';
      const ltDisplay = ltStr.toLowerCase().includes('ngày') ? ltStr : `${ltStr} ngày`;
      hudSpecBadgeDays.textContent = `SX: ${ltDisplay}`;
    } else {
      hudSpecBadgeDays.style.display = 'none';
    }
  }

  if (card) {
    if (S.showSpecCard && anyRowVisible) {
      card.classList.remove('hidden');
      card.style.display = '';
    } else {
      card.classList.add('hidden');
      card.style.display = 'none';
    }
  }

  // Đồng bộ checkboxes trong menu dropdown
  document.querySelectorAll('.spec-checkbox').forEach(cb => {
    const spec = cb.dataset.spec;
    if (spec && S.specToggles[spec] !== undefined) {
      cb.checked = S.specToggles[spec];
    }
  });

  // Áp dụng tỷ lệ kích thước thẻ
  if (typeof applySpecCardScale === 'function') {
    applySpecCardScale(S.specCardScale || 1.0, false);
  }
}

/**
 * ĐIỀU CHỈNH CỠ CHỮ BẢNG THÔNG SỐ ĐẶT HÀNG (#hud-spec-card)
 * @param {number} scale - Tỷ lệ co giãn (mặc định 1.0 cho 100%)
 */
function applySpecCardScale(scale, updateState = true) {
  const S = window.AppState;
  const num = Math.min(2.0, Math.max(0.75, Number(scale) || 1.0));
  if (updateState) S.specCardScale = num;
  const pct = Math.round(num * 100);

  const card = document.getElementById('hud-spec-card');
  if (card) {
    card.style.setProperty('--hud-scale', num);
    card.style.fontSize = (12 * num) + 'px';
    card.style.width = Math.round(360 * num) + 'px';
    card.style.maxWidth = '95vw';
  }

  const badge = document.getElementById('hud-card-scale-badge');
  if (badge) badge.textContent = `${pct}%`;

  const label = document.getElementById('label-hud-card-scale');
  if (label) label.textContent = `${pct}%`;

  const input = document.getElementById('input-hud-card-scale');
  if (input && Number(input.value) !== pct) input.value = pct;

  document.querySelectorAll('.btn-card-scale-preset').forEach(btn => {
    const isAct = Number(btn.dataset.scale) === pct;
    btn.classList.toggle('active', isAct);
    if (isAct) {
      btn.classList.add('bg-blue-600', 'text-white', 'font-bold', 'border-blue-500');
      btn.classList.remove('bg-slate-800', 'text-slate-300');
    } else {
      btn.classList.remove('bg-blue-600', 'text-white', 'font-bold', 'border-blue-500');
      btn.classList.add('bg-slate-800', 'text-slate-300');
    }
  });
}

/**
 * ĐIỀU CHỈNH CỠ CHỮ SỐ ĐO 3D (W, H, GAP, LÕI) TRÊN THREE.JS
 * @param {number} scale - Tỷ lệ co giãn (ví dụ 1.35 cho 135%)
 */
function applyDimTextScale(scale, updateState = true) {
  const S = window.AppState;
  const num = Math.min(2.5, Math.max(0.65, Number(scale) || 1.35));
  if (updateState) S.dimTextScale = num;
  const pct = Math.round(num * 100);

  const label = document.getElementById('label-dim-text-scale');
  if (label) label.textContent = `${pct}%`;

  const topLabel = document.getElementById('label-top-dim-scale');
  if (topLabel) topLabel.textContent = `${pct}%`;

  const input = document.getElementById('input-dim-text-scale');
  if (input && Number(input.value) !== pct) input.value = pct;

  document.querySelectorAll('.btn-dim-scale-preset').forEach(btn => {
    const isAct = Number(btn.dataset.scale) === pct;
    btn.classList.toggle('active', isAct);
    if (isAct) {
      btn.classList.add('bg-amber-600', 'text-white', 'font-bold', 'border-amber-500');
      btn.classList.remove('bg-slate-800', 'text-slate-300');
    } else {
      btn.classList.remove('bg-amber-600', 'text-white', 'font-bold', 'border-amber-500');
      btn.classList.add('bg-slate-800', 'text-slate-300');
    }
  });

  if (window.Roll3D && typeof window.Roll3D.updateDimensions === 'function') {
    window.Roll3D.updateDimensions();
  }
}

/**
 * TÍNH NĂNG KÉO THẢ DI CHUYỂN BẢNG THÔNG SỐ ĐẶT HÀNG (DRAGGABLE HUD SPEC CARD)
 */
function makeHudSpecCardDraggable() {
  const card = document.getElementById('hud-spec-card');
  const container = document.getElementById('viewport-3d');
  const header = document.getElementById('hud-card-header') || card;
  if (!card || !container || !header) return;

  let isDragging = false;
  let startX = 0, startY = 0;
  let startLeft = 0, startTop = 0;

  function onPointerDown(e) {
    // Bỏ qua nếu bấm vào các phần tử điều khiển (nút bấm, input, select...)
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select') || e.target.closest('a')) {
      return;
    }

    isDragging = true;
    card.classList.add('is-dragging');
    card.style.transition = 'none';

    startX = e.clientX;
    startY = e.clientY;

    const cardRect = card.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    startLeft = cardRect.left - containerRect.left;
    startTop = cardRect.top - containerRect.top;

    // Chuyển sang left/top cố định
    card.style.right = 'auto';
    card.style.bottom = 'auto';
    card.style.left = `${startLeft}px`;
    card.style.top = `${startTop}px`;

    try {
      header.setPointerCapture?.(e.pointerId);
    } catch (err) {}

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    let newLeft = startLeft + dx;
    let newTop = startTop + dy;

    // Giới hạn trong khung viewport 3D
    const maxLeft = Math.max(10, container.clientWidth - card.offsetWidth - 10);
    const maxTop = Math.max(10, container.clientHeight - card.offsetHeight - 10);

    newLeft = Math.max(10, Math.min(maxLeft, newLeft));
    newTop = Math.max(10, Math.min(maxTop, newTop));

    card.style.left = `${newLeft}px`;
    card.style.top = `${newTop}px`;
  }

  function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;
    card.classList.remove('is-dragging');
    card.style.transition = '';

    const totalDist = Math.hypot(e.clientX - startX, e.clientY - startY);
    if (totalDist > 6) {
      card.dataset.userDragged = 'true';
    }

    if (e.pointerId && header.releasePointerCapture) {
      try {
        header.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }

    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
  }

  header.addEventListener('pointerdown', onPointerDown);

  // Nhấp đúp vào thanh tiêu đề để khôi phục vị trí góc mặc định
  header.addEventListener('dblclick', (e) => {
    if (e.target.closest('button')) return;
    delete card.dataset.userDragged;
    card.style.left = '';
    card.style.top = '';
    card.style.right = '';
    card.style.bottom = '';
  });
}

/**
 * ĐIỀU KHIỂN GIAO DIỆN DI ĐỘNG (MOBILE RESPONSIVE HANDLERS)
 */
function closeMobileSidebar() {
  const aside = document.getElementById('sidebar-params');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (aside) aside.classList.remove('mobile-open');
  if (backdrop) backdrop.classList.add('hidden');
}

function openMobileSidebar() {
  const aside = document.getElementById('sidebar-params');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (aside) aside.classList.add('mobile-open');
  if (backdrop) backdrop.classList.remove('hidden');
}

function switchDesignerMobilePane(pane) {
  const toolbox = document.getElementById('bartender-toolbox-panel');
  const canvasWrapper = document.getElementById('designer-canvas-wrapper');
  const inspector = document.getElementById('bartender-inspector-panel');
  const btns = document.querySelectorAll('.designer-mobile-nav-btn');

  btns.forEach(b => {
    const isActive = b.dataset.pane === pane;
    b.classList.toggle('active', isActive);
    if (isActive) {
      b.classList.add('bg-blue-600', 'text-white');
      b.classList.remove('text-slate-400');
    } else {
      b.classList.remove('bg-blue-600', 'text-white');
      b.classList.add('text-slate-400');
    }
  });

  if (window.innerWidth < 768) {
    if (pane === 'toolbox') {
      toolbox?.classList.remove('hidden');
      toolbox?.classList.add('flex');
      canvasWrapper?.classList.add('hidden');
      canvasWrapper?.classList.remove('flex');
      inspector?.classList.add('hidden');
      inspector?.classList.remove('flex');
    } else if (pane === 'inspector') {
      toolbox?.classList.add('hidden');
      toolbox?.classList.remove('flex');
      canvasWrapper?.classList.add('hidden');
      canvasWrapper?.classList.remove('flex');
      inspector?.classList.remove('hidden');
      inspector?.classList.add('flex');
    } else {
      toolbox?.classList.add('hidden');
      toolbox?.classList.remove('flex');
      canvasWrapper?.classList.remove('hidden');
      canvasWrapper?.classList.add('flex');
      inspector?.classList.add('hidden');
      inspector?.classList.remove('flex');
      if (window.LabelDesigner && typeof window.LabelDesigner.render === 'function') {
        setTimeout(() => window.LabelDesigner.render(), 30);
      }
    }
  }
}

/**
 * CHUYỂN ĐỔI GÓC NHÌN CHÍNH (MAIN WORKSPACE VIEW SWITCHER)
 * Tab 1: Mô phỏng 3D Cuộn Tem (#view-3d)
 * Tab 2: Thiết kế tem kéo thả 2D kiểu VNLabel (#view-designer)
 * Tab 3: Bản vẽ kỹ thuật 2D (#view-blueprint)
 * Tab 4: Phiếu duyệt maket (#view-proof)
 */
function switchMainView(viewId) {
  // Đóng drawer cài đặt di động nếu đang mở
  closeMobileSidebar();

  // 1. Cập nhật nút tab chính
  document.querySelectorAll('.main-tab-btn').forEach(btn => {
    const isActive = btn.dataset.view === viewId;
    btn.classList.toggle('active', isActive);
  });

  // 2. Chuyển đổi hiển thị view
  document.querySelectorAll('.main-view').forEach(view => {
    view.classList.toggle('hidden', view.id !== viewId);
  });

  // 3. Khi vào Tab 2 (Thiết Kế Tem 2D BarTender), ẩn sidebar tham số cuộn 3D để không gian thiết kế rộng rãi tối đa
  const leftAside = document.querySelector('aside');
  if (leftAside) {
    if (viewId === 'view-designer') {
      leftAside.classList.add('hidden');
    } else {
      leftAside.classList.remove('hidden');
    }
  }

  if (viewId === 'view-3d') {
    // Tự động đồng bộ maket từ 2D Designer lên cuộn tem 3D tức thì (Bản sạch không dính viền chọn)
    if (window.LabelDesigner && window.Roll3D) {
      if (typeof window.LabelDesigner.getCleanCanvas === 'function') {
        window.Roll3D.syncLabelTexture(window.LabelDesigner.getCleanCanvas());
        window.LabelDesigner.render();
      } else {
        window.Roll3D.syncLabelTexture(window.LabelDesigner.getCanvas());
      }
    }

    // Resize Three.js viewport để hình ảnh 3D chuẩn xác
    setTimeout(() => {
      if (window.Scene3D && typeof window.Scene3D.onWindowResize === 'function') {
        window.Scene3D.onWindowResize();
      }
      window.dispatchEvent(new Event('resize'));
    }, 60);
  } else if (viewId === 'view-designer') {
    // Cân đối kích thước và render canvas thiết kế
    if (window.LabelDesigner) {
      window.LabelDesigner.setupCanvasDimensions();
      window.LabelDesigner.render();
    }
  } else if (viewId === 'view-blueprint') {
    if (window.Blueprint2D) {
      window.Blueprint2D.render();
    }
  }
}
window.switchMainView = switchMainView;

/**
 * KHỞI TẠO BỘ LẮNG NGHE SỰ KIỆN GIAO DIỆN (EVENT LISTENERS)
 */
function initEventListeners() {
  const S = window.AppState;

  // =========================================================
  // SECTION 1: CHẤT LIỆU DECAL (GIẤY THƯỜNG, GIẤY NHIỆT, PVC, XI BẠC)
  // =========================================================
  function setMaterial(matKey) {
    S.materialType = matKey;
    document.querySelectorAll('.material-btn').forEach(btn => {
      const isThis = btn.dataset.material === matKey;
      btn.classList.toggle('active', isThis);
      btn.classList.toggle('border-emerald-500', isThis);
      btn.classList.toggle('bg-emerald-950/40', isThis);
      btn.classList.toggle('border-slate-700', !isThis);
      btn.classList.toggle('bg-slate-900/60', !isThis);
    });

    if (matKey === 'silver') {
      S.materialFinish = 'metallic';
      S.labelColor = '#D8DCE3';
      const picker = document.getElementById('picker-label-color');
      const hexInp = document.getElementById('input-hex-color');
      if (picker) picker.value = '#D8DCE3';
      if (hexInp) hexInp.value = 'D8DCE3';
    } else if (matKey === 'pvc') {
      S.materialFinish = 'gloss';
    } else if (matKey === 'paper_thermal') {
      S.materialFinish = 'matte';
    } else {
      S.materialFinish = 'matte';
    }

    updateHUDAndBadges();
    if (window.Roll3D) {
      window.Roll3D.updateMaterials();
      window.Roll3D.rebuildRoll();
    }
    if (window.Blueprint2D) window.Blueprint2D.render();
  }
  window.setMaterial = setMaterial;

  document.querySelectorAll('.material-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setMaterial(btn.dataset.material);
    });
  });

  // =========================================================
  // SECTION 2: KÍCH THƯỚC CON TEM (W x H mm)
  // =========================================================
  const inputW = document.getElementById('input-label-w');
  const inputH = document.getElementById('input-label-h');

  if (inputW) {
    inputW.addEventListener('input', (e) => {
      const v = e.target.value.trim();
      if (v === '' || isNaN(parseFloat(v)) || parseFloat(v) <= 0) {
        S.labelWidth = null;
      } else {
        S.labelWidth = parseFloat(v);
      }
      onParamsChanged();
    });
  }
  if (inputH) {
    inputH.addEventListener('input', (e) => {
      const v = e.target.value.trim();
      if (v === '' || isNaN(parseFloat(v)) || parseFloat(v) <= 0) {
        S.labelHeight = null;
      } else {
        S.labelHeight = parseFloat(v);
      }
      onParamsChanged();
    });
  }

  // =========================================================
  // SECTION 3: QUY CÁCH (BO GÓC & SỐ TEM/HÀNG)
  // =========================================================
  const inputRadius = document.getElementById('input-radius');
  const inputRadiusNum = document.getElementById('input-radius-num');
  const valRadius = document.getElementById('val-radius');
  const cornerCustomWrapper = document.getElementById('corner-custom-wrapper');

  function updateRadius(val, fromPreset = false) {
    val = Math.max(0, parseFloat(val) || 0);
    S.cornerRadius = val;
    if (inputRadius) inputRadius.value = val;
    if (inputRadiusNum) inputRadiusNum.value = val;
    if (valRadius) valRadius.textContent = `${val} mm`;

    // Cập nhật active nút preset bo góc
    document.querySelectorAll('.corner-preset-btn').forEach(b => {
      const r = b.dataset.r;
      const isMatch = (r !== 'custom' && parseFloat(r) === val);
      b.classList.toggle('active', isMatch);
      b.classList.toggle('bg-blue-600', isMatch);
      b.classList.toggle('text-white', isMatch);
      b.classList.toggle('border-blue-500', isMatch);
      b.classList.toggle('font-bold', isMatch);
      b.classList.toggle('bg-slate-800', !isMatch);
      b.classList.toggle('text-slate-300', !isMatch);
      b.classList.toggle('border-slate-700', !isMatch);
    });

    if (!fromPreset) {
      const customBtn = document.getElementById('btn-corner-custom');
      const isPresetVal = [0, 1, 2, 3].includes(val);
      if (customBtn) {
        customBtn.classList.toggle('active', !isPresetVal);
        customBtn.classList.toggle('bg-blue-600', !isPresetVal);
        customBtn.classList.toggle('text-white', !isPresetVal);
        customBtn.classList.toggle('border-blue-500', !isPresetVal);
      }
    }

    onParamsChanged();
  }

  if (inputRadius) inputRadius.addEventListener('input', (e) => updateRadius(e.target.value));
  if (inputRadiusNum) inputRadiusNum.addEventListener('input', (e) => updateRadius(e.target.value));

  document.querySelectorAll('.corner-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const rVal = btn.dataset.r;
      if (rVal === 'custom') {
        if (cornerCustomWrapper) cornerCustomWrapper.classList.toggle('hidden');
        document.querySelectorAll('.corner-preset-btn').forEach(b => {
          b.classList.remove('active', 'bg-blue-600', 'text-white', 'border-blue-500', 'font-bold');
          b.classList.add('bg-slate-800', 'text-slate-300', 'border-slate-700');
        });
        btn.classList.add('active', 'bg-blue-600', 'text-white', 'border-blue-500', 'font-bold');
        btn.classList.remove('bg-slate-800', 'text-slate-300', 'border-slate-700');
        if (inputRadiusNum) inputRadiusNum.focus();
      } else {
        if (cornerCustomWrapper) cornerCustomWrapper.classList.add('hidden');
        updateRadius(parseFloat(rVal), true);
      }
    });
  });

  // Số tem trên 1 hàng (Ups: 1, 2, 3, 4)
  document.querySelectorAll('.ups-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ups-btn').forEach(b => {
        b.classList.remove('active', 'bg-blue-600', 'text-white', 'border-blue-500');
        b.classList.add('bg-slate-800', 'text-slate-300', 'border-slate-700');
      });
      btn.classList.add('active', 'bg-blue-600', 'text-white', 'border-blue-500');
      btn.classList.remove('bg-slate-800', 'text-slate-300', 'border-slate-700');

      S.ups = parseInt(btn.dataset.ups) || 1;
      onParamsChanged();
    });
  });

  // Gaps & Margins & Perforation
  const inputGapX = document.getElementById('input-gap-x');
  const inputGapY = document.getElementById('input-gap-y');
  const inputMarginX = document.getElementById('input-margin-x');
  const checkPerfor = document.getElementById('check-perforation');

  if (inputGapX) inputGapX.addEventListener('input', (e) => {
    S.gapX = Math.max(0, parseFloat(e.target.value) || 0);
    onParamsChanged();
  });
  if (inputGapY) inputGapY.addEventListener('input', (e) => {
    S.gapY = Math.max(0, parseFloat(e.target.value) || 0);
    onParamsChanged();
  });
  if (inputMarginX) inputMarginX.addEventListener('input', (e) => {
    S.marginX = Math.max(0, parseFloat(e.target.value) || 0);
    onParamsChanged();
  });
  if (checkPerfor) checkPerfor.addEventListener('change', (e) => {
    S.hasPerforation = e.target.checked;
    onParamsChanged();
  });

  // =========================================================
  // SECTION 4: CHIỀU DÀI CUỘN & SỐ TEM (ĐỒNG BỘ 2 CHIỀU THÔNG MINH)
  // =========================================================
  const inputRollLength = document.getElementById('input-roll-length');
  const inputLabelCount = document.getElementById('input-label-count');

  function syncRollLengthFromCount(count, fromInput = false) {
    if (count === '' || count === null || count === undefined) {
      S.labelCount = null;
      S.rollLength = null;
      if (inputLabelCount && !fromInput) inputLabelCount.value = '';
      if (inputRollLength) inputRollLength.value = '';
    } else {
      const num = parseInt(count);
      if (isNaN(num) || num <= 0) {
        S.labelCount = null;
        S.rollLength = null;
        if (inputLabelCount && !fromInput) inputLabelCount.value = '';
        if (inputRollLength) inputRollLength.value = '';
      } else {
        S.labelCount = num;
        const pitch = S.labelHeight + S.gapY;
        const rows = Math.ceil(num / S.ups);
        S.rollLength = Math.max(1, Math.round((rows * pitch) / 1000));
        if (inputRollLength) inputRollLength.value = S.rollLength;
      }
    }

    // Cập nhật active preset chiều dài
    document.querySelectorAll('.length-btn').forEach(b => {
      const isThis = S.rollLength !== null && parseInt(b.dataset.m) === S.rollLength;
      b.classList.toggle('active', isThis);
      b.classList.toggle('bg-amber-600', isThis);
      b.classList.toggle('text-white', isThis);
      b.classList.toggle('border-amber-500', isThis);
      b.classList.toggle('font-bold', isThis);
      b.classList.toggle('bg-slate-800', !isThis);
      b.classList.toggle('text-slate-300', !isThis);
    });

    onParamsChanged();
  }

  function syncCountFromRollLength(m, fromInput = false) {
    if (m === '' || m === null || m === undefined) {
      S.rollLength = null;
      S.labelCount = null;
      if (inputRollLength && !fromInput) inputRollLength.value = '';
      if (inputLabelCount) inputLabelCount.value = '';
    } else {
      const num = parseFloat(m);
      if (isNaN(num) || num <= 0) {
        S.rollLength = null;
        S.labelCount = null;
        if (inputRollLength && !fromInput) inputRollLength.value = '';
        if (inputLabelCount) inputLabelCount.value = '';
      } else {
        S.rollLength = num;
        const pitch = S.labelHeight + S.gapY;
        const rows = Math.floor((S.rollLength * 1000) / pitch);
        S.labelCount = rows * S.ups;
        if (inputLabelCount) inputLabelCount.value = S.labelCount;
      }
    }

    // Cập nhật active preset chiều dài
    document.querySelectorAll('.length-btn').forEach(b => {
      const isThis = S.rollLength !== null && parseInt(b.dataset.m) === S.rollLength;
      b.classList.toggle('active', isThis);
      b.classList.toggle('bg-amber-600', isThis);
      b.classList.toggle('text-white', isThis);
      b.classList.toggle('border-amber-500', isThis);
      b.classList.toggle('font-bold', isThis);
      b.classList.toggle('bg-slate-800', !isThis);
      b.classList.toggle('text-slate-300', !isThis);
    });

    onParamsChanged();
  }

  if (inputRollLength) {
    inputRollLength.addEventListener('input', (e) => {
      syncCountFromRollLength(e.target.value, true);
    });
  }

  if (inputLabelCount) {
    inputLabelCount.addEventListener('input', (e) => {
      syncRollLengthFromCount(e.target.value, true);
    });
  }

  // Nút chọn nhanh chiều dài (30m, 50m, 100m)
  document.querySelectorAll('.length-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const m = parseInt(btn.dataset.m);
      if (inputRollLength) inputRollLength.value = m;
      syncCountFromRollLength(m, false);
    });
  });

  // =========================================================
  // SECTION 5: LÕI CUỘN (1 INCH, 3 INCH, 30MM, TỰ NHẬP)
  // =========================================================
  const customCoreWrapper = document.getElementById('custom-core-wrapper');
  const inputCustomCore = document.getElementById('input-custom-core');

  document.querySelectorAll('.core-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.core-btn').forEach(b => {
        b.classList.remove('active', 'bg-amber-600', 'text-white', 'border-amber-500', 'font-bold');
        b.classList.add('bg-slate-800', 'text-slate-300', 'border-slate-700');
      });
      btn.classList.add('active', 'bg-amber-600', 'text-white', 'border-amber-500', 'font-bold');
      btn.classList.remove('bg-slate-800', 'text-slate-300', 'border-slate-700');

      if (btn.dataset.core === 'custom') {
        if (customCoreWrapper) customCoreWrapper.classList.remove('hidden');
        const customVal = Math.max(10, Math.min(250, parseFloat(inputCustomCore?.value) || 40));
        S.coreDiameter = customVal;
        S.coreName = customVal + 'mm';
        if (inputCustomCore) inputCustomCore.focus();
      } else {
        if (customCoreWrapper) customCoreWrapper.classList.add('hidden');
        S.coreDiameter = parseFloat(btn.dataset.core);
        S.coreName = btn.dataset.name;
      }
      onParamsChanged();
    });
  });

  if (inputCustomCore) {
    inputCustomCore.addEventListener('input', (e) => {
      const val = Math.max(10, Math.min(250, parseFloat(e.target.value) || 10));
      S.coreDiameter = val;
      S.coreName = val + 'mm';
      onParamsChanged();
    });
  }

  // =========================================================
  // SECTION 6: MÀU NỀN CON TEM (TRẮNG, XANH, ĐỎ, PHÔI SẴN & HEX)
  // =========================================================
  const pickerColor = document.getElementById('picker-label-color');
  const inputHex = document.getElementById('input-hex-color');

  function setLabelColor(hex, mode = null) {
    if (!hex.startsWith('#')) hex = '#' + hex;
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      S.labelColor = hex.toUpperCase();
      if (mode) S.colorMode = mode;
      else {
        if (S.labelColor === '#FFFFFF') S.colorMode = 'white';
        else if (S.labelColor === '#2563EB') S.colorMode = 'blue';
        else if (S.labelColor === '#DC2626') S.colorMode = 'red';
        else S.colorMode = 'custom';
      }

      if (pickerColor) pickerColor.value = S.labelColor;
      if (inputHex) inputHex.value = S.labelColor.replace('#', '');

      // Cập nhật active mode buttons
      document.querySelectorAll('.color-mode-btn').forEach(b => {
        const isMatch = b.dataset.mode === S.colorMode;
        b.classList.toggle('ring-2', isMatch);
        b.classList.toggle('ring-blue-400', isMatch);
      });

      updateHUDAndBadges();
      if (window.LabelDesigner) window.LabelDesigner.setBaseColor(S.labelColor);
      if (window.Roll3D) window.Roll3D.updateMaterials();
      if (window.Blueprint2D) window.Blueprint2D.render();
    }
  }
  window.setLabelColor = setLabelColor;

  if (pickerColor) {
    pickerColor.addEventListener('input', (e) => setLabelColor(e.target.value));
  }
  if (inputHex) {
    inputHex.addEventListener('input', (e) => {
      let val = e.target.value.trim();
      if (val.length === 6) setLabelColor(val);
    });
  }

  // 4 Nút màu nhanh theo yêu cầu: Trắng, Xanh, Đỏ, Phôi sẵn
  document.querySelectorAll('.color-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      if (mode === 'preprint') {
        S.colorMode = 'preprint';
        setLabelColor('#FFFFFF', 'preprint');
      } else {
        const hex = btn.dataset.hex || '#FFFFFF';
        setLabelColor(hex, mode);
      }
    });
  });

  // =========================================================
  // SECTION 7: THỜI GIAN SẢN XUẤT (1 NGÀY, 2 NGÀY, 3 NGÀY, 3-4 NGÀY, TỰ NHẬP TEXT)
  // =========================================================
  const inputLeadTime = document.getElementById('input-lead-time');

  function setLeadTime(days, fromInput = false) {
    if (days === '' || days === null || days === undefined) {
      S.leadTimeDays = null;
      if (inputLeadTime && !fromInput) inputLeadTime.value = '';
    } else {
      const strVal = String(days).trim();
      if (!strVal || strVal === '0') {
        S.leadTimeDays = null;
        if (inputLeadTime && !fromInput) inputLeadTime.value = '';
      } else {
        S.leadTimeDays = strVal;
        if (inputLeadTime && !fromInput) inputLeadTime.value = strVal;
      }
    }

    const currentVal = S.leadTimeDays ? String(S.leadTimeDays).trim().toLowerCase() : '';
    document.querySelectorAll('.leadtime-btn').forEach(b => {
      const bDays = (b.dataset.days || '').trim().toLowerCase();
      const bDaysNoUnit = bDays.replace(/\s*ngày/g, '').trim();
      const currentValNoUnit = currentVal.replace(/\s*ngày/g, '').trim();
      const isThis = currentVal !== '' && (bDays === currentVal || bDaysNoUnit === currentValNoUnit);
      b.classList.toggle('active', isThis);
      b.classList.toggle('bg-teal-600', isThis);
      b.classList.toggle('text-white', isThis);
      b.classList.toggle('border-teal-500', isThis);
      b.classList.toggle('font-bold', isThis);
      b.classList.toggle('bg-slate-800', !isThis);
      b.classList.toggle('text-slate-300', !isThis);
      b.classList.toggle('border-slate-700', !isThis);
    });

    updateHUDAndBadges();
  }

  document.querySelectorAll('.leadtime-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setLeadTime(btn.dataset.days, false);
    });
  });

  if (inputLeadTime) {
    inputLeadTime.addEventListener('input', (e) => {
      setLeadTime(e.target.value, true);
    });
    inputLeadTime.addEventListener('blur', (e) => {
      let val = e.target.value.trim();
      if (val && /^\d+(-\d+)?$/.test(val)) {
        val = `${val} ngày`;
        setLeadTime(val, false);
      }
    });
  }

  // 8B. ĐẶT HÀNG TỐI THIỂU (MOQ)
  const inputMinOrder = document.getElementById('input-min-order');
  function setMinOrder(val, isPresetClick = false, fromInput = false) {
    if (val === '' || val === null || val === undefined) {
      S.minOrder = null;
      if (inputMinOrder && !fromInput) inputMinOrder.value = '';
    } else {
      const num = parseInt(val);
      if (isNaN(num) || num <= 0) {
        S.minOrder = null;
        if (inputMinOrder && !fromInput) inputMinOrder.value = '';
      } else {
        S.minOrder = num;
        if (inputMinOrder && !fromInput && !isPresetClick) inputMinOrder.value = num;
      }
    }

    document.querySelectorAll('.minorder-btn').forEach(b => {
      const bVal = b.dataset.val;
      let isThis = false;
      if (S.minOrder !== null) {
        if (bVal === 'custom') {
          isThis = (S.minOrder !== 20 && S.minOrder !== 30);
        } else {
          isThis = parseInt(bVal) === S.minOrder;
        }
      }
      b.classList.toggle('active', isThis);
      b.classList.toggle('bg-purple-600', isThis);
      b.classList.toggle('text-white', isThis);
      b.classList.toggle('border-purple-500', isThis);
      b.classList.toggle('font-bold', isThis);
      b.classList.toggle('bg-slate-800', !isThis);
      b.classList.toggle('text-slate-300', !isThis);
      b.classList.toggle('border-slate-700', !isThis);
    });

    updateHUDAndBadges();
  }

  document.querySelectorAll('.minorder-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.val;
      if (val === 'custom') {
        if (inputMinOrder) {
          inputMinOrder.focus();
          inputMinOrder.select();
        }
        document.querySelectorAll('.minorder-btn').forEach(b => {
          const isThis = b.dataset.val === 'custom';
          b.classList.toggle('active', isThis);
          b.classList.toggle('bg-purple-600', isThis);
          b.classList.toggle('text-white', isThis);
          b.classList.toggle('border-purple-500', isThis);
          b.classList.toggle('font-bold', isThis);
          b.classList.toggle('bg-slate-800', !isThis);
          b.classList.toggle('text-slate-300', !isThis);
          b.classList.toggle('border-slate-700', !isThis);
        });
      } else {
        if (inputMinOrder) inputMinOrder.value = val;
        setMinOrder(val, true, false);
      }
    });
  });

  if (inputMinOrder) {
    inputMinOrder.addEventListener('input', (e) => {
      setMinOrder(e.target.value, false, true);
    });
  }

  // Màu đế giấy
  const selectLinerColor = document.getElementById('select-liner-color');
  if (selectLinerColor) {
    selectLinerColor.addEventListener('change', (e) => {
      S.linerColor = e.target.value;
      if (window.Roll3D) window.Roll3D.updateMaterials();
      if (window.Blueprint2D) window.Blueprint2D.render();
    });
  }

  // Chất liệu màng
  const selectMaterial = document.getElementById('select-material-finish');
  if (selectMaterial) {
    selectMaterial.addEventListener('change', (e) => {
      S.materialFinish = e.target.value;
      if (window.LabelDesigner) window.LabelDesigner.render();
      if (window.Roll3D) window.Roll3D.updateMaterials();
      if (window.Blueprint2D) window.Blueprint2D.render();
    });
  }

  // 10. PRESET SELECTOR & CUSTOM PRESET STORAGE
  const presetSelector = document.getElementById('preset-selector');
  if (presetSelector) {
    presetSelector.addEventListener('change', (e) => {
      const presetKey = e.target.value;
      if (LABEL_PRESETS[presetKey]) {
        applyPreset(LABEL_PRESETS[presetKey]);
      }
    });
  }

  // Nút mở modal Lưu Mẫu (ở thanh Header và ở Sidebar Mục 1)
  document.getElementById('btn-save-custom-preset')?.addEventListener('click', openSavePresetModal);
  document.getElementById('btn-sidebar-save-preset')?.addEventListener('click', openSavePresetModal);

  // Các nút trong Modal Lưu Mẫu
  document.getElementById('btn-close-save-preset-modal')?.addEventListener('click', closeSavePresetModal);
  document.getElementById('btn-cancel-save-preset')?.addEventListener('click', closeSavePresetModal);
  document.getElementById('btn-confirm-save-preset')?.addEventListener('click', confirmSavePreset);

  const inputPresetName = document.getElementById('input-save-preset-name');
  if (inputPresetName) {
    inputPresetName.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        confirmSavePreset();
      }
    });
  }

  const modalSavePreset = document.getElementById('modal-save-preset');
  if (modalSavePreset) {
    modalSavePreset.addEventListener('click', (e) => {
      if (e.target === modalSavePreset) closeSavePresetModal();
    });
  }

  // 11. MAIN WORKSPACE TAB SWITCHING (TAB 1: 3D, TAB 2: DESIGNER, TAB 3: BLUEPRINT, TAB 4: PROOF)
  document.querySelectorAll('.main-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const viewId = btn.dataset.view;
      if (viewId) switchMainView(viewId);
    });
  });

  // Nút chuyển về 3D từ thanh header
  document.querySelectorAll('#btn-header-to-3d').forEach(btn => {
    btn.addEventListener('click', () => {
      switchMainView('view-3d');
    });
  });

  // Nút nhảy sang Designer Tab 2
  document.querySelectorAll('#btn-quick-goto-designer, .btn-jump-to-designer').forEach(btn => {
    btn.addEventListener('click', () => {
      switchMainView('view-designer');
    });
  });

  // Tải bản vẽ 2D từ view chính
  document.getElementById('btn-download-blueprint-main')?.addEventListener('click', () => {
    const canvas = document.getElementById('blueprint-canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `ban-ve-ky-thuat-tem-${window.AppState.labelWidth}x${window.AppState.labelHeight}mm.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  });

  // Mở phiếu duyệt mẫu từ view-proof
  document.getElementById('btn-generate-proof-sheet-view')?.addEventListener('click', () => {
    const cName = document.getElementById('proof-company-name-view')?.value;
    const clName = document.getElementById('proof-client-name-view')?.value;
    const jId = document.getElementById('proof-job-id-view')?.value;
    const pDate = document.getElementById('proof-date-view')?.value;
    const dName = document.getElementById('proof-designer-name-view')?.value;

    if (document.getElementById('proof-company-name') && cName) document.getElementById('proof-company-name').value = cName;
    if (document.getElementById('proof-client-name') && clName) document.getElementById('proof-client-name').value = clName;
    if (document.getElementById('proof-job-id') && jId) document.getElementById('proof-job-id').value = jId;
    if (document.getElementById('proof-date') && pDate) document.getElementById('proof-date').value = pDate;
    if (document.getElementById('proof-designer-name') && dName) document.getElementById('proof-designer-name').value = dName;

    if (window.ExportProof) window.ExportProof.openProofModal();
  });

  // 11B. MOBILE RESPONSIVE EVENT LISTENERS
  document.getElementById('btn-open-sidebar-mobile')?.addEventListener('click', openMobileSidebar);
  document.getElementById('btn-close-sidebar-mobile')?.addEventListener('click', closeMobileSidebar);
  document.getElementById('sidebar-backdrop')?.addEventListener('click', closeMobileSidebar);

  // Designer mobile sub-nav clicks
  document.querySelectorAll('.designer-mobile-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pane = btn.dataset.pane;
      if (pane) switchDesignerMobilePane(pane);
    });
  });

  // Tự động khôi phục giao diện khi xoay ngang hoặc phóng to màn hình desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) {
      const toolbox = document.getElementById('bartender-toolbox-panel');
      const canvasWrapper = document.getElementById('designer-canvas-wrapper');
      const inspector = document.getElementById('bartender-inspector-panel');
      toolbox?.classList.remove('hidden');
      toolbox?.classList.add('flex');
      canvasWrapper?.classList.remove('hidden');
      canvasWrapper?.classList.add('flex');
      inspector?.classList.remove('hidden');
      closeMobileSidebar();
    }
  });

  // 11C. NÚT RESET VỀ TEM TRẮNG TINH (CLEAR ALL ELEMENTS -> PURE BLANK LABEL)
  function handleResetBlankLabel() {
    if (window.LabelDesigner && typeof window.LabelDesigner.initBlankLabel === 'function') {
      window.LabelDesigner.initBlankLabel();
    }
    // Hiển thị thông báo nhẹ
    const toast = document.createElement('div');
    toast.className = 'fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-cyan-500/80 text-cyan-300 text-xs font-semibold px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200';
    toast.innerHTML = '<i class="fa-solid fa-circle-check text-cyan-400"></i><span>Đã đưa về tem trắng tinh (xóa sạch nội dung & khung)!</span>';
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('opacity-0', 'transition-opacity');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  document.getElementById('btn-reset-blank-label')?.addEventListener('click', handleResetBlankLabel);
  document.getElementById('btn-sidebar-reset-blank')?.addEventListener('click', handleResetBlankLabel);
  document.getElementById('btn-top-reset-blank')?.addEventListener('click', handleResetBlankLabel);

  // 12. 3D FLOATING BUTTONS
  const btnToggleSpin = document.getElementById('btn-toggle-spin');
  if (btnToggleSpin) {
    btnToggleSpin.addEventListener('click', () => {
      S.autoSpin = !S.autoSpin;
      btnToggleSpin.classList.toggle('active', S.autoSpin);
      if (window.Scene3D) window.Scene3D.setAutoRotate(S.autoSpin);
    });
  }

  const btnToggleDims = document.getElementById('btn-toggle-dims');
  if (btnToggleDims) {
    btnToggleDims.addEventListener('click', () => {
      S.show3DDimensions = !S.show3DDimensions;
      syncDimTogglesUI();
      if (window.Roll3D) window.Roll3D.toggleDimensions(S.show3DDimensions);
    });
  }

  // 12B. ĐIỀU KHIỂN BẬT/TẮT TỪNG KHOẢNG CÁCH THƯỚC ĐO 3D
  function syncDimTogglesUI() {
    // Cập nhật checkboxes trong menu dropdown
    document.querySelectorAll('.dim-checkbox').forEach(cb => {
      const dim = cb.dataset.dim;
      if (dim && S.dimToggles[dim] !== undefined) {
        cb.checked = S.dimToggles[dim];
      }
    });

    // Cập nhật nút mắt trong bảng điều khiển bên trái
    document.querySelectorAll('.dim-eye-btn').forEach(btn => {
      const dim = btn.dataset.dim;
      if (dim && S.dimToggles[dim] !== undefined) {
        const active = S.dimToggles[dim];
        const icon = btn.querySelector('i');
        if (icon) {
          icon.className = active ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash text-slate-500';
        }
      }
    });

    // Cập nhật trạng thái nút chính
    const btnDims = document.getElementById('btn-toggle-dims');
    const btnDropdown = document.getElementById('btn-dims-dropdown-toggle');
    if (btnDims) btnDims.classList.toggle('active', S.show3DDimensions);
    if (btnDropdown) btnDropdown.classList.toggle('active', S.show3DDimensions);
  }

  // Lắng nghe click các nút mắt ở thanh sidebar bên trái
  document.querySelectorAll('.dim-eye-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const dim = btn.dataset.dim;
      if (dim && S.dimToggles[dim] !== undefined) {
        S.dimToggles[dim] = !S.dimToggles[dim];
        // Nếu đang tắt toàn bộ thước đo 3D mà người dùng bật 1 kích thước, bật luôn thước đo
        if (S.dimToggles[dim] && !S.show3DDimensions) {
          S.show3DDimensions = true;
        }
        syncDimTogglesUI();
        if (window.Roll3D) window.Roll3D.updateDimensions();
      }
    });
  });

  // Lắng nghe thay đổi các checkbox kích thước 3D trong popup dropdown
  document.querySelectorAll('.dim-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      const dim = cb.dataset.dim;
      if (dim && S.dimToggles[dim] !== undefined) {
        S.dimToggles[dim] = cb.checked;
        if (cb.checked && !S.show3DDimensions) {
          S.show3DDimensions = true;
        }
        syncDimTogglesUI();
        if (window.Roll3D) window.Roll3D.updateDimensions();
      }
    });
  });

  // Lắng nghe master switch Bảng thông số đặt hàng
  const checkMasterSpec = document.getElementById('check-master-spec-card');
  if (checkMasterSpec) {
    checkMasterSpec.addEventListener('change', (e) => {
      S.showSpecCard = e.target.checked;
      syncSpecCardUI();
    });
  }

  // Lắng nghe từng checkbox trong Bảng thông số đặt hàng (spec-checkbox)
  document.querySelectorAll('.spec-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      const spec = cb.dataset.spec;
      if (spec && S.specToggles[spec] !== undefined) {
        S.specToggles[spec] = cb.checked;
        if (cb.checked && !S.showSpecCard) {
          S.showSpecCard = true;
        }
        syncSpecCardUI();
      }
    });
  });

  // Nút thu gọn / mở rộng bảng thông số 3D (#btn-toggle-hud-card)
  const btnToggleHud = document.getElementById('btn-toggle-hud-card');
  const hudBody = document.getElementById('hud-card-body');
  const hudChevron = document.getElementById('hud-card-chevron');
  if (btnToggleHud && hudBody) {
    btnToggleHud.addEventListener('click', () => {
      const isCollapsed = hudBody.classList.contains('hidden');
      if (isCollapsed) {
        hudBody.classList.remove('hidden');
        if (hudChevron) hudChevron.style.transform = 'rotate(0deg)';
      } else {
        hudBody.classList.add('hidden');
        if (hudChevron) hudChevron.style.transform = 'rotate(180deg)';
      }
    });
  }

  // Nút Bật hết / Tắt hết trong popup (áp dụng cho cả Thước đo 3D và Bảng thông số đặt hàng)
  document.getElementById('btn-dims-all-on')?.addEventListener('click', () => {
    // 1. Thước đo 3D
    for (const k in S.dimToggles) S.dimToggles[k] = true;
    S.show3DDimensions = true;
    syncDimTogglesUI();
    if (window.Roll3D) window.Roll3D.updateDimensions();

    // 2. Bảng thông số đặt hàng
    S.showSpecCard = true;
    for (const k in S.specToggles) S.specToggles[k] = true;
    syncSpecCardUI();
  });

  document.getElementById('btn-dims-all-off')?.addEventListener('click', () => {
    // 1. Thước đo 3D
    for (const k in S.dimToggles) S.dimToggles[k] = false;
    syncDimTogglesUI();
    if (window.Roll3D) window.Roll3D.updateDimensions();

    // 2. Bảng thông số đặt hàng
    S.showSpecCard = false;
    for (const k in S.specToggles) S.specToggles[k] = false;
    syncSpecCardUI();
  });

  // Mở/Đóng menu dropdown tùy chọn kích thước
  const btnDimsDropdownToggle = document.getElementById('btn-dims-dropdown-toggle');
  const dimsDropdownMenu = document.getElementById('dims-dropdown-menu');
  if (btnDimsDropdownToggle && dimsDropdownMenu) {
    btnDimsDropdownToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      dimsDropdownMenu.classList.toggle('hidden');
    });

    // Đóng khi click ngoài
    document.addEventListener('click', (e) => {
      if (!dimsDropdownMenu.contains(e.target) && e.target !== btnDimsDropdownToggle) {
        dimsDropdownMenu.classList.add('hidden');
      }
    });
  }

  // 12C. ĐIỀU KHIỂN PHÓNG TO / THU NHỎ BẢNG THÔNG SỐ VÀ SỐ ĐO 3D
  // Range slider chỉnh cỡ chữ thẻ thông số đặt hàng
  const inputHudScale = document.getElementById('input-hud-card-scale');
  if (inputHudScale) {
    inputHudScale.addEventListener('input', (e) => {
      applySpecCardScale(Number(e.target.value) / 100);
    });
  }

  // Nút preset cỡ chữ bảng thông số (90%, 105%, 120%, 150%)
  document.querySelectorAll('.btn-card-scale-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = Number(btn.dataset.scale);
      if (val) applySpecCardScale(val / 100);
    });
  });

  // Nút A- / A+ ngay trên header thẻ thông số
  document.getElementById('btn-card-zoom-in')?.addEventListener('click', () => {
    const cur = Math.round((S.specCardScale || 1.0) * 10);
    applySpecCardScale(Math.min(1.7, (cur + 1) / 10));
  });

  document.getElementById('btn-card-zoom-out')?.addEventListener('click', () => {
    const cur = Math.round((S.specCardScale || 1.0) * 10);
    applySpecCardScale(Math.max(0.8, (cur - 1) / 10));
  });

  // NÚT SAO CHÉP TOÀN BỘ THÔNG SỐ ĐẶT HÀNG (1 PHÁT COPY HẾT)
  const btnCopySpec = document.getElementById('btn-copy-spec-card');
  if (btnCopySpec) {
    btnCopySpec.addEventListener('click', (e) => {
      e.stopPropagation();
      copySpecCardToClipboard();
    });
  }

  function copySpecCardToClipboard() {
    const S = window.AppState;
    const lines = ['📋 THÔNG SỐ ĐẶT HÀNG TEM NHÃN:'];

    const matNames = {
      paper_normal: 'Giấy thường (xé rách được)',
      paper_thermal: 'Giấy nhiệt (xé rách được)',
      pvc: 'PVC (xé không rách)',
      silver: 'Xi bạc (ánh kim)',
      matte: 'Decal giấy thường / mờ',
      gloss: 'Cán màng bóng'
    };

    if (shouldShowSpecRow('material', S)) {
      lines.push(`• Chất liệu: ${matNames[S.materialType] || 'Giấy thường (xé rách được)'}`);
    }
    if (shouldShowSpecRow('dimensions', S)) {
      lines.push(`• Kích thước: ${S.labelWidth} x ${S.labelHeight} mm (ngang x cao)`);
    }
    if (shouldShowSpecRow('spec', S)) {
      const cornerStr = S.cornerRadius > 0 ? `Bo góc R${S.cornerRadius}` : 'Góc vuông';
      lines.push(`• Quy cách: ${cornerStr} - ${S.ups} tem/hàng`);
    }
    if (shouldShowSpecRow('rollLength', S)) {
      lines.push(`• Chiều dài cuộn: ${S.rollLength}m / cuộn`);
    }
    if (shouldShowSpecRow('count', S)) {
      lines.push(`• Số tem ước tính: khoảng ${S.labelCount ? S.labelCount.toLocaleString('vi-VN') : ''} tem / cuộn`);
    }
    if (shouldShowSpecRow('core', S)) {
      const coreStr = S.coreName.includes('inch') ? `${S.coreName} (${S.coreDiameter.toFixed(1)}mm)` : `Lõi ${S.coreDiameter.toFixed(0)}mm`;
      lines.push(`• Lõi cuộn: ${coreStr}`);
    }
    if (shouldShowSpecRow('color', S)) {
      const colName = S.colorMode === 'preprint' ? 'In phôi sẵn' : (S.colorMode === 'white' ? 'Trắng' : (S.colorMode === 'blue' ? 'Xanh' : (S.colorMode === 'red' ? 'Đỏ' : S.labelColor)));
      lines.push(`• Màu nền: ${colName}`);
    }
    if (shouldShowSpecRow('minOrder', S)) {
      lines.push(`• Đặt hàng tối thiểu: ${S.minOrder} cuộn`);
    }
    if (shouldShowSpecRow('leadTime', S)) {
      const ltStr = S.leadTimeDays ? String(S.leadTimeDays).trim() : '';
      const ltDisplay = ltStr.toLowerCase().includes('ngày') ? ltStr : `${ltStr} ngày`;
      lines.push(`• Thời gian SX: ${ltDisplay}`);
    }

    const fullText = lines.join('\n');

    const onSuccess = () => {
      const icon = document.getElementById('icon-copy-spec');
      const text = document.getElementById('text-copy-spec');
      if (icon) icon.className = 'fa-solid fa-check text-emerald-400 text-[11px]';
      if (text) {
        text.textContent = 'Đã chép!';
        text.className = 'text-emerald-300 font-bold';
      }
      btnCopySpec.classList.add('border-emerald-500', 'bg-emerald-950/60');

      setTimeout(() => {
        if (icon) icon.className = 'fa-regular fa-copy text-[11px]';
        if (text) {
          text.textContent = 'Copy';
          text.className = '';
        }
        btnCopySpec.classList.remove('border-emerald-500', 'bg-emerald-950/60');
      }, 2000);

      showPresetToast('Đã sao chép toàn bộ thông số đặt hàng vào bộ nhớ tạm!');
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(fullText).then(onSuccess).catch(() => {
        fallbackCopyText(fullText, onSuccess);
      });
    } else {
      fallbackCopyText(fullText, onSuccess);
    }
  }

  function fallbackCopyText(text, cb) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
      if (cb) cb();
    } catch (err) {
      console.warn('Copy failed', err);
    }
    document.body.removeChild(ta);
  }

  // Range slider chỉnh cỡ số đo 3D (W, H, Gap, Lõi)
  const inputDimScale = document.getElementById('input-dim-text-scale');
  if (inputDimScale) {
    inputDimScale.addEventListener('input', (e) => {
      applyDimTextScale(Number(e.target.value) / 100);
    });
  }

  // Nút preset cỡ số đo 3D (85%, 110%, 135%, 180%)
  document.querySelectorAll('.btn-dim-scale-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = Number(btn.dataset.scale);
      if (val) applyDimTextScale(val / 100);
    });
  });

  // Nút A- / A+ trực tiếp trên thanh công cụ cho số đo 3D (2mm, 50mm, 30mm, Lõi...)
  document.getElementById('btn-top-dim-zoom-in')?.addEventListener('click', () => {
    const cur = Math.round((S.dimTextScale || 1.35) * 100);
    applyDimTextScale(Math.min(2.3, (cur + 20) / 100));
  });

  document.getElementById('btn-top-dim-zoom-out')?.addEventListener('click', () => {
    const cur = Math.round((S.dimTextScale || 1.35) * 100);
    applyDimTextScale(Math.max(0.7, (cur - 20) / 100));
  });

  // Khởi tạo trạng thái icon mắt & checkbox lần đầu
  syncDimTogglesUI();
  syncSpecCardUI();
  applySpecCardScale(S.specCardScale || 1.0, false);
  applyDimTextScale(S.dimTextScale || 1.35, false);
  makeHudSpecCardDraggable();

  const btnToggleBg = document.getElementById('btn-toggle-bg');
  if (btnToggleBg) {
    btnToggleBg.addEventListener('click', () => {
      S.studioBg = S.studioBg === 'dark' ? 'light' : 'dark';
      if (window.Scene3D) window.Scene3D.setStudioBackground(S.studioBg);
    });
  }

  // Camera presets
  const viewButtons = ['front', 'iso', 'side', 'top', 'flap'];
  viewButtons.forEach(vt => {
    const btn = document.getElementById(`btn-view-${vt}`);
    if (btn) {
      btn.addEventListener('click', () => {
        viewButtons.forEach(other => document.getElementById(`btn-view-${other}`)?.classList.remove('active'));
        btn.classList.add('active');
        window.Scene3D?.setCameraView(vt);
      });
    }
  });

  // 13. NÚT XUẤT ẢNH TÙY CHỌN KÍCH THƯỚC (600x600, 800x800, TÙY CHỈNH...)
  document.getElementById('btn-snap-3d')?.addEventListener('click', () => {
    openCustomExportModal('3d');
  });

  // Modal Xuất ảnh các nút bấm
  document.getElementById('btn-close-export-modal')?.addEventListener('click', closeCustomExportModal);
  document.getElementById('btn-cancel-export-modal')?.addEventListener('click', closeCustomExportModal);
  document.getElementById('btn-confirm-export-img')?.addEventListener('click', () => confirmCustomExport());
  document.getElementById('btn-quick-export-roll')?.addEventListener('click', () => confirmCustomExport(false));

  // Chọn 1 trong 2 chế độ xuất ảnh 3D
  document.querySelectorAll('.export-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setExport3DMode(btn.dataset.mode);
    });
  });

  const modalExport = document.getElementById('modal-custom-export');
  if (modalExport) {
    modalExport.addEventListener('click', (e) => {
      if (e.target === modalExport) closeCustomExportModal();
    });
  }

  // Nguồn ảnh (3D hoặc Designer)
  document.querySelectorAll('.export-source-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentExportSource = btn.dataset.source || '3d';
      syncExportSourceUI();
    });
  });

  // Chọn kích thước mẫu sẵn (Presets)
  document.querySelectorAll('.export-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const bw = btn.dataset.w;
      const bh = btn.dataset.h;
      if (bw === 'custom' || bh === 'custom') {
        document.querySelectorAll('.export-preset-btn').forEach(b => b.classList.remove('active', 'bg-emerald-600/20', 'border-emerald-500', 'text-emerald-300'));
        btn.classList.add('active', 'bg-emerald-600/20', 'border-emerald-500', 'text-emerald-300');
        document.getElementById('input-export-width')?.focus();
      } else {
        setExportPreset(parseInt(bw), parseInt(bh));
      }
    });
  });

  // Nhập kích thước tự do
  function onCustomDimInput() {
    const w = parseInt(document.getElementById('input-export-width')?.value) || 800;
    const h = parseInt(document.getElementById('input-export-height')?.value) || 800;
    updateExportDimensionsSummary(w, h);

    // Highlight preset nếu khớp, ngược lại highlight Tùy Chỉnh
    let foundMatch = false;
    document.querySelectorAll('.export-preset-btn').forEach(b => {
      const isThis = parseInt(b.dataset.w) === w && parseInt(b.dataset.h) === h;
      if (isThis) foundMatch = true;
      b.classList.toggle('active', isThis);
      b.classList.toggle('bg-emerald-600/20', isThis);
      b.classList.toggle('border-emerald-500', isThis);
      b.classList.toggle('text-emerald-300', isThis);
      b.classList.toggle('bg-slate-800', !isThis);
      b.classList.toggle('text-slate-300', !isThis);
      b.classList.toggle('border-slate-700', !isThis);
    });

    if (!foundMatch) {
      const customBtn = document.querySelector('.export-preset-btn[data-w="custom"]');
      if (customBtn) {
        customBtn.classList.add('active', 'bg-emerald-600/20', 'border-emerald-500', 'text-emerald-300');
        customBtn.classList.remove('bg-slate-800', 'text-slate-300', 'border-slate-700');
      }
    }
  }

  document.getElementById('input-export-width')?.addEventListener('input', onCustomDimInput);
  document.getElementById('input-export-height')?.addEventListener('input', onCustomDimInput);

  // Khóa tỷ lệ nhanh (1:1, 4:3, 16:9)
  document.querySelectorAll('.btn-quick-ratio').forEach(btn => {
    btn.addEventListener('click', () => {
      const ratio = btn.dataset.ratio;
      const inpW = document.getElementById('input-export-width');
      const inpH = document.getElementById('input-export-height');
      const w = parseInt(inpW?.value) || 800;
      if (ratio === '1:1') {
        if (inpH) inpH.value = w;
      } else if (ratio === '4:3') {
        if (inpH) inpH.value = Math.round((w * 3) / 4);
      } else if (ratio === '16:9') {
        if (inpH) inpH.value = Math.round((w * 9) / 16);
      }
      onCustomDimInput();
    });
  });
}

/**
 * ÁP DỤNG PRESET
 */
function applyPreset(p) {
  const S = window.AppState;
  Object.assign(S, p);

  // Cập nhật DOM inputs
  document.getElementById('input-label-w').value = S.labelWidth;
  document.getElementById('input-label-h').value = S.labelHeight;
  document.getElementById('input-radius').value = S.cornerRadius;
  document.getElementById('input-radius-num').value = S.cornerRadius;
  document.getElementById('val-radius').textContent = `${S.cornerRadius} mm`;

  document.querySelectorAll('.ups-btn').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.ups) === S.ups);
    b.classList.toggle('bg-blue-600', parseInt(b.dataset.ups) === S.ups);
    b.classList.toggle('text-white', parseInt(b.dataset.ups) === S.ups);
  });

  document.querySelectorAll('.shape-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.shape === S.shape);
    b.classList.toggle('bg-blue-600', b.dataset.shape === S.shape);
    b.classList.toggle('text-white', b.dataset.shape === S.shape);
  });

  document.getElementById('input-gap-x').value = S.gapX;
  document.getElementById('input-gap-y').value = S.gapY;
  document.getElementById('input-margin-x').value = S.marginX;
  document.getElementById('check-perforation').checked = S.hasPerforation;

  let matchedPresetCore = false;
  document.querySelectorAll('.core-btn').forEach(b => {
    if (b.dataset.core !== 'custom') {
      const isThis = Math.abs(parseFloat(b.dataset.core) - S.coreDiameter) < 0.5;
      if (isThis) matchedPresetCore = true;
      b.classList.toggle('active', isThis);
      b.classList.toggle('bg-amber-600', isThis);
      b.classList.toggle('text-white', isThis);
      b.classList.toggle('border-amber-500', isThis);
      b.classList.toggle('bg-slate-800', !isThis);
      b.classList.toggle('text-slate-300', !isThis);
    }
  });

  const btnCustomCore = document.getElementById('btn-core-custom');
  const customCoreWrap = document.getElementById('custom-core-wrapper');
  const inputCustom = document.getElementById('input-custom-core');
  if (btnCustomCore && customCoreWrap) {
    const isCustom = !matchedPresetCore;
    btnCustomCore.classList.toggle('active', isCustom);
    btnCustomCore.classList.toggle('bg-amber-600', isCustom);
    btnCustomCore.classList.toggle('text-white', isCustom);
    btnCustomCore.classList.toggle('border-amber-500', isCustom);
    btnCustomCore.classList.toggle('bg-slate-800', !isCustom);
    btnCustomCore.classList.toggle('text-slate-300', !isCustom);
    customCoreWrap.classList.toggle('hidden', !isCustom);
    if (isCustom && inputCustom) {
      inputCustom.value = S.coreDiameter;
    }
  }

  document.getElementById('input-roll-length').value = S.rollLength;
  document.getElementById('picker-label-color').value = S.labelColor;
  document.getElementById('input-hex-color').value = S.labelColor.replace('#', '');
  document.getElementById('select-liner-color').value = S.linerColor;
  document.getElementById('select-material-finish').value = S.materialFinish;

  // Cập nhật các nút Chất liệu
  if (p.materialType) S.materialType = p.materialType;
  document.querySelectorAll('.material-btn').forEach(btn => {
    const isThis = btn.dataset.material === S.materialType;
    btn.classList.toggle('active', isThis);
    btn.classList.toggle('border-emerald-500', isThis);
    btn.classList.toggle('bg-emerald-950/40', isThis);
    btn.classList.toggle('border-slate-700', !isThis);
    btn.classList.toggle('bg-slate-900/60', !isThis);
  });

  // Cập nhật các nút Bo góc preset
  document.querySelectorAll('.corner-preset-btn').forEach(b => {
    const isThis = (b.dataset.r !== 'custom' && parseFloat(b.dataset.r) === S.cornerRadius);
    b.classList.toggle('active', isThis);
    b.classList.toggle('bg-blue-600', isThis);
    b.classList.toggle('text-white', isThis);
    b.classList.toggle('border-blue-500', isThis);
    b.classList.toggle('font-bold', isThis);
    b.classList.toggle('bg-slate-800', !isThis);
    b.classList.toggle('text-slate-300', !isThis);
  });

  // Cập nhật các nút Chiều dài preset
  document.querySelectorAll('.length-btn').forEach(b => {
    const isThis = parseInt(b.dataset.m) === S.rollLength;
    b.classList.toggle('active', isThis);
    b.classList.toggle('bg-amber-600', isThis);
    b.classList.toggle('text-white', isThis);
    b.classList.toggle('border-amber-500', isThis);
    b.classList.toggle('font-bold', isThis);
    b.classList.toggle('bg-slate-800', !isThis);
    b.classList.toggle('text-slate-300', !isThis);
  });

  // Cập nhật Thời gian SX
  if (p.leadTimeDays) S.leadTimeDays = p.leadTimeDays;
  const inpLeadTime = document.getElementById('input-lead-time');
  if (inpLeadTime) inpLeadTime.value = S.leadTimeDays || '';
  const pCurrentVal = S.leadTimeDays ? String(S.leadTimeDays).trim().toLowerCase() : '';
  document.querySelectorAll('.leadtime-btn').forEach(b => {
    const bDays = (b.dataset.days || '').trim().toLowerCase();
    const bDaysNoUnit = bDays.replace(/\s*ngày/g, '').trim();
    const currentValNoUnit = pCurrentVal.replace(/\s*ngày/g, '').trim();
    const isThis = pCurrentVal !== '' && (bDays === pCurrentVal || bDaysNoUnit === currentValNoUnit);
    b.classList.toggle('active', isThis);
    b.classList.toggle('bg-teal-600', isThis);
    b.classList.toggle('text-white', isThis);
    b.classList.toggle('border-teal-500', isThis);
    b.classList.toggle('font-bold', isThis);
    b.classList.toggle('bg-slate-800', !isThis);
    b.classList.toggle('text-slate-300', !isThis);
    b.classList.toggle('border-slate-700', !isThis);
  });

  // Cập nhật Đặt hàng tối thiểu (MOQ)
  if (p.minOrder) S.minOrder = p.minOrder;
  const inpMinOrder = document.getElementById('input-min-order');
  if (inpMinOrder) inpMinOrder.value = S.minOrder || 20;
  document.querySelectorAll('.minorder-btn').forEach(b => {
    const bVal = b.dataset.val;
    const isThis = (bVal === 'custom' ? (S.minOrder !== 20 && S.minOrder !== 30) : parseInt(bVal) === S.minOrder);
    b.classList.toggle('active', isThis);
    b.classList.toggle('bg-purple-600', isThis);
    b.classList.toggle('text-white', isThis);
    b.classList.toggle('border-purple-500', isThis);
    b.classList.toggle('font-bold', isThis);
    b.classList.toggle('bg-slate-800', !isThis);
    b.classList.toggle('text-slate-300', !isThis);
  });

  // Cập nhật Màu sắc
  document.querySelectorAll('.color-mode-btn').forEach(b => {
    const isMatch = b.dataset.mode === S.colorMode;
    b.classList.toggle('ring-2', isMatch);
    b.classList.toggle('ring-blue-400', isMatch);
  });

  onParamsChanged();

  // Tự động căn chỉnh camera theo khổ tem mới
  if (window.Scene3D && typeof window.Scene3D.setCameraView === 'function') {
    window.Scene3D.setCameraView('iso');
  }

  // Khôi phục thiết kế tem 2D nếu preset có lưu
  if (p.designElements && window.LabelDesigner && typeof window.LabelDesigner.setElements === 'function') {
    window.LabelDesigner.setElements(p.designElements);
  }
}

/**
 * QUẢN LÝ MẪU TỰ LƯU (CUSTOM PRESETS PERSISTENCE)
 */
const CUSTOM_PRESETS_STORAGE_KEY = '3d_roll_custom_presets_v1';

function getCustomPresets() {
  try {
    const raw = localStorage.getItem(CUSTOM_PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.warn('Lỗi đọc custom presets:', err);
    return [];
  }
}

function saveCustomPresetsToStorage(list) {
  try {
    localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Lỗi lưu custom presets:', err);
  }
}

function loadAndRenderCustomPresets(selectIdToActive = null) {
  const customPresets = getCustomPresets();
  const optgroup = document.getElementById('optgroup-custom-presets');
  const selector = document.getElementById('preset-selector');
  if (!optgroup) return;

  optgroup.innerHTML = '';
  if (customPresets.length === 0) {
    optgroup.classList.add('hidden');
    optgroup.style.display = 'none';
  } else {
    optgroup.classList.remove('hidden');
    optgroup.style.display = '';
    customPresets.forEach(p => {
      // Đăng ký vào bảng tra cứu LABEL_PRESETS
      LABEL_PRESETS[p.id] = p;

      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `⭐ ${p.name}`;
      opt.style.backgroundColor = '#0f172a';
      opt.style.color = '#fbbf24';
      opt.style.fontWeight = '600';
      optgroup.appendChild(opt);
    });
  }

  if (selectIdToActive && selector) {
    selector.value = selectIdToActive;
  }
}

function openSavePresetModal() {
  const S = window.AppState;
  const modal = document.getElementById('modal-save-preset');
  if (!modal) return;

  const defaultName = `${S.labelWidth} x ${S.labelHeight} mm (${S.ups} tem/hàng)`;
  const inputName = document.getElementById('input-save-preset-name');
  if (inputName) {
    inputName.value = defaultName;
  }

  const dimsEl = document.getElementById('save-summary-dims');
  if (dimsEl) {
    dimsEl.textContent = `${S.labelWidth} x ${S.labelHeight} mm (Bo góc: ${S.cornerRadius}mm)`;
  }

  const upsEl = document.getElementById('save-summary-ups');
  if (upsEl) {
    const shapeStr = S.shape === 'circle' ? 'Hình tròn' : (S.shape === 'oval' ? 'Hình oval' : 'Hình chữ nhật');
    upsEl.textContent = `${S.ups} tem / hàng (${shapeStr})`;
  }

  const gapsEl = document.getElementById('save-summary-gaps');
  if (gapsEl) {
    gapsEl.textContent = `Bước nhảy ${S.gapY}mm | Cách hàng ${S.gapX}mm | Biên ${S.marginX}mm`;
  }

  const coreEl = document.getElementById('save-summary-core');
  if (coreEl) {
    const rw = S.rollWidth ? S.rollWidth.toFixed(1) : (S.ups * S.labelWidth + (S.ups - 1) * S.gapX + 2 * S.marginX).toFixed(1);
    coreEl.textContent = `Khổ cuộn ${rw}mm x Lõi Ø${S.coreDiameter}mm (${S.coreName || ''})`;
  }

  modal.classList.remove('hidden');
  if (inputName) {
    setTimeout(() => {
      inputName.focus();
      inputName.select();
    }, 50);
  }
}

function closeSavePresetModal() {
  const modal = document.getElementById('modal-save-preset');
  if (modal) modal.classList.add('hidden');
}

function confirmSavePreset() {
  const S = window.AppState;
  const inputName = document.getElementById('input-save-preset-name');
  let name = inputName ? inputName.value.trim() : '';
  if (!name) {
    name = `${S.labelWidth} x ${S.labelHeight} mm (${S.ups} tem/hàng)`;
  }

  const withDesign = document.getElementById('check-save-with-design')?.checked ?? true;
  const newId = 'custom_' + Date.now();

  const newPreset = {
    id: newId,
    name: name,
    isCustom: true,
    labelWidth: S.labelWidth,
    labelHeight: S.labelHeight,
    cornerRadius: S.cornerRadius,
    shape: S.shape,
    ups: S.ups,
    gapX: S.gapX,
    gapY: S.gapY,
    marginX: S.marginX,
    hasPerforation: S.hasPerforation,
    coreDiameter: S.coreDiameter,
    coreName: S.coreName,
    rollLength: S.rollLength,
    labelColor: S.labelColor,
    linerColor: S.linerColor,
    materialFinish: S.materialFinish,
    designElements: (withDesign && window.LabelDesigner && typeof window.LabelDesigner.getElements === 'function')
      ? JSON.parse(JSON.stringify(window.LabelDesigner.getElements()))
      : null
  };

  const list = getCustomPresets();
  list.unshift(newPreset);
  saveCustomPresetsToStorage(list);

  LABEL_PRESETS[newId] = newPreset;
  loadAndRenderCustomPresets(newId);

  closeSavePresetModal();
  showPresetToast(`Đã lưu mẫu "${name}" thành công!`);
}

/**
 * QUẢN LÝ MODAL XUẤT ẢNH TÙY CHỈNH KÍCH THƯỚC (600x600, 800x800, TÙY CHỈNH...)
 */
let currentExportSource = '3d'; // '3d' hoặc 'designer'

function openCustomExportModal(source = null) {
  const modal = document.getElementById('modal-custom-export');
  if (!modal) return;

  // Xác định nguồn ảnh (nếu không truyền, tự động theo tab hiện tại)
  if (source) {
    currentExportSource = source;
  } else {
    const isDesignerActive = !document.getElementById('view-designer')?.classList.contains('hidden');
    currentExportSource = isDesignerActive ? 'designer' : '3d';
  }

  syncExportSourceUI();
  setExportPreset(800, 800); // Mặc định 800x800 chuẩn TMĐT

  modal.classList.remove('hidden');
}
window.openCustomExportModal = openCustomExportModal;

function closeCustomExportModal() {
  const modal = document.getElementById('modal-custom-export');
  if (modal) modal.classList.add('hidden');
}
window.closeCustomExportModal = closeCustomExportModal;

function syncExportSourceUI() {
  document.querySelectorAll('.export-source-btn').forEach(btn => {
    const isThis = btn.dataset.source === currentExportSource;
    btn.classList.toggle('active', isThis);
    btn.classList.toggle('bg-blue-600/20', isThis && currentExportSource === '3d');
    btn.classList.toggle('border-blue-500', isThis && currentExportSource === '3d');
    btn.classList.toggle('text-blue-300', isThis && currentExportSource === '3d');
    btn.classList.toggle('bg-amber-600/20', isThis && currentExportSource === 'designer');
    btn.classList.toggle('border-amber-500', isThis && currentExportSource === 'designer');
    btn.classList.toggle('text-amber-300', isThis && currentExportSource === 'designer');
    btn.classList.toggle('bg-slate-800', !isThis);
    btn.classList.toggle('text-slate-300', !isThis);
    btn.classList.toggle('border-slate-700', !isThis);
  });

  const specsWrapper = document.getElementById('export-specs-option-wrapper');
  const quickRollBtn = document.getElementById('btn-quick-export-roll');
  if (specsWrapper) specsWrapper.classList.toggle('hidden', currentExportSource !== '3d');
  if (quickRollBtn) quickRollBtn.classList.toggle('hidden', currentExportSource !== '3d');
}

function setExport3DMode(mode) {
  const isWithSpecs = (mode === 'with-specs');
  const checkEl = document.getElementById('check-export-include-specs');
  if (checkEl) checkEl.checked = isWithSpecs;

  const btnWithSpecs = document.getElementById('btn-mode-with-specs');
  const btnRollOnly = document.getElementById('btn-mode-roll-only');
  const labelMain = document.getElementById('label-btn-export-main');
  const dimBadge = document.getElementById('export-btn-dim-badge');
  const dimText = dimBadge ? dimBadge.textContent : '800x800';

  if (btnWithSpecs) {
    btnWithSpecs.classList.toggle('active', isWithSpecs);
    btnWithSpecs.classList.toggle('border-blue-500', isWithSpecs);
    btnWithSpecs.classList.toggle('bg-blue-600/20', isWithSpecs);
    btnWithSpecs.classList.toggle('text-blue-300', isWithSpecs);
    btnWithSpecs.classList.toggle('border-slate-700', !isWithSpecs);
    btnWithSpecs.classList.toggle('bg-slate-800', !isWithSpecs);
    btnWithSpecs.classList.toggle('text-slate-300', !isWithSpecs);
  }

  if (btnRollOnly) {
    btnRollOnly.classList.toggle('active', !isWithSpecs);
    btnRollOnly.classList.toggle('border-emerald-500', !isWithSpecs);
    btnRollOnly.classList.toggle('bg-emerald-600/20', !isWithSpecs);
    btnRollOnly.classList.toggle('text-emerald-300', !isWithSpecs);
    btnRollOnly.classList.toggle('border-slate-700', isWithSpecs);
    btnRollOnly.classList.toggle('bg-slate-800', isWithSpecs);
    btnRollOnly.classList.toggle('text-slate-300', isWithSpecs);
  }

  if (labelMain) {
    labelMain.innerHTML = isWithSpecs 
      ? `Tải Kèm Thông Số (<span id="export-btn-dim-badge">${dimText}</span>)`
      : `Tải Nguyên Tem 3D (<span id="export-btn-dim-badge">${dimText}</span>)`;
  }
}
window.setExport3DMode = setExport3DMode;

function setExportPreset(w, h) {
  const inpW = document.getElementById('input-export-width');
  const inpH = document.getElementById('input-export-height');
  if (inpW && inpH) {
    inpW.value = w;
    inpH.value = h;
    updateExportDimensionsSummary(w, h);
  }

  document.querySelectorAll('.export-preset-btn').forEach(btn => {
    const bw = btn.dataset.w;
    const bh = btn.dataset.h;
    const isMatch = (parseInt(bw) === w && parseInt(bh) === h);
    btn.classList.toggle('active', isMatch);
    btn.classList.toggle('bg-emerald-600/20', isMatch);
    btn.classList.toggle('border-emerald-500', isMatch);
    btn.classList.toggle('text-emerald-300', isMatch);
    btn.classList.toggle('bg-slate-800', !isMatch);
    btn.classList.toggle('text-slate-300', !isMatch);
    btn.classList.toggle('border-slate-700', !isMatch);
  });
}

function updateExportDimensionsSummary(w, h) {
  const badge = document.getElementById('export-btn-dim-badge');
  const summary = document.getElementById('export-res-summary');
  const ratioStr = w === h ? '1:1 (Vuông)' : `${(w / h).toFixed(2)}:1`;
  if (badge) badge.textContent = `${w}x${h}`;
  if (summary) summary.textContent = `${w} x ${h} px (${ratioStr})`;
}

function confirmCustomExport(overrideIncludeSpecs = null) {
  const inpW = document.getElementById('input-export-width');
  const inpH = document.getElementById('input-export-height');
  const selectBg = document.getElementById('select-export-bg');
  const selectFormat = document.getElementById('select-export-format');

  const width = Math.max(100, Math.min(4000, parseInt(inpW?.value) || 800));
  const height = Math.max(100, Math.min(4000, parseInt(inpH?.value) || 800));
  const bgOption = selectBg?.value || 'studio';
  const format = selectFormat?.value || 'png';

  const checkEl = document.getElementById('check-export-include-specs');
  const includeSpecs = (overrideIncludeSpecs !== null) 
    ? Boolean(overrideIncludeSpecs) 
    : (checkEl ? checkEl.checked : true);

  closeCustomExportModal();

  if (currentExportSource === '3d') {
    if (window.Scene3D && typeof window.Scene3D.exportCustomImage === 'function') {
      window.Scene3D.exportCustomImage({ width, height, format, bgOption, includeSpecs });
      const modeText = includeSpecs ? 'Kèm Bảng Thông Số' : 'Nguyên Tem 3D';
      showPresetToast(`Đã xuất ảnh 3D (${modeText}, ${width}x${height} px) thành công!`);
    }
  } else {
    if (window.LabelDesigner && typeof window.LabelDesigner.exportCustomLabelImage === 'function') {
      window.LabelDesigner.exportCustomLabelImage({ width, height, format, bgOption });
      showPresetToast(`Đã xuất ảnh Tem 2D (${width}x${height} px) thành công!`);
    }
  }
}

function showPresetToast(msg) {
  let toast = document.getElementById('preset-toast-notification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'preset-toast-notification';
    toast.className = 'fixed bottom-6 right-6 bg-slate-900/95 border border-emerald-500/80 text-emerald-400 px-4 py-2.5 rounded-xl shadow-2xl z-50 flex items-center gap-2 text-xs font-semibold transform transition-all duration-300 pointer-events-none opacity-0 translate-y-2 backdrop-blur-sm';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-400 text-sm"></i> <span>${msg}</span>`;
  toast.classList.remove('opacity-0', 'translate-y-2');
  toast.classList.add('opacity-100', 'translate-y-0');
  setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', 'translate-y-2');
  }, 2500);
}

/**
 * KHI THÔNG SỐ THAY ĐỔI
 */
function onParamsChanged() {
  recalculatePhysics();

  // Cập nhật mô hình 3D cuộn tem
  if (window.Roll3D) window.Roll3D.rebuildRoll();

  // Cập nhật bản vẽ kỹ thuật 2D
  if (window.Blueprint2D) window.Blueprint2D.render();

  // Cập nhật khung thiết kế tem 2D theo kích thước mới
  if (window.LabelDesigner) window.LabelDesigner.onLabelSizeChanged();
}

// Khởi chạy khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
  recalculatePhysics();
  initEventListeners();
  loadAndRenderCustomPresets();
});
