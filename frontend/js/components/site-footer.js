// ============================================================
//  <site-footer>  —  cùng cơ chế với <site-header>.
//  Đây là bằng chứng pattern nhân rộng được: cần thêm khối dùng chung nào
//  (footer, breadcrumb, banner khuyến mãi…) thì tạo thêm một file như file này.
//
//  TODO: sửa nội dung footer ở đây — sửa một lần, mọi trang đổi theo.
// ============================================================

const YEAR = new Date().getFullYear();

const TEMPLATE = /* html */ `
<footer class="site-footer">
  <div class="container site-footer__grid">

    <div class="site-footer__brand">
      <p class="logo">HomeVal</p>
      <p class="site-footer__tagline">Định giá nhà minh bạch: giá + khoảng tin cậy + phiên bản model.</p>
      <p class="site-footer__tagline"><small>Giá chỉ mang tính tham khảo, không phải thẩm định chuyên nghiệp (BR-9).</small></p>
    </div>

    <nav class="site-footer__col" aria-labelledby="ft-product">
      <h3 class="site-footer__title" id="ft-product">Sản phẩm</h3>
      <ul>
        <li><a href="index.html">Trang chủ</a></li>
        <li><a href="about-model.html">Giới thiệu mô hình</a></li>
        <li><a href="login.html">Đăng nhập</a></li>
        <li><a href="register.html">Đăng ký</a></li>
      </ul>
    </nav>

    <nav class="site-footer__col" aria-labelledby="ft-admin">
      <h3 class="site-footer__title" id="ft-admin">Quản trị</h3>
      <ul>
        <li><a href="admin.html">Dashboard</a></li>
        <li><a href="admin-models.html">Model Management</a></li>
        <li><a href="admin-models-new.html">Upload Model</a></li>
      </ul>
    </nav>

    <nav class="site-footer__col" aria-labelledby="ft-help">
      <h3 class="site-footer__title" id="ft-help">Hỗ trợ</h3>
      <ul>
        <li><a href="#">Câu hỏi thường gặp</a></li>
        <li><a href="#">Liên hệ</a></li>
        <li><a href="404.html">404 mẫu</a></li>
        <li><a href="500.html">500 mẫu</a></li>
      </ul>
    </nav>

  </div>

  <div class="container site-footer__bottom">
    <p class="site-footer__disclaimer">HomeVal cung cấp ước tính tham khảo, không phải định giá chuyên nghiệp hay tư vấn tài chính.</p>
    <p>© ${YEAR} HomeVal — Đồ án Web Design &amp; Programming, lớp AI66B, Nhóm 5.</p>
  </div>
</footer>`;

class SiteFooter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = TEMPLATE;      // hằng số do ta viết → an toàn
  }
}

customElements.define('site-footer', SiteFooter);
