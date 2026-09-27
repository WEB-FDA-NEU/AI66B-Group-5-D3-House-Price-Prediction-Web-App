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
      <p class="site-footer__tagline">Ước tính giá nhà tham khảo bằng máy học — không thay thế thẩm định chuyên nghiệp.</p>
    </div>

    <nav class="site-footer__col" aria-labelledby="ft-product">
      <h3 class="site-footer__title" id="ft-product">Sản phẩm</h3>
      <ul>
        <li><a href="index.html">Trang chủ</a></li>
        <li><a href="about-model.html">Giới thiệu mô hình</a></li>
      </ul>
    </nav>

    <nav class="site-footer__col" aria-labelledby="ft-help">
      <h3 class="site-footer__title" id="ft-help">Hỗ trợ</h3>
      <ul>
        <li><a href="#">Câu hỏi thường gặp</a></li>
        <li><a href="#">Liên hệ</a></li>
      </ul>
    </nav>

    <nav class="site-footer__col" aria-labelledby="ft-legal">
      <h3 class="site-footer__title" id="ft-legal">Pháp lý</h3>
      <ul>
        <li><a href="#">Điều khoản sử dụng</a></li>
        <li><a href="#">Quyền riêng tư</a></li>
      </ul>
    </nav>

  </div>

  <div class="container site-footer__bottom">
    <p class="site-footer__disclaimer">HomeVal cung cấp ước tính tham khảo, không phải định giá chuyên nghiệp hay tư vấn tài chính.</p>
    <p>© ${YEAR} HomeVal — Đồ án môn Web Design &amp; Programming, lớp AI66B.</p>
  </div>
</footer>`;

class SiteFooter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = TEMPLATE;      // hằng số do ta viết → an toàn
  }
}

customElements.define('site-footer', SiteFooter);
