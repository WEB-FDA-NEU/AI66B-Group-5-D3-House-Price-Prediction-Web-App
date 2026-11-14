// ============================================================
//  Helper hiển thị dùng chung. Quy tắc dựng DOM cho mọi trang:
//
//  QUY TẮC VÀNG: markup nằm trong HTML, không nằm trong chuỗi JS.
//    Sai:  el.innerHTML = `<div class="card">${item.title}</div>`
//    Đúng: clone <template> rồi gán bằng .textContent
//
//  Vì sao: (1) không thủng XSS, (2) HTML viết ở Mốc 2 sống nguyên sang Mốc 4,
//  (3) sửa giao diện thì sửa HTML/CSS, không phải đi sửa chuỗi trong JS.
//
//  QUY TẮC ĐẶT FILE: một hàm render chỉ chuyển vào đây khi ≥ 2 màn hình dùng chung.
//  Chỉ 1 màn dùng thì để trong js/pages/<màn-đó>.js
// ============================================================

export const formatVND = n =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
