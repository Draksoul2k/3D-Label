/**
 * EXPORT_PROOF.JS - Hệ Thống Xuất Phiếu Duyệt Mẫu In Ấn Kỹ Thuật (Technical Approval Sheet)
 * Tự động tạo bản maket A4 chính thức gồm Hình 3D + Bản vẽ 2D + Bảng thông số + Chữ ký duyệt
 */

window.ExportProof = (function () {

  function init() {
    // 1. Mở modal phiếu duyệt
    document.getElementById('btn-open-proof')?.addEventListener('click', openProofModal);
    document.getElementById('btn-generate-proof-sheet')?.addEventListener('click', openProofModal);

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

    // Lấy thông tin từ form
    const compName = document.getElementById('proof-company-name')?.value || 'CÔNG TY TNHH IN ẤN & TEM NHÃN VIỆT NAM';
    const clientName = document.getElementById('proof-client-name')?.value || 'Khách hàng';
    const jobId = document.getElementById('proof-job-id')?.value || 'JOB-2026-01';
    const proofDate = document.getElementById('proof-date')?.value || new Date().toLocaleDateString('vi-VN');
    const designerName = document.getElementById('proof-designer-name')?.value || 'Kỹ thuật viên In ấn';

    // Đổ dữ liệu vào phiếu
    document.getElementById('out-proof-company').textContent = compName;
    document.getElementById('out-proof-client').textContent = clientName;
    document.getElementById('out-proof-job').textContent = `MÃ ĐƠN: ${jobId}`;
    document.getElementById('out-proof-date').textContent = `Ngày lập: ${proofDate}`;
    document.getElementById('out-proof-designer').textContent = designerName;
    document.getElementById('out-proof-summary').textContent = `Tem cuộn ${S.labelWidth}x${S.labelHeight}mm, ${S.ups} tem/hàng, lõi ${S.coreName}`;

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
    const colorText = S.colorMode === 'preprint' ? 'In phôi sẵn' : (S.colorMode === 'white' ? 'Trắng' : (S.colorMode === 'blue' ? 'Xanh' : (S.colorMode === 'red' ? 'Đỏ' : S.labelColor)));
    const tableMaterial = document.getElementById('table-material');
    if (tableMaterial) {
      const ltStr = S.leadTimeDays ? String(S.leadTimeDays).trim() : '3';
      const ltDisplay = ltStr.toLowerCase().includes('ngày') ? ltStr : `${ltStr} ngày`;
      tableMaterial.textContent = `${matName} | Màu nền: ${colorText} | Thời gian SX: ${ltDisplay}`;
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
      const jobId = document.getElementById('proof-job-id')?.value || 'JOB';
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
