/**
 * EXPORT_PROOF.JS - Hệ Thống Xuất Phiếu Duyệt Mẫu In Ấn Kỹ Thuật (Technical Approval Sheet)
 * Tự động tạo bản maket A4 chính thức gồm Hình 3D + Bản vẽ 2D + Bảng thông số + Chữ ký duyệt
 */

window.ExportProof = (function () {

  function init() {
    // Khôi phục các giá trị đã lưu gần nhất từ localStorage nếu có
    try {
      const savedComp = localStorage.getItem('proof_company_name');
      const savedClient = localStorage.getItem('proof_client_name');
      const savedJob = localStorage.getItem('proof_job_id');
      const savedDate = localStorage.getItem('proof_date');
      const savedDes = localStorage.getItem('proof_designer_name');

      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el && val) el.value = val;
      };

      setVal('proof-company-name-view', savedComp);
      setVal('proof-company-name', savedComp);
      setVal('proof-client-name-view', savedClient);
      setVal('proof-client-name', savedClient);
      setVal('proof-job-id-view', savedJob);
      setVal('proof-job-id', savedJob);
      setVal('proof-date-view', savedDate);
      setVal('proof-date', savedDate);
      setVal('proof-designer-name-view', savedDes);
      setVal('proof-designer-name', savedDes);
    } catch (e) {}

    // Lắng nghe thay đổi trực tiếp trên các ô input
    ['proof-company-name-view', 'proof-client-name-view', 'proof-job-id-view', 'proof-date-view', 'proof-designer-name-view'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', (e) => {
        const keyMap = {
          'proof-company-name-view': 'proof_company_name',
          'proof-client-name-view': 'proof_client_name',
          'proof-job-id-view': 'proof_job_id',
          'proof-date-view': 'proof_date',
          'proof-designer-name-view': 'proof_designer_name'
        };
        try {
          if (keyMap[id]) localStorage.setItem(keyMap[id], e.target.value.trim());
        } catch (err) {}
      });
    });

    // 1. Mở modal phiếu duyệt
    document.getElementById('btn-open-proof')?.addEventListener('click', openProofModal);
    document.getElementById('btn-generate-proof-sheet')?.addEventListener('click', openProofModal);
    document.getElementById('btn-generate-proof-sheet-view')?.addEventListener('click', openProofModal);

    // 2. Đóng modal
    document.getElementById('btn-close-proof')?.addEventListener('click', closeProofModal);

    // 3. Nút In / PDF
    document.getElementById('btn-print-proof')?.addEventListener('click', () => {
      window.print();
    });

    // 4. Nút Tải ảnh PNG phiếu duyệt
    document.getElementById('btn-download-proof-img')?.addEventListener('click', downloadProofImage);
  }

  function openProofModal() {
    const modal = document.getElementById('proof-modal');
    if (!modal) return;

    const S = window.AppState;

    // Lấy thông tin từ form (hỗ trợ cả id có hậu tố -view và không có)
    const getVal = (idView, idAlt, defaultVal) => {
      const elView = document.getElementById(idView);
      if (elView && elView.value && elView.value.trim()) return elView.value.trim();
      const elAlt = document.getElementById(idAlt);
      if (elAlt && elAlt.value && elAlt.value.trim()) return elAlt.value.trim();
      return defaultVal;
    };

    const compName = getVal('proof-company-name-view', 'proof-company-name', 'CÔNG TY CỔ PHẦN GIẢI PHÁP HACODE');
    const clientName = getVal('proof-client-name-view', 'proof-client-name', 'Công Ty Cổ Phần Thực Phẩm An Gia');
    const jobId = getVal('proof-job-id-view', 'proof-job-id', 'JOB-2026-8899');
    const proofDate = getVal('proof-date-view', 'proof-date', '07/09/2026');
    const designerName = getVal('proof-designer-name-view', 'proof-designer-name', 'Lê Duy');

    // Lưu lại vào localStorage để ghi nhớ
    try {
      localStorage.setItem('proof_company_name', compName);
      localStorage.setItem('proof_client_name', clientName);
      localStorage.setItem('proof_job_id', jobId);
      localStorage.setItem('proof_date', proofDate);
      localStorage.setItem('proof_designer_name', designerName);
    } catch (e) {}

    // Đổ dữ liệu vào phiếu
    const setElemText = (id, txt) => {
      const el = document.getElementById(id);
      if (el) el.textContent = txt;
    };

    setElemText('out-proof-company', compName);
    setElemText('out-proof-client', clientName);
    setElemText('out-proof-client-sign', clientName);
    setElemText('out-proof-job', `MÃ ĐƠN: ${jobId}`);
    setElemText('out-proof-date', `Ngày lập: ${proofDate}`);
    setElemText('out-proof-designer', designerName);
    setElemText('out-proof-designer-header', designerName);
    setElemText('out-proof-summary', `Tem cuộn ${S.labelWidth}x${S.labelHeight}mm, ${S.ups} tem/hàng, lõi ${S.coreName}`);

    // Đổ dữ liệu bảng thông số kỹ thuật
    document.getElementById('table-label-size').textContent = `${S.labelWidth} x ${S.labelHeight} mm`;
    document.getElementById('table-radius').textContent = S.cornerRadius === 0 ? 'Góc vuông (R0)' : `R = ${S.cornerRadius.toFixed(1)} mm`;
    document.getElementById('table-ups').textContent = `${S.ups} tem / hàng`;
    document.getElementById('table-gap-x').textContent = `${S.gapX.toFixed(1)} mm`;
    document.getElementById('table-gap-y').textContent = `${S.gapY.toFixed(1)} mm (Bước nhảy)`;
    document.getElementById('table-margin-x').textContent = `${S.marginX.toFixed(1)} mm`;
    document.getElementById('table-core').textContent = `${S.coreName} (~${S.coreDiameter.toFixed(1)} mm)`;
    document.getElementById('table-web-width').textContent = `${S.webWidth.toFixed(1)} mm`;
    document.getElementById('table-roll-length').textContent = `${S.rollLength} m (~${S.labelCount.toLocaleString()} tem)`;
    document.getElementById('table-od').textContent = `~${S.outerDiameter} mm`;
    const windCell = document.getElementById('table-wind-dir');
    if (windCell) windCell.textContent = getWindDirectionText(S.windDirection);

    const matName = getMaterialName(S.materialType || S.materialFinish);
    const colName = S.colorMode === 'white' ? 'Trắng' : (S.colorMode === 'yellow' ? 'Vàng' : (S.colorMode === 'blue' ? 'Xanh' : (S.colorMode === 'red' ? 'Đỏ' : S.labelColor)));
    const colorText = (S.isPreprint || S.colorMode === 'preprint') ? 'In phôi sẵn' : colName;
    const tableMaterial = document.getElementById('table-material');
    if (tableMaterial) {
      const statusText = (S.statusMode === 'ready') ? 'Sẵn hàng' : `Đặt SX: ${S.leadTimeDays || '3 ngày'}`;
      tableMaterial.textContent = `${matName} | Màu nền: ${colorText} | Tình trạng: ${statusText}`;
    }

    // Chụp hình 3D phối cảnh
    if (window.Scene3D) {
      const snap3D = window.Scene3D.getSnapshotDataURL();
      const img3d = document.getElementById('proof-img-3d');
      if (img3d && snap3D) img3d.src = snap3D;
    }

    // Chụp hình bản vẽ 2D
    if (window.Blueprint2D) {
      const canvas2d = window.Blueprint2D.getCanvas();
      const img2d = document.getElementById('proof-img-2d');
      if (img2d && canvas2d) img2d.src = canvas2d.toDataURL('image/png');
    }

    modal.style.display = 'block';
  }

  function closeProofModal() {
    const modal = document.getElementById('proof-modal');
    if (modal) modal.style.display = 'none';
  }

  function getMaterialName(key) {
    const map = {
      paper_normal: 'Giấy thường (xé rách được)',
      paper_thermal: 'Giấy nhiệt (xé rách được)',
      pvc: 'PVC (xé không rách)',
      silver: 'Xi bạc (ánh kim)',
      matte: 'Decal giấy thường / mờ',
      gloss: 'Cán màng bóng',
      metallic: 'Decal xi bạc kim loại',
      gold: 'Decal nhũ vàng',
      kraft: 'Giấy Kraft thô mộc'
    };
    return map[key] || 'Giấy thường (xé rách được)';
  }

  function getWindDirectionText(dir) {
    const map = {
      out_top: 'Mặt ngoài - Tem ra đầu (Head First)',
      out_foot: 'Mặt ngoài - Tem ra chân (Foot First)',
      out_left: 'Mặt ngoài - Tem ra trái (Left First)',
      out_right: 'Mặt ngoài - Tem ra phải (Right First)',
      in_top: 'Mặt trong - Tem ra đầu',
      in_foot: 'Mặt trong - Tem ra chân'
    };
    return map[dir] || 'Mặt ngoài - Tem ra đầu';
  }

  /**
   * XUẤT ẢNH PNG PHIẾU DUYỆT BẰNG HTML2CANVAS
   */
  function downloadProofImage() {
    const sheetEl = document.getElementById('proof-sheet-printable');
    if (!sheetEl) return;

    const btn = document.getElementById('btn-download-proof-img');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xuất...';

    html2canvas(sheetEl, {
      scale: 2, // Độ phân giải cao x2
      useCORS: true,
      backgroundColor: '#ffffff'
    }).then(canvas => {
      const link = document.createElement('a');
      const jobId = document.getElementById('proof-job-id-view')?.value
        || document.getElementById('proof-job-id')?.value
        || 'JOB';
      link.download = `Phieu-Duyet-Maket-Tem-Cuon-${jobId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      if (btn) btn.innerHTML = originalText;
    }).catch(err => {
      console.error('Error generating proof image:', err);
      if (btn) btn.innerHTML = originalText;
      alert('Không thể tạo file ảnh. Bạn có thể dùng nút In / Tải PDF!');
    });
  }

  return {
    init,
    openProofModal,
    closeProofModal
  };
})();

// Khởi tạo sau khi DOM load
document.addEventListener('DOMContentLoaded', () => {
  window.ExportProof.init();
});
