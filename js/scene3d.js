/**
 * SCENE3D.JS - Không Gian 3D Studio Trắng Tinh Khiết Sắc Nét (Clean White Studio)
 * Được tối ưu theo chuẩn bản vẽ kỹ thuật tem nhãn: Sáng rõ, sắc nét, không mờ, không tối.
 */

window.Scene3D = (function () {
  let scene, camera, renderer, controls;
  let studioGroup, groundPlane, gridHelper;
  let dirLight, ambientLight, fillLight;
  let canvasContainer, canvas;
  let isInitialized = false;

  function init() {
    canvasContainer = document.getElementById('viewport-3d');
    canvas = document.getElementById('three-canvas');
    if (!canvasContainer || !canvas) return;

    // 1. SCENE - Nền đen Studio sang trọng làm mặc định
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);

    // 2. CAMERA - Góc nghiêng 3/4 Isometric chuẩn (thu nhỏ kích thước hiển thị vừa vặn, thanh thoát)
    const aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
    camera = new THREE.PerspectiveCamera(38, aspect, 1, 4000);
    const isMobileInit = window.innerWidth < 768;
    if (isMobileInit) {
      camera.position.set(-240, 242.5, 420);
    } else {
      camera.position.set(-210, 212.5, 360);
    }

    // 3. RENDERER - Độ phân giải siêu nét (High DPI)
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      preserveDrawingBuffer: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    renderer.setPixelRatio(Math.max(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = false;
    renderer.outputEncoding = THREE.sRGBEncoding;

    // 4. CONTROLS - Tâm xoay và zoom đặt chuẩn tại trọng tâm mô hình
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;
    controls.minDistance = 40;
    controls.maxDistance = 2000;
    controls.maxPolarAngle = Math.PI / 2 + 0.1;
    controls.target.set(5, 52.5, 5);

    // 5. ÁNH SÁNG STUDIO SÁNG RÕ
    setupCleanStudioLighting();

    // Thiết lập mặc định giao diện Studio Nền Tối (Không bóng đen sàn)
    setStudioBackground('dark');

    // 7. SỰ KIỆN CO GIÃN MÀN HÌNH
    window.addEventListener('resize', onWindowResize);

    isInitialized = true;

    if (window.Roll3D) {
      window.Roll3D.init(scene);
      updateTargetToModelCenter(false);
    }

    animate();
  }

  function setupCleanStudioLighting() {
    studioGroup = new THREE.Group();
    scene.add(studioGroup);

    // Ánh sáng môi trường trắng sáng đều, chống bóng đen tối mù
    ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    studioGroup.add(ambientLight);

    // Đèn chiếu chính từ trước-trên xuống
    dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight.position.set(-100, 300, 250);
    dirLight.castShadow = false;
    studioGroup.add(dirLight);

    // Đèn phụ dịu bên phải
    fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(200, 200, 100);
    studioGroup.add(fillLight);
  }

  function onWindowResize() {
    if (!canvasContainer || !camera || !renderer) return;
    const width = canvasContainer.clientWidth;
    const height = canvasContainer.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  function setStudioBackground(theme) {
    if (theme === 'dark') {
      scene.background = new THREE.Color(0x0a0f1d);
      if (ambientLight) ambientLight.intensity = 0.95;
      if (dirLight) dirLight.intensity = 1.0;
    } else {
      scene.background = new THREE.Color(0xffffff);
      if (ambientLight) ambientLight.intensity = 1.4;
      if (dirLight) dirLight.intensity = 0.8;
    }
  }

  function setAutoRotate(enabled) {
    if (controls) {
      controls.autoRotate = enabled;
      controls.autoRotateSpeed = 2.0;
    }
  }

  function getModelCenter() {
    if (window.Roll3D && typeof window.Roll3D.getModelCenter === 'function') {
      return window.Roll3D.getModelCenter();
    }
    return new THREE.Vector3(5, 52.5, 5);
  }

  function updateTargetToModelCenter(preserveOffset = true) {
    if (!controls || !camera) return;
    const center = getModelCenter();
    if (preserveOffset) {
      const offset = camera.position.clone().sub(controls.target);
      controls.target.copy(center);
      camera.position.copy(center).add(offset);
    } else {
      controls.target.copy(center);
    }
    controls.update();
  }

  function getModelDimensions() {
    if (window.Roll3D && typeof window.Roll3D.getRollGroup === 'function') {
      const group = window.Roll3D.getRollGroup();
      if (group && group.children.length > 0) {
        const box = new THREE.Box3().setFromObject(group);
        const size = new THREE.Vector3();
        box.getSize(size);
        return size;
      }
    }
    return new THREE.Vector3(100, 180, 100);
  }

  function setCameraView(viewType) {
    if (!controls || !camera) return;

    const dims = getModelDimensions();
    const maxDim = Math.max(dims.x, dims.y, dims.z);
    const isMobile = window.innerWidth < 768;
    // Tự động tính cự ly camera dựa trên kích cỡ thực tế của mô hình để cuộn tem nằm vừa vặn, thanh thoát chính giữa màn hình
    const baseDist = Math.max(maxDim * 2.5, 480);
    const dist = isMobile ? baseDist * 1.25 : baseDist;

    const center = getModelCenter();
    // Chuyển tâm nhìn dịch sang phải một chút để cuộn tem nằm cân đối hơi lệch sang trái, tạo không gian thoáng đãng tuyệt đối cho bảng thông số bên phải
    const targetX = center.x + 12;
    controls.target.set(targetX, center.y, center.z);

    if (viewType === 'front') {
      // Nhìn chính diện vào tâm cuộn & dải tem đang rủ xuống
      camera.position.set(targetX, center.y, center.z + dist);
    } else if (viewType === 'iso') {
      // Góc nghiêng kỹ thuật vừa tầm mắt, tâm nhìn đặt chuẩn chính giữa mô hình
      camera.position.set(targetX - dist * 0.52, center.y + dist * 0.40, center.z + dist * 0.82);
    } else if (viewType === 'side') {
      // Nhìn ngang cạnh cuộn tem (thấy rõ đường kính lõi và thân cuộn)
      const S = window.AppState;
      const coreY = (S?.outerDiameter ? S.outerDiameter / 2 : 50) + 40;
      controls.target.set(0, coreY, 0);
      camera.position.set(-dist * 0.95, coreY, 0);
    } else if (viewType === 'top') {
      // Từ trên nhìn xuống cuộn tem
      camera.position.set(center.x, center.y + dist * 1.25, center.z + 10);
    } else if (viewType === 'flap') {
      // Cận cảnh dải tem chính diện
      const flapY = Math.max(10, center.y - 35);
      controls.target.set(center.x, flapY, center.z);
      camera.position.set(center.x, flapY, center.z + dist * 0.75);
    }
    controls.update();
  }

  function takeSnapshot() {
    exportCustomImage({ width: 800, height: 800, format: 'png', bgOption: 'studio' });
  }

  /**
   * VẼ BẢNG THÔNG SỐ ĐẶT HÀNG TRỰC TIẾP LÊN CANVAS 2D (SIÊU NÉT, KHÔNG MỜ, KHÔNG BAO GIỜ LỖI)
   */
  function drawSpecCardOnCanvas(ctx, x, y, w, h, S) {
    if (!ctx || !S) return;

    // 1. Chuẩn bị danh sách các dòng thông số theo thiết lập và dữ liệu thực tế
    const rows = [];
    const checkShow = (k) => (typeof window.shouldShowSpecRow === 'function')
      ? window.shouldShowSpecRow(k, S)
      : (S.specToggles ? S.specToggles[k] !== false : true);

    const materialNames = {
      paper_normal: 'Giấy thường (xé rách được)',
      paper_thermal: 'Giấy nhiệt (xé rách được)',
      pvc: 'PVC (xé không rách)',
      silver: 'Xi bạc (ánh kim)',
      matte: 'Decal giấy thường / mờ',
      gloss: 'Cán màng bóng'
    };

    if (checkShow('material')) {
      rows.push({ label: 'Chất liệu:', val: materialNames[S.materialType] || 'Giấy thường (xé rách được)', valColor: '#34d399' });
    }
    if (checkShow('dimensions')) {
      rows.push({ label: 'Kích thước:', val: `${S.labelWidth} x ${S.labelHeight} mm (ngang x cao)`, valColor: '#ffffff', bold: true });
    }
    if (checkShow('spec')) {
      const cornerStr = S.cornerRadius > 0 ? `Bo góc R${S.cornerRadius}` : 'Góc vuông';
      rows.push({ label: 'Quy cách:', val: `${cornerStr} - ${S.ups} tem/hàng`, valColor: '#a5b4fc' });
    }
    if (checkShow('rollLength')) {
      rows.push({ label: 'Chiều dài cuộn:', val: `${S.rollLength}m / cuộn`, valColor: '#fbbf24', bold: true });
    }
    if (checkShow('count')) {
      rows.push({ label: 'Số tem ước tính:', val: `khoảng ${S.labelCount?.toLocaleString('vi-VN') || ''} tem`, valColor: '#67e8f9', bold: true });
    }
    if (checkShow('core')) {
      const coreStr = S.coreName?.includes('inch') ? `${S.coreName} (${S.coreDiameter?.toFixed(1)}mm)` : `Lõi ${S.coreDiameter?.toFixed(0)}mm`;
      rows.push({ label: 'Lõi cuộn:', val: coreStr, valColor: '#fbbf24' });
    }
    if (checkShow('color')) {
      const colName = S.colorMode === 'white' ? 'Trắng' : (S.colorMode === 'blue' ? 'Xanh' : (S.colorMode === 'red' ? 'Đỏ' : (S.colorMode === 'preprint' ? 'In phôi sẵn' : S.labelColor)));
      rows.push({ label: 'Màu nền:', val: colName, valColor: '#f472b6', dot: S.labelColor || '#ffffff' });
    }
    if (checkShow('minOrder')) {
      rows.push({ label: 'Đặt hàng tối thiểu:', val: `${S.minOrder} cuộn`, valColor: '#c084fc', bold: true });
    }
    if (checkShow('leadTime')) {
      rows.push({ label: 'Thời gian SX:', val: `${S.leadTimeDays} ngày`, valColor: '#5eead4' });
    }

    const rowCount = rows.length;
    if (rowCount === 0) return;

    // Tính toán chiều cao thẻ co giãn linh hoạt theo số lượng dòng thực tế
    const fontStack = '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const headerFontSize = Math.max(12, Math.round(w * 0.045));
    const padX = Math.round(w * 0.055);
    const padTop = Math.max(16, Math.round(w * 0.055));
    const idealRowH = Math.max(20, Math.round(w * 0.058));
    const neededH = padTop + Math.round(headerFontSize * 1.6) + (rowCount * idealRowH) + Math.round(w * 0.04);
    const drawH = Math.min(h, Math.max(neededH, Math.round(h * 0.45)));
    const drawY = y + (h - drawH); // Căn đáy góc dưới để bảng luôn vững chắc

    ctx.save();

    // 2. Không dùng bóng đổ
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // 3. Nền thẻ đặc bo tròn (Dark Slate #090e1a -> #131d33)
    const radius = Math.round(w * 0.04);
    const bgGrad = ctx.createLinearGradient(x, drawY, x + w, drawY + drawH);
    bgGrad.addColorStop(0, '#090e1a');
    bgGrad.addColorStop(1, '#131d33');
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, drawY, w, drawH, radius);
    } else {
      ctx.rect(x, drawY, w, drawH);
    }
    ctx.fill();

    // 4. Viền thẻ tinh tế
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#2d3f5e';
    ctx.lineWidth = Math.max(1.5, Math.round(w * 0.004));
    ctx.stroke();

    // 5. Header thẻ: "📋 THÔNG SỐ ĐẶT HÀNG"
    ctx.font = `bold ${headerFontSize}px ${fontStack}`;
    ctx.fillStyle = '#60a5fa'; // Blue-400
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('📋 THÔNG SỐ ĐẶT HÀNG', x + padX, drawY + padTop);

    // Đường kẻ phân cách dưới header
    const lineY = drawY + padTop + Math.round(headerFontSize * 0.9);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x + padX, lineY);
    ctx.lineTo(x + w - padX, lineY);
    ctx.stroke();

    // 6. Vẽ các hàng thông số (chữ liền sát vào dấu :, không căn lề phải)
    const startY = lineY + Math.round(drawH * 0.04);
    const endY = drawY + drawH - Math.round(drawH * 0.04);
    const rowH = (endY - startY) / rowCount;
    const labelFontSize = Math.max(9.5, Math.round(w * 0.034));
    const valFontSize = Math.max(10, Math.round(w * 0.036));

      rows.forEach((r, idx) => {
        const rowCenterY = startY + idx * rowH + rowH / 2;

        // Nhãn bên trái
        ctx.font = `500 ${labelFontSize}px ${fontStack}`;
        ctx.fillStyle = '#94a3b8'; // Slate-400
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(r.label, x + padX, rowCenterY);

        // Giá trị liền sát ngay sau dấu ':' của nhãn
        const labelW = ctx.measureText(r.label).width;
        const valX = x + padX + labelW + Math.max(6, Math.round(w * 0.02));

        ctx.font = `${r.bold ? 'bold' : '600'} ${valFontSize}px ${fontStack}`;
        ctx.fillStyle = r.valColor || '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        if (r.dot) {
          const dotR = Math.round(valFontSize * 0.38);
          const dotCenterX = valX + dotR + 1;

          ctx.beginPath();
          ctx.arc(dotCenterX, rowCenterY, dotR, 0, Math.PI * 2);
          ctx.fillStyle = r.dot;
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillText(r.val, dotCenterX + dotR + 5, rowCenterY);
        } else {
          ctx.fillText(r.val, valX, rowCenterY);
        }
      });

    ctx.restore();
  }

  async function exportCustomImage({ width = 800, height = 800, format = 'png', bgOption = 'studio', quality = 0.95, includeSpecs = null } = {}) {
    if (!renderer || !scene || !camera) return null;

    const S = window.AppState;
    // Kiểm tra chế độ: nếu người dùng truyền includeSpecs rõ ràng thì lấy giá trị đó, ngược lại lấy theo giao diện
    const shouldIncludeSpecs = (includeSpecs !== null) 
      ? Boolean(includeSpecs) 
      : ((checkEl ? checkEl.checked : true) && (S?.showSpecCard !== false));

    const origBg = scene.background;
    const origAspect = camera.aspect;
    const card = document.getElementById('hud-spec-card');
    const container = document.getElementById('viewport-3d') || renderer.domElement.parentElement;

    // 2. Xử lý nền
    let canvasBgColor = '#0a0f1d';
    if (bgOption === 'transparent') {
      scene.background = null;
      canvasBgColor = null;
    } else if (bgOption === 'white') {
      scene.background = new THREE.Color(0xffffff);
      canvasBgColor = '#ffffff';
    } else {
      scene.background = new THREE.Color(S?.studioBg === 'light' ? 0xffffff : 0x0a0f1d);
      canvasBgColor = S?.studioBg === 'light' ? '#ffffff' : '#0a0f1d';
    }

    // 3. Tạo Canvas 2D tổng hợp
    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = width;
    compositeCanvas.height = height;
    const ctx = compositeCanvas.getContext('2d');

    if (canvasBgColor) {
      ctx.fillStyle = canvasBgColor;
      ctx.fillRect(0, 0, width, height);
    }

    if (!shouldIncludeSpecs) {
      // =========================================================================
      // CHẾ ĐỘ 1: TẢI NGUYÊN TEM 3D (CHỈ CUỘN TEM 3D CHÍNH GIỮA, KHÔNG BẢNG THÔNG SỐ)
      // =========================================================================
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setPixelRatio(1);
      renderer.setSize(width, height, false);
      renderer.render(scene, camera);

      ctx.drawImage(renderer.domElement, 0, 0, width, height);
    } else {
      // =========================================================================
      // CHẾ ĐỘ 2: TẢI KÈM BẢNG THÔNG SỐ (BỐ CỤC PHÂN VÙNG THÔNG MINH, 100% KHÔNG ĐÈ NHAU)
      // =========================================================================
      const scaleMul = S?.specCardScale || 1.0;
      const cardW = Math.round(Math.min(width * 0.42, Math.max(260, width * 0.35 * scaleMul)));
      const cardH = Math.round(cardW * 0.78);

      // Nhận diện hướng đặt bảng: Người dùng kéo sang bên trái hay bên phải?
      let isCardLeft = false;
      let cardY = height - cardH - Math.max(16, Math.round(height * 0.025));

      if (card && container && card.dataset.userDragged === 'true' && (card.style.left || card.style.top)) {
        const vW = container.clientWidth || 1;
        const vH = container.clientHeight || 1;
        const leftPx = parseFloat(card.style.left) || 0;
        const topPx = parseFloat(card.style.top) || 0;
        const draggedX = Math.round((leftPx / vW) * width);
        isCardLeft = draggedX < (width * 0.45);
        cardY = Math.round((topPx / vH) * height);
      }

      // Tọa độ an toàn cho bảng
      const cardX = isCardLeft ? Math.max(16, Math.round(width * 0.025)) : (width - cardW - Math.max(16, Math.round(width * 0.025)));
      cardY = Math.max(16, Math.min(height - cardH - 16, cardY));

      // Phân vùng không gian hiển thị 3D độc lập:
      // Chiều rộng dành cho mô hình 3D: đảm bảo không gian cuộn tem nằm riêng biệt
      const scene3dW = Math.round(width - cardW * 0.88);
      const scene3dH = height;
      const scene3dX = isCardLeft ? (width - scene3dW) : 0;

      camera.aspect = scene3dW / scene3dH;
      camera.updateProjectionMatrix();

      renderer.setPixelRatio(1);
      renderer.setSize(scene3dW, scene3dH, false);
      renderer.render(scene, camera);

      // Ghép hình 3D vào canvas tổng hợp
      ctx.drawImage(renderer.domElement, scene3dX, 0, scene3dW, scene3dH);

      // Vẽ bảng thông số đặt hàng sắc nét
      drawSpecCardOnCanvas(ctx, cardX, cardY, cardW, cardH, S);
    }

    const mimeType = (format === 'jpeg' || format === 'jpg') ? 'image/jpeg' : 'image/png';
    const dataURL = compositeCanvas.toDataURL(mimeType, quality);

    // 4. Khôi phục lại trạng thái viewport 3D
    scene.background = origBg;
    if (container) {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.max(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    }

    // 5. Tải file về máy với tên gọi tương ứng chế độ
    const ext = (format === 'jpeg' || format === 'jpg') ? 'jpg' : 'png';
    const modeTag = shouldIncludeSpecs ? 'Kem-Thong-So' : 'Nguyen-Tem';
    const filename = `3D-${modeTag}-${S?.labelWidth || 50}x${S?.labelHeight || 30}mm-${width}x${height}.${ext}`;

    const link = document.createElement('a');
    link.download = filename;
    link.href = dataURL;
    link.click();

    return dataURL;
  }

  function getSnapshotDataURL() {
    if (!renderer || !scene || !camera) return '';
    renderer.render(scene, camera);
    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = renderer.domElement.width;
    compositeCanvas.height = renderer.domElement.height;
    const ctx = compositeCanvas.getContext('2d');
    ctx.drawImage(renderer.domElement, 0, 0, compositeCanvas.width, compositeCanvas.height);

    const S = window.AppState;
    if (S && S.showSpecCard !== false) {
      const cW = Math.round(compositeCanvas.width * 0.34 * (S.specCardScale || 1.0));
      const cH = Math.round(cW * 0.70);
      const cX = compositeCanvas.width - cW - 16;
      const cY = compositeCanvas.height - cH - 16;
      drawSpecCardOnCanvas(ctx, cX, cY, cW, cH, S);
    }
    return compositeCanvas.toDataURL('image/png');
  }

  return {
    init,
    getScene: () => scene,
    getCamera: () => camera,
    getRenderer: () => renderer,
    getControls: () => controls,
    getModelCenter,
    updateTargetToModelCenter,
    onWindowResize,
    setStudioBackground,
    setAutoRotate,
    setCameraView,
    takeSnapshot,
    exportCustomImage,
    getSnapshotDataURL
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  window.Scene3D.init();
});
