/**
 * ROLL3D.JS - Mô Phỏng Cuộn Tem 3D Trắng Tinh & Dải Tem Rủ Thẳng Đứng Chuẩn Bản Vẽ Kỹ Thuật
 * Thiết kế đúng 100% theo mẫu kỹ thuật: Cuộn tem nằm trên, dải tem rủ xuống chính diện,
 * nét vẽ viền đen kỹ thuật sắc nét, mũi tên đo kích thước W, H và mũi tên chỉ Lõi.
 */

window.Roll3D = (function () {
  let scene;
  let rollRootGroup, rollGroup;
  let coreMesh, rollBodyMesh, flapMesh, labelsGroup, dimensionsGroup;
  let lastDimParams = null;
  let labelCanvasTexture = null;
  let linerMaterial, labelMaterial, coreInnerMaterial, rollBodyMaterial, coreCardboardMat, coreRimMat;

  function init(sceneRef) {
    scene = sceneRef;
    rollRootGroup = new THREE.Group();
    scene.add(rollRootGroup);

    initMaterials();
    rebuildRoll();
  }

  /**
   * KHỞI TẠO VẬT LIỆU TRẮNG SÁCH & LÕI CARTON NÂU THỰC TẾ
   */
  function initMaterials() {
    // 1. Mặt giấy trắng cuộn tem
    rollBodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.02,
      side: THREE.DoubleSide
    });

    // 2. LÕI GIẤY CARTON NÂU KRAFT THẬT (CHUẨN ẢNH MẪU 2)
    const coreCanvas = document.createElement('canvas');
    coreCanvas.width = 512;
    coreCanvas.height = 256;
    const cctx = coreCanvas.getContext('2d');
    cctx.fillStyle = '#8B5A2B'; // Nâu bìa carton
    cctx.fillRect(0, 0, 512, 256);
    // Tạo vân sọc giấy carton kraft
    for (let x = 0; x < 512; x += 8) {
      cctx.fillStyle = (x % 16 === 0) ? '#6f441b' : '#9c6b39';
      cctx.fillRect(x, 0, 4, 256);
    }
    const coreTex = new THREE.CanvasTexture(coreCanvas);
    coreTex.wrapS = THREE.RepeatWrapping;
    coreTex.wrapT = THREE.RepeatWrapping;
    coreTex.repeat.set(4, 1);

    coreCardboardMat = new THREE.MeshStandardMaterial({
      map: coreTex,
      color: 0x9b6b3b,
      roughness: 0.9,
      metalness: 0.05,
      side: THREE.DoubleSide
    });

    // Mép thành ống carton (mặt cắt vành tròn ống giấy bìa nâu đậm)
    coreRimMat = new THREE.MeshStandardMaterial({
      color: 0x6e431c,
      roughness: 0.95,
      metalness: 0.0,
      side: THREE.DoubleSide
    });

    // 3. Đế giấy
    linerMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(window.AppState?.linerColor || '#ffffff'),
      roughness: 0.3,
      metalness: 0.02,
      side: THREE.DoubleSide
    });

    // 4. Vật liệu con tem
    labelMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(window.AppState?.labelColor || '#ffffff'),
      roughness: 0.3,
      metalness: 0.02,
      side: THREE.DoubleSide
    });

    updateMaterials();
  }

  function updateMaterials() {
    const S = window.AppState;
    if (!linerMaterial || !labelMaterial) return;

    linerMaterial.color.set(S.linerColor || '#ffffff');

    // Hiệu ứng chất liệu theo đúng 4 nhóm yêu cầu: Giấy thường, Giấy nhiệt, PVC, Xi bạc
    if (S.materialType === 'silver' || S.materialFinish === 'metallic') {
      labelMaterial.color.set('#d8dce3'); // Xi bạc sáng bóng kim loại chrome
      labelMaterial.roughness = 0.12;
      labelMaterial.metalness = 0.95;
      labelMaterial.transparent = false;
      labelMaterial.opacity = 1.0;
    } else if (S.materialType === 'pvc') {
      labelMaterial.color.set(S.labelColor || '#ffffff'); // Decal PVC nhựa dẻo bóng
      labelMaterial.roughness = 0.08;
      labelMaterial.metalness = 0.06;
      labelMaterial.transparent = false;
      labelMaterial.opacity = 1.0;
    } else if (S.materialType === 'paper_thermal') {
      labelMaterial.color.set(S.labelColor || '#ffffff'); // Giấy nhiệt mịn láng
      labelMaterial.roughness = 0.45;
      labelMaterial.metalness = 0.02;
      labelMaterial.transparent = false;
      labelMaterial.opacity = 1.0;
    } else if (S.materialType === 'paper_normal') {
      labelMaterial.color.set(S.labelColor || '#ffffff'); // Giấy thường xơ sợi nhám
      labelMaterial.roughness = 0.85;
      labelMaterial.metalness = 0.0;
      labelMaterial.transparent = false;
      labelMaterial.opacity = 1.0;
    } else if (S.materialFinish === 'gold') {
      labelMaterial.color.set('#d4af37'); // Vàng ánh kim cao cấp
      labelMaterial.roughness = 0.16;
      labelMaterial.metalness = 0.88;
      labelMaterial.transparent = false;
      labelMaterial.opacity = 1.0;
    } else if (S.materialFinish === 'kraft') {
      labelMaterial.color.set('#c49a6c'); // Nâu giấy kraft xơ sợi
      labelMaterial.roughness = 0.95;
      labelMaterial.metalness = 0.0;
      labelMaterial.transparent = false;
      labelMaterial.opacity = 1.0;
    } else if (S.materialFinish === 'gloss') {
      labelMaterial.color.set(S.labelColor || '#ffffff');
      labelMaterial.roughness = 0.06;
      labelMaterial.metalness = 0.08;
      labelMaterial.transparent = false;
      labelMaterial.opacity = 1.0;
    } else if (S.materialFinish === 'clear') {
      labelMaterial.color.set(S.labelColor || '#ffffff');
      labelMaterial.roughness = 0.15;
      labelMaterial.metalness = 0.05;
      labelMaterial.transparent = true;
      labelMaterial.opacity = 0.42;
    } else {
      // matte
      labelMaterial.color.set(S.labelColor || '#ffffff');
      labelMaterial.roughness = 0.85;
      labelMaterial.metalness = 0.0;
      labelMaterial.transparent = false;
      labelMaterial.opacity = 1.0;
    }

    if (labelCanvasTexture) {
      labelMaterial.map = labelCanvasTexture;
      labelMaterial.needsUpdate = true;
    }
  }

  /**
   * DỰNG LẠI MÔ HÌNH CUỘN TEM 3D CHUẨN HÌNH VẼ KỸ THUẬT
   */
  function rebuildRoll() {
    if (!scene || !rollRootGroup) return;

    try {
      // Dọn sạch mô hình cũ
      while (rollRootGroup.children.length > 0) {
        const obj = rollRootGroup.children[0];
        rollRootGroup.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
      }

      const S = window.AppState;
      const coreR = S.coreDiameter / 2;
      const coreThickness = 3.0; // Độ dày thành ống carton (3mm)
      const paperInnerR = coreR + coreThickness;
      const outerR = Math.max(paperInnerR + 10, S.outerDiameter / 2);
      const webW = S.webWidth; // Bề rộng cuộn

      // Vị trí trục cuộn nằm ở phía trên (độ cao Y = outerR + 40 để dải tem rủ xuống sàn)
      const rollCenterY = outerR + 40;
      const rollCenterZ = 0;

      rollGroup = new THREE.Group();
      rollRootGroup.add(rollGroup);

      // =========================================================
      // 1. DỰNG ỐNG LÕI GIẤY CARTON NÂU KRAFT (CARDBOARD CORE TUBE)
      // =========================================================
      const coreGeo = createHollowCylinderGeometry(coreR, paperInnerR, webW + 0.6);
      const coreMesh = new THREE.Mesh(coreGeo, [coreRimMat, coreCardboardMat]);
      coreMesh.position.set(0, rollCenterY, rollCenterZ);
      rollGroup.add(coreMesh);

      // Viền đen vành lỗ lõi trong
      const innerRimCircle = createCircleOutline(coreR, 0x1e293b, 2);
      innerRimCircle.position.set(-webW / 2 - 0.3, rollCenterY, rollCenterZ);
      innerRimCircle.rotation.y = Math.PI / 2;
      rollGroup.add(innerRimCircle);

      // Viền đen vành mép ngoài ống carton
      const outerRimCircle = createCircleOutline(paperInnerR, 0x1e293b, 2);
      outerRimCircle.position.set(-webW / 2 - 0.3, rollCenterY, rollCenterZ);
      outerRimCircle.rotation.y = Math.PI / 2;
      rollGroup.add(outerRimCircle);

      // =========================================================
      // 2. DỰNG KHỐI CUỘN GIẤY TEM TRẮNG QUẤN QUANH LÕI (ROLL BODY)
      // =========================================================
      const rollGeo = createHollowCylinderGeometry(paperInnerR, outerR, webW);
      rollBodyMesh = new THREE.Mesh(rollGeo, rollBodyMaterial);
      rollBodyMesh.position.set(0, rollCenterY, rollCenterZ);
      rollGroup.add(rollBodyMesh);

      // Nét vẽ viền đen kỹ thuật (Outline) cho thân cuộn tem
      const rollEdges = new THREE.EdgesGeometry(rollGeo, 25);
      const rollEdgeLines = new THREE.LineSegments(rollEdges, new THREE.LineBasicMaterial({ color: 0x1e293b, linewidth: 1.5 }));
      rollBodyMesh.add(rollEdgeLines);

      // Vành tròn viền ngoài cuộn giấy
      const outerPaperCircle = createCircleOutline(outerR, 0x1e293b, 2);
      outerPaperCircle.position.set(-webW / 2 - 0.2, rollCenterY, rollCenterZ);
      outerPaperCircle.rotation.y = Math.PI / 2;
      rollGroup.add(outerPaperCircle);

      // =========================================================
      // 3. DỰNG DẢI TEM RỦ THẲNG ĐỨNG XUỐNG DƯỚI (VERTICAL DROP FLAP)
      // =========================================================
      const pitch = S.labelHeight + S.gapY;
      const numFlapRows = 3; // 3 hàng tem rủ phía dưới chuẩn bản vẽ kỹ thuật
      const flapLength = Math.max(130, numFlapRows * pitch + 15);
      const flapZ = outerR; // Mặt trước của cuộn
      const flapTopY = rollCenterY;
      const flapBottomY = flapTopY - flapLength;

      const flapGroup = new THREE.Group();
      rollGroup.add(flapGroup);

      // Mặt đế giấy trắng rủ xuống
      const flapGeo = new THREE.PlaneGeometry(webW, flapLength);
      const flapMesh = new THREE.Mesh(flapGeo, linerMaterial);
      flapMesh.position.set(0, flapTopY - flapLength / 2, flapZ + 0.2);
      flapGroup.add(flapMesh);

      // Viền đen kỹ thuật cho dải đế giấy
      const flapEdges = new THREE.EdgesGeometry(flapGeo);
      const flapEdgeLine = new THREE.LineSegments(flapEdges, new THREE.LineBasicMaterial({ color: 0x1e293b, linewidth: 2 }));
      flapMesh.add(flapEdgeLine);

      // Phần uốn cong từ đỉnh cuộn lùi sau rủ xuống mặt trước
      const archCurveGeo = createArchTransitionGeometry(outerR, webW);
      const archMesh = new THREE.Mesh(archCurveGeo, linerMaterial);
      archMesh.position.set(0, rollCenterY, 0);
      flapGroup.add(archMesh);

      // =========================================================
      // 4. DỰNG CÁC CON TEM & ĐƯỜNG NÉT BẾ (LABELS TRÊN MẶT RỦ & TRÊN CUỘN)
      // =========================================================
      labelsGroup = new THREE.Group();
      flapGroup.add(labelsGroup);

      const totalLabelsW = S.ups * S.labelWidth + (S.ups - 1) * S.gapX;
      const startX = -totalLabelsW / 2 + S.labelWidth / 2;

      // --- 4A. DỰNG CÁC HÀNG TEM TRÊN MẶT RỦ PHÍA DƯỚI (FLAP ROWS) ---
      for (let r = 0; r < numFlapRows; r++) {
        // Tọa độ Y tâm tem: hàng 0 bắt đầu ngay dưới tiếp tuyến (cách khe gapY/2)
        const labelCenterY = flapTopY - (S.gapY / 2 + S.labelHeight / 2) - r * pitch;

        for (let col = 0; col < S.ups; col++) {
          const labelCenterX = startX + col * (S.labelWidth + S.gapX);
          const labelObj = createSharpLabelMesh(S.labelWidth, S.labelHeight, S.cornerRadius);
          labelObj.position.set(labelCenterX, labelCenterY, flapZ + 0.6);
          labelsGroup.add(labelObj);
        }

        // Đường răng cưa (Perforation line) nét đứt giữa các hàng trên dải rủ
        if (S.hasPerforation && r < numFlapRows - 1) {
          const perfY = labelCenterY - S.labelHeight / 2 - S.gapY / 2;
          const perfLine = createDottedPerfLine(webW);
          perfLine.position.set(0, perfY, flapZ + 0.5);
          labelsGroup.add(perfLine);
        }
      }

      // --- 4B. ĐƯỜNG RĂNG CƯA TẠI ĐIỂM TIẾP TUYẾN GIỮA DẢI RỦ VÀ CUỘN (TANGENT GAP) ---
      if (S.hasPerforation) {
        const tangentPerfLine = createDottedPerfLine(webW);
        tangentPerfLine.position.set(0, rollCenterY, outerR + 0.45);
        labelsGroup.add(tangentPerfLine);
      }

      // --- 4C. DỰNG CÁC HÀNG TEM & NÉT BẾ UỐN CONG TRÊN CUỘN (ROLL ROWS - VÙNG KHOANH ĐỎ) ---
      let rollRowIndex = 1;
      while (true) {
        const sCenter = S.gapY / 2 + S.labelHeight / 2 + (rollRowIndex - 1) * pitch;
        const thetaCenter = sCenter / outerR;
        const sEnd = sCenter + S.labelHeight / 2;
        // Dừng khi tem cuộn vượt qua đỉnh và lùi về mặt sau (> 135 độ)
        if (sEnd / outerR > Math.PI * 0.78) break;

        for (let col = 0; col < S.ups; col++) {
          const labelCenterX = startX + col * (S.labelWidth + S.gapX);
          const curvedLabelObj = createCurvedLabelMesh(
            S.labelWidth,
            S.labelHeight,
            S.cornerRadius,
            outerR,
            thetaCenter,
            S.shape
          );
          curvedLabelObj.position.set(labelCenterX, rollCenterY, 0);
          labelsGroup.add(curvedLabelObj);
        }

        // Đường răng cưa nét đứt giữa các hàng trên thân cuộn
        if (S.hasPerforation) {
          const thetaPerf = (rollRowIndex * pitch) / outerR;
          if (thetaPerf < Math.PI * 0.78) {
            const perfLine = createCurvedPerfLine(webW, outerR, rollCenterY, thetaPerf);
            labelsGroup.add(perfLine);
          }
        }

        rollRowIndex++;
      }

    // =========================================================
    // 5. CÁC MŨI TÊN & GHI CHÚ KÍCH THƯỚC CHUẨN KỸ THUẬT NHƯ ẢNH 2
    // =========================================================
    dimensionsGroup = new THREE.Group();
    dimensionsGroup.renderOrder = 999;
    rollRootGroup.add(dimensionsGroup);

    lastDimParams = { rollCenterY, outerR, webW, flapZ, flapTopY, numRows: numFlapRows };

    if (S.show3DDimensions) {
      buildTechnicalDimensions(rollCenterY, outerR, webW, flapZ, flapTopY, numFlapRows);
    }

    if (window.Scene3D && typeof window.Scene3D.updateTargetToModelCenter === 'function') {
      window.Scene3D.updateTargetToModelCenter(true);
    }
    } catch (err) {
      console.error('Lỗi khi dựng mô hình 3D cuộn tem:', err);
      const b = document.getElementById('debug-err-banner');
      if (b) {
        b.innerHTML = '⚠️ <b>Lỗi 3D:</b> ' + err.message;
        b.style.display = 'block';
      }
    }
  }

  /**
   * TẠO HÌNH TRỤ RỖNG CHO THÂN CUỘN TEM
   */
  function createHollowCylinderGeometry(innerR, outerR, height) {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, outerR, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, innerR, 0, Math.PI * 2, true);
    shape.holes.push(hole);

    const extrudeSettings = {
      depth: height,
      bevelEnabled: false,
      curveSegments: 48
    };

    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.center();
    geo.rotateY(Math.PI / 2);
    return geo;
  }

  /**
   * TẠO VÀNH TRÒN ĐEN VIỀN CẠNH (CIRCLE OUTLINE)
   */
  function createCircleOutline(radius, color, width = 2) {
    const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, 2 * Math.PI, false, 0);
    const points = curve.getPoints(64);
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: color, linewidth: width });
    return new THREE.Line(geo, mat);
  }

  /**
   * PHẦN UỐN CONG TỪ ĐỈNH CUỘN QUA MẶT TRƯỚC (ĐẾ GIẤY TIẾP TUYẾN)
   */
  function createArchTransitionGeometry(outerR, width, maxAngle = Math.PI * 0.82) {
    const geo = new THREE.BufferGeometry();
    const segments = 36;
    const vertices = [];
    const uvs = [];

    const halfW = width / 2;
    for (let i = 0; i < segments; i++) {
      const theta1 = maxAngle * (1 - i / segments); // Từ đỉnh cong lùi sau tới mặt trước (0)
      const theta2 = maxAngle * (1 - (i + 1) / segments);

      const y1 = Math.sin(theta1) * (outerR + 0.08);
      const z1 = Math.cos(theta1) * (outerR + 0.08);
      const y2 = Math.sin(theta2) * (outerR + 0.08);
      const z2 = Math.cos(theta2) * (outerR + 0.08);

      vertices.push(-halfW, y1, z1);
      vertices.push(halfW, y1, z1);
      vertices.push(-halfW, y2, z2);

      vertices.push(halfW, y1, z1);
      vertices.push(halfW, y2, z2);
      vertices.push(-halfW, y2, z2);

      uvs.push(0, i / segments, 1, i / segments, 0, (i + 1) / segments);
      uvs.push(1, i / segments, 1, (i + 1) / segments, 0, (i + 1) / segments);
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.computeVertexNormals();
    return geo;
  }

  /**
   * TẠO CON TEM CÓ ĐƯỜNG VIỀN BO GÓC ĐEN SẮC NÉT (SHARP LABEL MESH)
   */
  function createSharpLabelMesh(w, h, r) {
    const group = new THREE.Group();
    const S = window.AppState;

    // 1. TEM TRÒN CHUẨN TOÁN HỌC 100% (THEO ĐƯỜNG KÍNH, KHÔNG DẸT THÀNH ELIP)
    if (S.shape === 'circle') {
      const radius = Math.min(w, h) / 2;
      const circleShape = new THREE.Shape();
      circleShape.absarc(0, 0, radius, 0, Math.PI * 2, false);

      const geo = new THREE.ShapeGeometry(circleShape, 64);
      const pos = geo.attributes.position;
      const uvs = [];
      for (let i = 0; i < pos.count; i++) {
        const px = pos.getX(i);
        const py = pos.getY(i);
        uvs.push((px + radius) / (2 * radius), (py + radius) / (2 * radius));
      }
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

      const mesh = new THREE.Mesh(geo, labelMaterial);
      group.add(mesh);

      // Đường bế viền tròn sắc nét
      const points = circleShape.getPoints(64);
      const edgeGeo = new THREE.BufferGeometry().setFromPoints(points);
      const edgeLine = new THREE.LineLoop(edgeGeo, new THREE.LineBasicMaterial({ color: 0x1e293b, linewidth: 2 }));
      edgeLine.position.z = 0.05;
      group.add(edgeLine);

      return group;
    }

    // 2. TEM ELIP
    if (S.shape === 'oval') {
      const xRadius = w / 2;
      const yRadius = h / 2;
      const ovalShape = new THREE.Shape();
      ovalShape.absellipse(0, 0, xRadius, yRadius, 0, Math.PI * 2, false);

      const geo = new THREE.ShapeGeometry(ovalShape, 48);
      const pos = geo.attributes.position;
      const uvs = [];
      for (let i = 0; i < pos.count; i++) {
        const px = pos.getX(i);
        const py = pos.getY(i);
        uvs.push((px + xRadius) / w, (py + yRadius) / h);
      }
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

      const mesh = new THREE.Mesh(geo, labelMaterial);
      group.add(mesh);

      const points = ovalShape.getPoints(48);
      const edgeGeo = new THREE.BufferGeometry().setFromPoints(points);
      const edgeLine = new THREE.LineLoop(edgeGeo, new THREE.LineBasicMaterial({ color: 0x1e293b, linewidth: 2 }));
      edgeLine.position.z = 0.05;
      group.add(edgeLine);

      return group;
    }

    // 3. TEM CHỮ NHẬT / BO GÓC
    r = Math.min(r, w / 2 - 0.5, h / 2 - 0.5);
    r = Math.max(0, r);

    const shape = new THREE.Shape();
    const x = -w / 2;
    const y = -h / 2;

    if (r === 0 || S.shape === 'rect') {
      shape.moveTo(x, y);
      shape.lineTo(x + w, y);
      shape.lineTo(x + w, y + h);
      shape.lineTo(x, y + h);
      shape.closePath();
    } else {
      shape.moveTo(x + r, y);
      shape.lineTo(x + w - r, y);
      shape.quadraticCurveTo(x + w, y, x + w, y + r);
      shape.lineTo(x + w, y + h - r);
      shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      shape.lineTo(x + r, y + h);
      shape.quadraticCurveTo(x, y + h, x, y + h - r);
      shape.lineTo(x, y + r);
      shape.quadraticCurveTo(x, y, x + r, y);
    }

    const geo = new THREE.ShapeGeometry(shape, 32);

    // Gán UV tọa độ chính xác
    const pos = geo.attributes.position;
    const uvs = [];
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      const py = pos.getY(i);
      uvs.push((px + w / 2) / w, (py + h / 2) / h);
    }
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

    const mesh = new THREE.Mesh(geo, labelMaterial);
    group.add(mesh);

    // ĐƯỜNG BẾ VIỀN ĐEN SẮC NÉT QUANH CON TEM (DIE-CUT BORDER)
    const points = shape.getPoints(36);
    const edgeGeo = new THREE.BufferGeometry().setFromPoints(points);
    const edgeLine = new THREE.LineLoop(edgeGeo, new THREE.LineBasicMaterial({ color: 0x1e293b, linewidth: 1.8 }));
    edgeLine.position.z = 0.05;
    group.add(edgeLine);

    return group;
  }

  /**
   * ĐƯỜNG RĂNG CƯA NÉT ĐỨT (PERFORATION LINE)
   */
  function createDottedPerfLine(width) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-width / 2, 0, 0),
      new THREE.Vector3(width / 2, 0, 0)
    ]);
    const mat = new THREE.LineDashedMaterial({
      color: 0x111111, // Màu đen sắc nét theo yêu cầu
      dashSize: 3,
      gapSize: 2,
      linewidth: 2.0
    });
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    return line;
  }

  /**
   * ĐƯỜNG RĂNG CƯA NÉT ĐỨT UỐN CONG TRÊN THÂN CUỘN
   */
  function createCurvedPerfLine(width, radius, rollCenterY, theta) {
    const Rline = radius + 0.42;
    const y = rollCenterY + Rline * Math.sin(theta);
    const z = Rline * Math.cos(theta);
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-width / 2, y, z),
      new THREE.Vector3(width / 2, y, z)
    ]);
    const mat = new THREE.LineDashedMaterial({
      color: 0x111111, // Màu đen sắc nét theo yêu cầu
      dashSize: 3,
      gapSize: 2,
      linewidth: 2.0
    });
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    return line;
  }

  /**
   * TẠO CON TEM UỐN CONG THEO MẶT CUỘN TRÒN (CURVED LABEL ON ROLL)
   * Giữ trọn vẹn nét bế tem viền đen sắc nét, chất liệu PBR và texture nội dung tem
   */
  function createCurvedLabelMesh(w, h, r, radius, thetaCenter, shape) {
    const group = new THREE.Group();
    const Ny = 28; // Số lát cắt theo chiều dọc để uốn cong mượt mà theo hình trụ
    const Nx = 10; // Số điểm theo chiều ngang

    // Bán kính đặt mặt tem và đường viền (nhô nhẹ hơn thân cuộn để chống z-fighting)
    const Rmesh = radius + 0.32;
    const Rline = radius + 0.42;

    // 1. TẠO LƯỚI BỀ MẶT TEM (MESH GEOMETRY)
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    // Tính toán góc theta dọc theo chiều cao tem h
    // v = 1 (đỉnh tem) ở góc theta lớn hơn (hướng lên đỉnh cuộn), v = 0 (đáy tem) ở góc theta nhỏ hơn (hướng xuống mép rủ)
    for (let j = 0; j <= Ny; j++) {
      const v = j / Ny; // 0 (đáy) -> 1 (đỉnh)
      const yLocal = (v - 0.5) * h;
      const theta = thetaCenter + yLocal / radius;

      // Xác định độ rộng xmin, xmax tại lát cắt yLocal theo hình dáng tem
      let xmin = -w / 2;
      let xmax = w / 2;

      if (shape === 'circle') {
        const rad = Math.min(w, h) / 2;
        const dy = Math.abs(yLocal);
        const dx = dy <= rad ? Math.sqrt(Math.max(0, rad * rad - dy * dy)) : 0;
        xmin = -dx;
        xmax = dx;
      } else if (shape === 'oval') {
        const xr = w / 2;
        const yr = h / 2;
        const dy = Math.abs(yLocal);
        const dx = dy <= yr ? xr * Math.sqrt(Math.max(0, 1 - (dy / yr) ** 2)) : 0;
        xmin = -dx;
        xmax = dx;
      } else {
        // rect hoặc rounded rect
        const rad = r > 0 ? Math.min(r, w / 2 - 0.5, h / 2 - 0.5) : 0;
        if (rad > 0 && Math.abs(yLocal) > (h / 2 - rad)) {
          const dy = Math.abs(yLocal) - (h / 2 - rad);
          const dx = Math.sqrt(Math.max(0, rad * rad - dy * dy));
          xmin = -(w / 2 - rad) - dx;
          xmax = (w / 2 - rad) + dx;
        }
      }

      for (let i = 0; i <= Nx; i++) {
        const t = i / Nx;
        const x = xmin + t * (xmax - xmin);
        const u = (x + w / 2) / w;

        // Tọa độ 3D trên mặt trụ (tương đối theo tâm trục cuộn)
        const posX = x;
        const posY = Rmesh * Math.sin(theta);
        const posZ = Rmesh * Math.cos(theta);

        positions.push(posX, posY, posZ);
        normals.push(0, Math.sin(theta), Math.cos(theta));
        uvs.push(u, v);
      }
    }

    // Tạo các mặt tam giác (indices)
    for (let j = 0; j < Ny; j++) {
      for (let i = 0; i < Nx; i++) {
        const v0 = j * (Nx + 1) + i;
        const v1 = v0 + 1;
        const v2 = v0 + (Nx + 1);
        const v3 = v2 + 1;
        indices.push(v0, v1, v2);
        indices.push(v2, v1, v3);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);

    const mesh = new THREE.Mesh(geo, labelMaterial);
    group.add(mesh);

    // 2. TẠO ĐƯỜNG NÉT BẾ VIỀN ĐEN SẮC NÉT (CURVED DIE-CUT BORDER LINE)
    const linePoints = [];
    const addLinePt = (x, yLocal) => {
      const theta = thetaCenter + yLocal / radius;
      linePoints.push(new THREE.Vector3(
        x,
        Rline * Math.sin(theta),
        Rline * Math.cos(theta)
      ));
    };

    if (shape === 'circle') {
      const rad = Math.min(w, h) / 2;
      const segs = 64;
      for (let k = 0; k < segs; k++) {
        const ang = (k / segs) * Math.PI * 2;
        addLinePt(Math.cos(ang) * rad, Math.sin(ang) * rad);
      }
    } else if (shape === 'oval') {
      const xr = w / 2;
      const yr = h / 2;
      const segs = 48;
      for (let k = 0; k < segs; k++) {
        const ang = (k / segs) * Math.PI * 2;
        addLinePt(Math.cos(ang) * xr, Math.sin(ang) * yr);
      }
    } else {
      // rect hoặc bo góc
      const rad = r > 0 ? Math.min(r, w / 2 - 0.5, h / 2 - 0.5) : 0;
      if (rad === 0) {
        // Cạnh dưới
        addLinePt(-w / 2, -h / 2);
        addLinePt(w / 2, -h / 2);
        // Cạnh phải (uốn cong dọc theo trụ)
        for (let k = 0; k <= 16; k++) {
          addLinePt(w / 2, -h / 2 + (k / 16) * h);
        }
        // Cạnh trên
        addLinePt(-w / 2, h / 2);
        // Cạnh trái (uốn cong dọc theo trụ)
        for (let k = 16; k >= 0; k--) {
          addLinePt(-w / 2, -h / 2 + (k / 16) * h);
        }
      } else {
        // Bo 4 góc
        const cornerSegs = 8;
        // Đáy: từ (-w/2+rad, -h/2) -> (w/2-rad, -h/2)
        addLinePt(-w / 2 + rad, -h / 2);
        addLinePt(w / 2 - rad, -h / 2);
        // Góc dưới phải
        for (let k = 0; k <= cornerSegs; k++) {
          const a = -Math.PI / 2 + (k / cornerSegs) * (Math.PI / 2);
          addLinePt(w / 2 - rad + Math.cos(a) * rad, -h / 2 + rad + Math.sin(a) * rad);
        }
        // Cạnh phải (uốn cong dọc theo trụ)
        for (let k = 1; k < 12; k++) {
          addLinePt(w / 2, -h / 2 + rad + (k / 12) * (h - 2 * rad));
        }
        // Góc trên phải
        for (let k = 0; k <= cornerSegs; k++) {
          const a = (k / cornerSegs) * (Math.PI / 2);
          addLinePt(w / 2 - rad + Math.cos(a) * rad, h / 2 - rad + Math.sin(a) * rad);
        }
        // Cạnh trên
        addLinePt(w / 2 - rad, h / 2);
        addLinePt(-w / 2 + rad, h / 2);
        // Góc trên trái
        for (let k = 0; k <= cornerSegs; k++) {
          const a = Math.PI / 2 + (k / cornerSegs) * (Math.PI / 2);
          addLinePt(-w / 2 + rad + Math.cos(a) * rad, h / 2 - rad + Math.sin(a) * rad);
        }
        // Cạnh trái (uốn cong dọc theo trụ)
        for (let k = 1; k < 12; k++) {
          addLinePt(-w / 2, h / 2 - rad - (k / 12) * (h - 2 * rad));
        }
        // Góc dưới trái
        for (let k = 0; k <= cornerSegs; k++) {
          const a = Math.PI + (k / cornerSegs) * (Math.PI / 2);
          addLinePt(-w / 2 + rad + Math.cos(a) * rad, -h / 2 + rad + Math.sin(a) * rad);
        }
      }
    }

    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
    const edgeLine = new THREE.LineLoop(lineGeo, new THREE.LineBasicMaterial({
      color: 0x1e293b,
      linewidth: 1.8
    }));
    group.add(edgeLine);

    return group;
  }

  /**
   * DỰNG CÁC MŨI TÊN & GHI CHÚ KÍCH THƯỚC CHUẨN XÁC NHƯ ẢNH 2
   */
  function buildTechnicalDimensions(rollCenterY, outerR, webW, flapZ, flapTopY, numRows) {
    const S = window.AppState;
    const toggles = S.dimToggles || { width: true, height: true, gapY: true, gapX: true, margin: true, core: true };

    // Con tem ở góc trên bên phải của dải rủ (hàng 0, cột cuối) để gắn mũi tên đo W và H
    const totalLabelsW = S.ups * S.labelWidth + (S.ups - 1) * S.gapX;
    const startX = -totalLabelsW / 2 + S.labelWidth / 2;
    const targetCol = S.ups - 1;
    const targetLabelCenterX = startX + targetCol * (S.labelWidth + S.gapX);
    const targetLabelCenterY = flapTopY - (S.gapY / 2 + S.labelHeight / 2);

    const labelLeft = targetLabelCenterX - S.labelWidth / 2;
    const labelRight = targetLabelCenterX + S.labelWidth / 2;
    const labelTop = targetLabelCenterY + S.labelHeight / 2;
    const labelBottom = targetLabelCenterY - S.labelHeight / 2;

    const col0CenterX = startX;
    const col0Left = col0CenterX - S.labelWidth / 2;
    const col0Right = col0CenterX + S.labelWidth / 2;

    // =========================================================
    // 1. MŨI TÊN ĐO CHIỀU RỘNG TEM / ĐƯỜNG KÍNH (Ø)
    // =========================================================
    if (toggles.width !== false) {
      const widthText = S.shape === 'circle' ? `Ø ${S.labelWidth}mm` : `${S.labelWidth}mm`;
      const arrowY = labelTop - Math.min(5, S.labelHeight * 0.16);
      draw2HeadArrow(
        new THREE.Vector3(labelLeft + 0.5, arrowY, flapZ + 2.5),
        new THREE.Vector3(labelRight - 0.5, arrowY, flapZ + 2.5),
        widthText,
        '#1d4ed8',
        'top',
        true
      );
    }

    // =========================================================
    // 2. MŨI TÊN ĐO CHIỀU CAO TEM (^ v 38mm / 30mm / 40mm)
    // =========================================================
    if (toggles.height !== false) {
      draw2HeadArrow(
        new THREE.Vector3(labelRight + 8, labelTop, flapZ + 2.5),
        new THREE.Vector3(labelRight + 8, labelBottom, flapZ + 2.5),
        `${S.labelHeight}mm`,
        '#1d4ed8',
        'right'
      );
    }

    // =========================================================
    // 3. THƯỚC ĐO ĐƯỜNG KÍNH LÕI CUỘN KIỂU THƯỚC NGANG (<---> Lõi Ø30mm)
    // =========================================================
    if (toggles.core !== false) {
      drawCoreDiameterDimension(webW, rollCenterY, S.coreDiameter);
    }

    // =========================================================
    // 4. NẾU CÓ NHIỀU HÀNG / CỘT: ĐO KHOẢNG CÁCH GAP X TRÊN HÀNG
    // =========================================================
    if (toggles.gapX !== false && S.ups > 1 && S.gapX > 0) {
      const col0R = col0Right;
      const col1L = col0R + S.gapX;
      draw2HeadArrow(
        new THREE.Vector3(col0R, targetLabelCenterY, flapZ + 2),
        new THREE.Vector3(col1L, targetLabelCenterY, flapZ + 2),
        `${S.gapX}mm`,
        '#059669',
        'bottom',
        true
      );
    }

    // =========================================================
    // 5. BƯỚC NHẢY 2 HÀNG (GAP Y - KHOẢNG CÁCH DỌC GIỮA 2 HÀNG TEM KHOANH ĐỎ)
    // =========================================================
    if (toggles.gapY !== false && S.gapY > 0) {
      const row0BottomY = targetLabelCenterY - S.labelHeight / 2;
      const row1TopY = row0BottomY - S.gapY;
      // Đặt ở mép con tem cột 0 (đúng vị trí mũi tên đỏ người dùng vẽ trên ảnh)
      const xGapY = col0Left + Math.min(14, S.labelWidth * 0.28);
      drawVerticalGapArrow(
        xGapY,
        row0BottomY,
        row1TopY,
        flapZ + 2.5,
        `${S.gapY}mm`,
        '#d97706'
      );
    }

    // =========================================================
    // 6. LỀ BIÊN 2 BÊN (MARGIN - KHOẢNG CÁCH TỪ MÉP ĐẾ ĐẾN MÉP TEM KHOANH ĐỎ)
    // =========================================================
    if (toggles.margin !== false && S.marginX > 0) {
      const linerLeft = -webW / 2;
      const label0Left = col0Left;
      const marginY = targetLabelCenterY + S.labelHeight * 0.22;
      drawHorizontalMarginArrow(
        linerLeft,
        label0Left,
        marginY,
        flapZ + 2.5,
        `${S.marginX}mm`,
        '#6366f1'
      );
    }

    // =========================================================
    // 7. GHI CHÚ RĂNG CƯA XÉ (MŨI TÊN CHỈ VÀO ĐƯỜNG RĂNG CƯA)
    // =========================================================
    if (S.hasPerforation && toggles.perforation !== false) {
      const row0BottomY = targetLabelCenterY - S.labelHeight / 2;
      const perfY = row0BottomY - S.gapY / 2;
      drawPerforationCallout(webW, perfY, flapZ + 2.5, labelRight);
    }
  }

  /**
   * VẼ GHI CHÚ RĂNG CƯA XÉ (MŨI TÊN CHỈ VÀO ĐƯỜNG RĂNG CƯA & BADGE)
   */
  function drawPerforationCallout(webW, perfY, z, labelRight) {
    const group = new THREE.Group();
    group.renderOrder = 999;
    dimensionsGroup.add(group);

    const userScale = (window.AppState && window.AppState.dimTextScale) ? window.AppState.dimTextScale : 1.35;
    const colorHex = '#0f172a'; // Đen than kỹ thuật sắc nét
    const colorNum = 0x0f172a;

    // Điểm mũi tên cắm vào đường răng cưa xé (ngay mép phải con tem trên dải rủ)
    const tipX = Math.min(webW / 2 - 0.5, labelRight + 0.5);
    const pTip = new THREE.Vector3(tipX, perfY, z);

    // Điểm gấp khúc (Knee) chếch sang phải và hạ nhẹ 5mm
    const kneeX = webW / 2 + 1.5 * userScale;
    const kneeY = perfY - 5.0 * userScale;
    const pKnee = new THREE.Vector3(kneeX, kneeY, z);

    // Điểm kết thúc thanh gạch ngang (Shelf)
    const shelfLen = 3.5 * userScale;
    const pShelf = new THREE.Vector3(kneeX + shelfLen, kneeY, z);

    const lineMat = new THREE.LineBasicMaterial({
      color: colorNum,
      linewidth: 2.2,
      depthTest: false,
      depthWrite: false
    });

    // 1. Thanh gạch chân ngang (Shelf line)
    const shelfGeo = new THREE.BufferGeometry().setFromPoints([pKnee, pShelf]);
    const shelfLine = new THREE.Line(shelfGeo, lineMat);
    shelfLine.renderOrder = 999;
    group.add(shelfLine);

    // 2. Mũi tên từ pKnee chỉ thẳng vào pTip trên đường răng cưa
    const dir = new THREE.Vector3().subVectors(pTip, pKnee);
    const dist = dir.length();
    dir.normalize();

    const arrowHeadLen = Math.min(4.5 * userScale, dist * 0.45);
    const arrowHeadWidth = Math.min(3.2 * userScale, dist * 0.32);
    const arrow = new THREE.ArrowHelper(dir, pKnee, dist, colorNum, arrowHeadLen, arrowHeadWidth);
    if (arrow.line) { arrow.line.material.depthTest = false; arrow.line.material.depthWrite = false; }
    if (arrow.cone) { arrow.cone.material.depthTest = false; arrow.cone.material.depthWrite = false; }
    arrow.renderOrder = 999;
    group.add(arrow);

    // 3. Sprite chữ "Răng cưa xé" gọn gàng, liền mạch ngay sau thanh gạch ngang
    const sprite = createCrispTextSprite('Răng cưa xé', '#0f172a', true, '#ffffff');
    sprite.position.set(pShelf.x + 13 * userScale, kneeY, z + 0.2);
    group.add(sprite);
  }

  /**
   * VẼ ĐO BƯỚC NHẢY DỌC GIỮA 2 HÀNG (GAP Y - VẠCH KỸ THUẬT & SPRITE NÉT CĂNG)
   */
  function drawVerticalGapArrow(x, yTop, yBottom, z, text, colorHex) {
    const group = new THREE.Group();
    group.renderOrder = 999;
    dimensionsGroup.add(group);

    const colorNum = parseInt(colorHex.replace('#', '0x'), 16) || 0xd97706;
    const lineMat = new THREE.LineBasicMaterial({ color: colorNum, linewidth: 2, depthTest: false, depthWrite: false });

    // 1. Hai vạch ngang cữ kỹ thuật (Extension ticks) tại 2 mép con tem
    const tickHalfW = 3.5;
    const topTickGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x - tickHalfW, yTop, z),
      new THREE.Vector3(x + tickHalfW, yTop, z)
    ]);
    const botTickGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x - tickHalfW, yBottom, z),
      new THREE.Vector3(x + tickHalfW, yBottom, z)
    ]);
    const topTick = new THREE.Line(topTickGeo, lineMat);
    const botTick = new THREE.Line(botTickGeo, lineMat);
    topTick.renderOrder = 999;
    botTick.renderOrder = 999;
    group.add(topTick);
    group.add(botTick);

    // 2. Đường kẻ dọc nối 2 vạch
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, yTop, z),
      new THREE.Vector3(x, yBottom, z)
    ]);
    const line = new THREE.Line(lineGeo, lineMat);
    line.renderOrder = 999;
    group.add(line);

    // 3. Hai đầu mũi tên chỉ vào khoảng cách
    const dist = Math.abs(yTop - yBottom);
    if (dist >= 5) {
      const a1 = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(x, yTop, z), dist, colorNum, 2.5, 2);
      const a2 = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x, yBottom, z), dist, colorNum, 2.5, 2);
      [a1, a2].forEach(a => {
        if (a.line) { a.line.material.depthTest = false; a.line.material.depthWrite = false; }
        if (a.cone) { a.cone.material.depthTest = false; a.cone.material.depthWrite = false; }
        a.renderOrder = 999;
        group.add(a);
      });
    } else {
      const arrowLen = 3;
      const a1 = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(x, yTop + arrowLen, z), arrowLen, colorNum, 2.2, 1.8);
      const a2 = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x, yBottom - arrowLen, z), arrowLen, colorNum, 2.2, 1.8);
      [a1, a2].forEach(a => {
        if (a.line) { a.line.material.depthTest = false; a.line.material.depthWrite = false; }
        if (a.cone) { a.cone.material.depthTest = false; a.cone.material.depthWrite = false; }
        a.renderOrder = 999;
        group.add(a);
      });
    }

    // 4. Sprite chữ hiển thị kích thước bước nhảy (Ví dụ: "3mm")
    const midY = (yTop + yBottom) / 2;
    const sprite = createCrispTextSprite(text, colorHex, true, '#ffffff');
    const userScale = (window.AppState && window.AppState.dimTextScale) ? window.AppState.dimTextScale : 1.35;
    sprite.position.set(x + 14 * userScale, midY, z + 0.2);
    group.add(sprite);
  }

  /**
   * VẼ ĐO LỀ BIÊN 2 BÊN (MARGIN - VẠCH KỸ THUẬT & MŨI TÊN NGANG)
   */
  function drawHorizontalMarginArrow(xLeft, xRight, y, z, text, colorHex) {
    const group = new THREE.Group();
    group.renderOrder = 999;
    dimensionsGroup.add(group);

    const colorNum = parseInt(colorHex.replace('#', '0x'), 16) || 0x6366f1;
    const lineMat = new THREE.LineBasicMaterial({ color: colorNum, linewidth: 2, depthTest: false, depthWrite: false });

    // 1. Hai vạch dọc cữ kỹ thuật (Extension ticks) tại mép đế và mép tem
    const tickHalfH = 3.5;
    const leftTickGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(xLeft, y - tickHalfH, z),
      new THREE.Vector3(xLeft, y + tickHalfH, z)
    ]);
    const rightTickGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(xRight, y - tickHalfH, z),
      new THREE.Vector3(xRight, y + tickHalfH, z)
    ]);
    const leftTick = new THREE.Line(leftTickGeo, lineMat);
    const rightTick = new THREE.Line(rightTickGeo, lineMat);
    leftTick.renderOrder = 999;
    rightTick.renderOrder = 999;
    group.add(leftTick);
    group.add(rightTick);

    // 2. Đường kẻ ngang nối 2 vạch
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(xLeft, y, z),
      new THREE.Vector3(xRight, y, z)
    ]);
    const line = new THREE.Line(lineGeo, lineMat);
    line.renderOrder = 999;
    group.add(line);

    // 3. Mũi tên
    const dist = Math.abs(xRight - xLeft);
    if (dist >= 5) {
      const a1 = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(xLeft, y, z), dist, colorNum, 2.5, 2);
      const a2 = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(xRight, y, z), dist, colorNum, 2.5, 2);
      [a1, a2].forEach(a => {
        if (a.line) { a.line.material.depthTest = false; a.line.material.depthWrite = false; }
        if (a.cone) { a.cone.material.depthTest = false; a.cone.material.depthWrite = false; }
        a.renderOrder = 999;
        group.add(a);
      });
    } else {
      const arrowLen = 3;
      const a1 = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(xLeft - arrowLen, y, z), arrowLen, colorNum, 2.2, 1.8);
      const a2 = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(xRight + arrowLen, y, z), arrowLen, colorNum, 2.2, 1.8);
      [a1, a2].forEach(a => {
        if (a.line) { a.line.material.depthTest = false; a.line.material.depthWrite = false; }
        if (a.cone) { a.cone.material.depthTest = false; a.cone.material.depthWrite = false; }
        a.renderOrder = 999;
        group.add(a);
      });
    }

    // 4. Sprite chữ hiển thị kích thước lề biên "2mm" (To rõ ràng, không đè lên 50mm hay Lõi)
    const midX = (xLeft + xRight) / 2;
    const sprite = createCrispTextSprite(text, colorHex, false, '#ffffff');
    const userScale = (window.AppState && window.AppState.dimTextScale) ? window.AppState.dimTextScale : 1.35;
    // Đặt phía dưới đường kẻ lề biên (y - 8.5 * userScale) để tách biệt hoàn toàn với nhãn 50mm (ở phía trên)
    sprite.position.set(midX - 2 * userScale, y - 8.5 * userScale, z + 2.0);
    group.add(sprite);
  }

  /**
   * VẼ THƯỚC ĐO ĐƯỜNG KÍNH LÕI CUỘN KIỂU THƯỚC NGANG (<---> Lõi Ø 30mm)
   * Hiển thị đường dóng ngang qua đường kính tâm lỗ lõi với 2 mũi tên chạm 2 mép thành trong ống carton
   */
  function drawCoreDiameterDimension(webW, rollCenterY, coreDiameter) {
    const group = new THREE.Group();
    group.renderOrder = 999;
    dimensionsGroup.add(group);

    const coreR = coreDiameter / 2;
    const faceX = -webW / 2 - 1.5; // Đặt ngay phía trước mặt bên của cuộn tem
    const centerY = rollCenterY;
    const colorHex = '#1d4ed8';
    const colorNum = 0x1d4ed8;

    // Hai điểm mép thành trong ống lõi theo phương ngang Z (mặt nhìn cạnh bên)
    const pLeft = new THREE.Vector3(faceX, centerY, -coreR);
    const pRight = new THREE.Vector3(faceX, centerY, coreR);

    // 1. Đường dóng ngang đo đường kính lỗ lõi
    const lineMat = new THREE.LineBasicMaterial({
      color: colorNum,
      linewidth: 2.5,
      depthTest: false,
      depthWrite: false
    });
    const lineGeo = new THREE.BufferGeometry().setFromPoints([pLeft, pRight]);
    const line = new THREE.Line(lineGeo, lineMat);
    line.renderOrder = 999;
    group.add(line);

    // 2. Hai vạch chắn giới hạn mép thành trong ống (ticks)
    const tickLen = Math.min(6, coreR * 0.35);
    const tickMat = new THREE.LineBasicMaterial({
      color: colorNum,
      linewidth: 2,
      depthTest: false,
      depthWrite: false
    });
    const tickLeftGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(faceX, centerY - tickLen, -coreR),
      new THREE.Vector3(faceX, centerY + tickLen, -coreR)
    ]);
    const tickRightGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(faceX, centerY - tickLen, coreR),
      new THREE.Vector3(faceX, centerY + tickLen, coreR)
    ]);
    const tickLeft = new THREE.Line(tickLeftGeo, tickMat);
    const tickRight = new THREE.Line(tickRightGeo, tickMat);
    tickLeft.renderOrder = 999;
    tickRight.renderOrder = 999;
    group.add(tickLeft);
    group.add(tickRight);

    // 3. Hai đầu mũi tên 2 chiều chạm vào thành trong ống carton
    const arrowLen = Math.min(4.5, coreR * 0.32);
    const arrowWidth = Math.min(3, arrowLen * 0.7);

    // Mũi tên trái: chỉ về mép -coreR (hướng -Z)
    const arrowLeft = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(faceX, centerY, -coreR + arrowLen),
      arrowLen,
      colorNum,
      arrowLen,
      arrowWidth
    );
    // Mũi tên phải: chỉ về mép +coreR (hướng +Z)
    const arrowRight = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(faceX, centerY, coreR - arrowLen),
      arrowLen,
      colorNum,
      arrowLen,
      arrowWidth
    );

    [arrowLeft, arrowRight].forEach(a => {
      if (a.line) { a.line.material.depthTest = false; a.line.material.depthWrite = false; }
      if (a.cone) { a.cone.material.depthTest = false; a.cone.material.depthWrite = false; }
      a.renderOrder = 999;
      group.add(a);
    });

    // 4. Sprite chữ hiển thị kích thước đường kính "Lõi Ø 30mm"
    const text = `Lõi Ø ${coreDiameter.toFixed(0)}mm`;
    const sprite = createCrispTextSprite(text, colorHex, false, '#ffffff');
    const userScale = (window.AppState && window.AppState.dimTextScale) ? window.AppState.dimTextScale : 1.35;
    // Đặt ở góc cao bên trái (centerY + 16 * userScale) để hoàn toàn tách biệt với nhãn 2mm và 50mm
    sprite.position.set(faceX - 4 * userScale, centerY + 16 * userScale, 0);
    group.add(sprite);
  }

  /**
   * VẼ MŨI TÊN 2 ĐẦU ĐO KÍCH THƯỚC KỸ THUẬT
   */
  function draw2HeadArrow(p1, p2, text, colorHex, labelSide, isSmall = false) {
    const group = new THREE.Group();
    group.renderOrder = 999;
    dimensionsGroup.add(group);

    const colorNum = parseInt(colorHex.replace('#', '0x'), 16) || 0x1d4ed8;
    const lineMat = new THREE.LineBasicMaterial({ color: colorNum, linewidth: 2, depthTest: false, depthWrite: false });
    const points = [p1, p2];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geo, lineMat);
    line.renderOrder = 999;
    group.add(line);

    // 2 đầu mũi tên
    const dist = p1.distanceTo(p2);
    if (dist > 4) {
      const dir1 = new THREE.Vector3().subVectors(p1, p2).normalize();
      const dir2 = new THREE.Vector3().subVectors(p2, p1).normalize();
      const arrowLen = isSmall ? 3 : 5;
      const arrowW = isSmall ? 2 : 3.5;

      const arrow1 = new THREE.ArrowHelper(dir1, p2, dist, colorNum, arrowLen, arrowW);
      const arrow2 = new THREE.ArrowHelper(dir2, p1, dist, colorNum, arrowLen, arrowW);
      if (arrow1.line) { arrow1.line.material.depthTest = false; arrow1.line.material.depthWrite = false; }
      if (arrow1.cone) { arrow1.cone.material.depthTest = false; arrow1.cone.material.depthWrite = false; }
      if (arrow2.line) { arrow2.line.material.depthTest = false; arrow2.line.material.depthWrite = false; }
      if (arrow2.cone) { arrow2.cone.material.depthTest = false; arrow2.cone.material.depthWrite = false; }
      arrow1.renderOrder = 999;
      arrow2.renderOrder = 999;
      group.add(arrow1);
      group.add(arrow2);
    }

    // Text kích thước
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    const sprite = createCrispTextSprite(text, colorHex, isSmall, '#ffffff');

    const userScale = (window.AppState && window.AppState.dimTextScale) ? window.AppState.dimTextScale : 1.35;
    if (labelSide === 'top') {
      mid.y += (isSmall ? 4.5 : 8) * userScale;
    } else if (labelSide === 'right') {
      mid.x += (isSmall ? 5.5 : 10) * userScale;
    } else if (labelSide === 'bottom') {
      mid.y -= (isSmall ? 4.5 : 8) * userScale;
    }
    sprite.position.copy(mid);
    group.add(sprite);
  }

  /**
   * TẠO SPRITE CHỮ SIÊU NÉT KHÔNG BỊ MỜ HAY CHE KHUẤT (CRISP TEXT SPRITE)
   */
  function createCrispTextSprite(text, textColorHex, isSmall, bgColorHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let fontSize = isSmall ? 44 : (text.length > 8 ? 46 : 54);
    ctx.font = `bold ${fontSize}px "Plus Jakarta Sans", "JetBrains Mono", sans-serif`;
    let textWidth = ctx.measureText(text).width;
    if (textWidth > canvas.width - 70) {
      fontSize = Math.floor(fontSize * (canvas.width - 70) / textWidth);
      ctx.font = `bold ${fontSize}px "Plus Jakarta Sans", "JetBrains Mono", sans-serif`;
      textWidth = ctx.measureText(text).width;
    }

    // Vẽ nền badge viền mềm để không bị đường kẻ hay bề mặt 3D cắt xuyên qua
    const padX = 30;
    // Đảm bảo badge có chiều rộng tối thiểu 150px để các số ngắn như "2mm", "3mm" có badge to rõ ràng
    const badgeW = Math.max(150, Math.min(canvas.width - 20, textWidth + padX * 2));
    const badgeH = 88;
    const bx = (canvas.width - badgeW) / 2;
    const by = (canvas.height - badgeH) / 2;
    const radius = 20;

    ctx.fillStyle = bgColorHex || 'rgba(255, 255, 255, 0.98)';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(bx, by, badgeW, badgeH, radius);
    } else {
      ctx.rect(bx, by, badgeW, badgeH);
    }
    ctx.fill();

    // Viền nhẹ cho badge
    ctx.strokeStyle = textColorHex;
    ctx.lineWidth = 4.5;
    ctx.stroke();

    // Chữ số kích thước to, sắc nét ở chính giữa badge
    ctx.fillStyle = textColorHex;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    // depthTest = false và depthWrite = false giúp chữ không bao giờ bị khối 3D che khuất khi xoay nghiêng
    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(mat);
    sprite.renderOrder = 999;

    const userScale = (window.AppState && window.AppState.dimTextScale) ? window.AppState.dimTextScale : 1.35;
    // Đặt baseScale = 17 cho tất cả mọi số đo (kể cả 2mm, 3mm) để to rõ ràng, không bị thu nhỏ
    const baseScale = 17;
    const finalScale = baseScale * userScale;
    sprite.scale.set(finalScale * 3.0, finalScale * 0.88, 1);
    return sprite;
  }

  /**
   * ĐỒNG BỘ CHẤT LIỆU CON TEM TỪ 2D DESIGNER SANG 3D VỚI ĐỘ PHÂN GIẢI CAO NHẤT
   */
  function syncLabelTexture(canvas2D) {
    if (!canvas2D) return;

    if (!labelCanvasTexture) {
      labelCanvasTexture = new THREE.CanvasTexture(canvas2D);
      labelCanvasTexture.minFilter = THREE.LinearFilter;
      labelCanvasTexture.magFilter = THREE.LinearFilter;
      labelCanvasTexture.anisotropy = 16; // Chống mờ tối đa
      labelCanvasTexture.flipY = true; // Chiều chuẩn Canvas HTML -> Three.js (chữ và barcode xuôi chiều)
    } else {
      labelCanvasTexture.image = canvas2D;
      labelCanvasTexture.needsUpdate = true;
    }

    if (labelMaterial) {
      labelMaterial.map = labelCanvasTexture;
      labelMaterial.needsUpdate = true;
    }
  }

  function toggleDimensions(visible) {
    const S = window.AppState;
    S.show3DDimensions = visible;
    if (dimensionsGroup) {
      dimensionsGroup.visible = visible;
      if (visible && dimensionsGroup.children.length === 0) {
        updateDimensions();
      }
    }
  }

  function updateDimensions() {
    if (!dimensionsGroup) return;
    while (dimensionsGroup.children.length > 0) {
      const obj = dimensionsGroup.children[0];
      dimensionsGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }
    const S = window.AppState;
    if (S.show3DDimensions && lastDimParams) {
      dimensionsGroup.visible = true;
      buildTechnicalDimensions(
        lastDimParams.rollCenterY,
        lastDimParams.outerR,
        lastDimParams.webW,
        lastDimParams.flapZ,
        lastDimParams.flapTopY,
        lastDimParams.numRows
      );
    } else {
      dimensionsGroup.visible = false;
    }
  }

  /**
   * TÍNH TOÁN TÂM HÌNH HỌC THỰC TẾ CỦA CUỘN TEM ĐỂ CONTROLS ZOOM CHÍNH XÁC VÀO TRUNG TÂM
   */
  function getModelCenter() {
    if (rollGroup && rollGroup.children.length > 0) {
      const box = new THREE.Box3().setFromObject(rollGroup);
      const center = new THREE.Vector3();
      box.getCenter(center);
      return center;
    }
    return new THREE.Vector3(5, 52.5, 5);
  }

  return {
    init,
    rebuildRoll,
    updateMaterials,
    syncLabelTexture,
    toggleDimensions,
    updateDimensions,
    getRollRootGroup: () => rollRootGroup,
    getRollGroup: () => rollGroup,
    getModelCenter
  };
})();
