/**
 * GOOGLE GEMINI AI INTEGRATION MODULE
 * Tích hợp trực tiếp Google Gemini (3.5 Flash / 2.5 Flash) để tự động phân tích
 * yêu cầu sản phẩm, sáng tạo nội dung chuẩn bao bì & tự động bố cục tem nhãn.
 */

window.GeminiService = (function () {
  'use strict';

  // API Key chính xác của người dùng
  const DEFAULT_KEY = 'AIzaSyCsh6Gq9vJK2mwL_KvtkQ4PanNf-yk1z8g';

  // Luôn đồng bộ và đảm bảo key này là active key
  try {
    localStorage.setItem('gemini_api_key', DEFAULT_KEY);
  } catch (e) {}

  // Các model Gemini hỗ trợ (ưu tiên từ cao xuống thấp)
  const CANDIDATE_MODELS = [
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3-flash-preview',
    'gemini-2.5-flash'
  ];

  function getApiKey() {
    return localStorage.getItem('gemini_api_key') || DEFAULT_KEY;
  }

  function setApiKey(key) {
    if (key && key.trim()) {
      localStorage.setItem('gemini_api_key', key.trim());
    }
  }

  /**
   * Gọi API Gemini để phân tích yêu cầu tạo tem
   * @param {string} userPrompt - Mô tả sản phẩm người dùng nhập
   */
  async function generateLabelContent(userPrompt) {
    const key = getApiKey();
    if (!key) {
      throw new Error('Chưa cấu hình Gemini API Key. Vui lòng nhập Key.');
    }

    const systemPrompt = `Bạn là chuyên gia thiết kế bao bì tem nhãn sản phẩm và tem công nghiệp hàng đầu Việt Nam.
Nhiệm vụ của bạn: Dựa trên mô tả sản phẩm sau từ người dùng: "${userPrompt}"
Hãy tự động suy luận, sáng tạo nội dung đầy đủ, chuyên nghiệp, chuẩn quy định ghi nhãn hàng hoá.

Hãy xác định loại tem:
- Nếu mô tả yêu cầu làm tem khung kho, tem bảng biểu, tem xuất nhập, tem PMV, tem kiểm kê có ô trống để viết tay -> chọn layoutType: "table".
- Nếu là tem sản phẩm bán lẻ, tem trà, mỹ phẩm, thực phẩm, đồ uống, thiết bị, mã vạch -> chọn layoutType: "product".

Trả về DUY NHẤT một đối tượng JSON hợp lệ (không kèm markdown \`\`\`json, không giải thích gì thêm):
{
  "layoutType": "product", 
  "productName": "TÊN SẢN PHẨM VIẾT HOA NỔI BẬT",
  "brand": "TÊN THƯƠNG HIỆU HOẶC NHÀ SẢN XUẤT",
  "spec": "Khối lượng tịnh / Dung tích / Quy cách (VD: 100g, 50ml, Hộp 20 gói)",
  "barcode": "Dãy số mã vạch 13 số bắt đầu bằng 893 (VD: 8936012345678) hoặc mã SKU",
  "codeType": "code128", 
  "dateText": "NSX: Xem trên bao bì | HSD: 24 tháng kể từ ngày SX",
  "extraText": "Thành phần chuẩn, hướng dẫn bảo quản khô ráo, cảnh báo an toàn & Hotline",
  "suggestedColor": "#FFFFFF",
  "companyName": "Tên công ty / Đơn vị sản xuất (dùng cho tem table)",
  "brandAbbr": "Tên viết tắt thương hiệu (VD: PMV, ABC)",
  "companyInfo": "Địa chỉ nhà máy / KCN / Hotline liên hệ",
  "badge1": "ISO 9001:2015",
  "badge2": "BẢO HÀNH CHÍNH HÃNG"
}`;

    const payload = {
      contents: [{
        parts: [{ text: systemPrompt }]
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.4
      }
    };

    let lastError = null;

    // Thử lần lượt các candidate models
    for (const model of CANDIDATE_MODELS) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.error?.message || `HTTP ${response.status}`;
          lastError = new Error(`[${model}] ${errMsg}`);
          console.warn(`Gemini model ${model} failed:`, errMsg);
          continue; // Thử model tiếp theo
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];
        if (!candidate || !candidate.content?.parts?.[0]?.text) {
          throw new Error('Gemini không phản hồi dữ liệu hợp lệ.');
        }

        let rawText = candidate.content.parts[0].text.trim();
        // Xoá markdown backticks nếu có
        rawText = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();

        const parsed = JSON.parse(rawText);
        parsed._modelUsed = model;
        return parsed;
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('Không thể kết nối đến Google Gemini API.');
  }

  /**
   * Áp dụng kết quả từ Gemini vào giao diện và render tem
   */
  function applyGeminiResult(result) {
    if (!result) return;

    if (result.layoutType === 'table') {
      // 1. Chuyển sang chế độ Tem Bảng Biểu PMV
      const btnTable = document.getElementById('btn-mode-table');
      if (btnTable) btnTable.click();

      if (result.companyName) {
        const el = document.getElementById('tbl-company-name');
        if (el) el.value = result.companyName;
      }
      if (result.brandAbbr) {
        const el = document.getElementById('tbl-brand-abbr');
        if (el) el.value = result.brandAbbr;
      }
      if (result.companyInfo) {
        const el = document.getElementById('tbl-company-info');
        if (el) el.value = result.companyInfo;
      }
      if (result.badge1) {
        const el = document.getElementById('tbl-badge-1');
        if (el) el.value = result.badge1;
      }
      if (result.badge2) {
        const el = document.getElementById('tbl-badge-2');
        if (el) el.value = result.badge2;
      }

      // Kích hoạt sinh khung bảng biểu
      if (window.LabelDesigner && window.LabelDesigner.generateGridTableLayout) {
        window.LabelDesigner.generateGridTableLayout();
      }
    } else {
      // 2. Chế độ Tem Sản Phẩm
      const btnProduct = document.getElementById('btn-mode-product');
      if (btnProduct) btnProduct.click();

      if (result.productName) {
        const el = document.getElementById('ai-product-name');
        if (el) el.value = result.productName;
      }
      if (result.brand) {
        const el = document.getElementById('ai-brand-name');
        if (el) el.value = result.brand;
      }
      if (result.spec) {
        const el = document.getElementById('ai-spec-text');
        if (el) el.value = result.spec;
      }
      if (result.barcode) {
        const el = document.getElementById('ai-barcode-val');
        if (el) el.value = result.barcode;
      }
      if (result.codeType) {
        const el = document.getElementById('ai-code-type');
        if (el) el.value = result.codeType;
      }
      if (result.dateText) {
        const el = document.getElementById('ai-date-text');
        if (el) el.value = result.dateText;
      }
      if (result.extraText) {
        const el = document.getElementById('ai-extra-text');
        if (el) el.value = result.extraText;
      }

      // Đổi màu nền nếu gợi ý màu hợp lý
      if (result.suggestedColor && /^#[0-9A-Fa-f]{6}$/.test(result.suggestedColor)) {
        if (window.setLabelColor) {
          window.setLabelColor(result.suggestedColor);
        } else {
          const pickerColor = document.getElementById('picker-label-color');
          if (pickerColor) {
            pickerColor.value = result.suggestedColor;
            pickerColor.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      }

      // Kích hoạt sinh bố cục thông minh
      if (window.LabelDesigner && window.LabelDesigner.generateSmartLayout) {
        window.LabelDesigner.generateSmartLayout();
      }
    }

    // Hiển thị thông báo thành công
    showToast(`✨ Google Gemini AI (${result._modelUsed || '3.5 Flash'}) đã tạo tem thành công!`, 'success');
  }

  /**
   * Hiển thị Toast thông báo nổi trên màn hình
   */
  function showToast(message, type = 'info') {
    let container = document.getElementById('toast-notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-notification-container';
      container.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const bgClass = type === 'error'
      ? 'bg-red-900/90 border-red-500 text-red-100'
      : type === 'success'
      ? 'bg-emerald-950/95 border-emerald-500 text-emerald-100'
      : 'bg-slate-900/95 border-indigo-500 text-indigo-100';

    toast.className = `flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur text-xs font-medium transition-all duration-300 transform translate-y-4 opacity-0 pointer-events-auto ${bgClass}`;
    toast.innerHTML = `
      <i class="fa-solid ${type === 'error' ? 'fa-triangle-exclamation text-red-400' : 'fa-sparkles text-amber-300 text-sm'}"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    // Kích hoạt animation xuất hiện
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-4', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');
    });

    // Tự biến mất sau 4 giây
    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 350);
    }, 4000);
  }

  /**
   * Khởi tạo các sự kiện giao diện cho Gemini
   */
  function init() {
    const btnCallGemini = document.getElementById('btn-call-gemini');
    const inputPrompt = document.getElementById('gemini-prompt-input');
    const btnCallText = document.getElementById('btn-call-gemini-text');
    const btnToggleKey = document.getElementById('btn-toggle-gemini-key');
    const keyBox = document.getElementById('gemini-key-box');
    const inputApiKey = document.getElementById('input-gemini-api-key');
    const btnSaveKey = document.getElementById('btn-save-gemini-key');

    // Điền key đã lưu hoặc default
    if (inputApiKey) {
      inputApiKey.value = getApiKey();
    }

    // Nút ẩn hiện ô nhập Key
    if (btnToggleKey && keyBox) {
      btnToggleKey.addEventListener('click', () => {
        keyBox.classList.toggle('hidden');
      });
    }

    // Nút Lưu Key
    if (btnSaveKey && inputApiKey) {
      btnSaveKey.addEventListener('click', () => {
        const k = inputApiKey.value.trim();
        if (k) {
          setApiKey(k);
          showToast('Đã lưu Gemini API Key thành công!', 'success');
          if (keyBox) keyBox.classList.add('hidden');
        } else {
          showToast('Vui lòng nhập API Key hợp lệ', 'error');
        }
      });
    }

    // Xử lý click các nút gợi ý nhanh (chips)
    document.querySelectorAll('.gemini-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const prompt = chip.dataset.prompt;
        if (prompt && inputPrompt) {
          inputPrompt.value = prompt;
          triggerGeminiCall();
        }
      });
    });

    // Xử lý bấm nút Gọi Gemini
    async function triggerGeminiCall() {
      const prompt = inputPrompt ? inputPrompt.value.trim() : '';
      const finalPrompt = prompt || 'Tem sản phẩm cao cấp, đầy đủ tên, xuất xứ, hạn sử dụng, barcode';

      if (btnCallGemini) {
        btnCallGemini.disabled = true;
        btnCallGemini.classList.add('opacity-80', 'cursor-not-allowed');
      }
      if (btnCallText) {
        btnCallText.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1 text-amber-300"></i> Gemini đang suy nghĩ & thiết kế...';
      }

      try {
        const result = await generateLabelContent(finalPrompt);
        applyGeminiResult(result);
      } catch (err) {
        console.error('Lỗi gọi Gemini:', err);
        showToast(`Lỗi Gemini: ${err.message}`, 'error');
      } finally {
        if (btnCallGemini) {
          btnCallGemini.disabled = false;
          btnCallGemini.classList.remove('opacity-80', 'cursor-not-allowed');
        }
        if (btnCallText) {
          btnCallText.innerHTML = '✨ Gemini AI: Tự Động Soạn Nội Dung & Tạo Tem';
        }
      }
    }

    if (btnCallGemini) {
      btnCallGemini.addEventListener('click', triggerGeminiCall);
    }
  }

  return {
    init,
    generateLabelContent,
    applyGeminiResult,
    getApiKey,
    setApiKey,
    showToast
  };
})();

// Tự động khởi tạo sau khi tải trang
document.addEventListener('DOMContentLoaded', () => {
  window.GeminiService.init();
});
