// ============================================================
//  <site-header>  —  Custom Element (Web Components, chuẩn của trình duyệt)
//
//  Viết header MỘT LẦN ở đây. Mỗi trang chỉ cần một dòng:
//      <site-header></site-header>
//
//  Không build step, không thư viện. `customElements` là API có sẵn
//  của trình duyệt từ 2018, giống hệt <template> mà ta đang dùng.
//
//  TODO: sửa nội dung header ở đây — sửa một lần, mọi trang đổi theo.
// ============================================================
import { initHeader } from '../auth.js';

const TEMPLATE = /* html */ `
<header class="site-header">
  <div class="container site-header__inner">
    <a class="logo" href="index.html">HomeVal</a>

    <nav>
      <a class="site-header__link" href="index.html" data-nav="home">Trang chủ</a>
      <a class="site-header__link" href="about-model.html" data-nav="about-model">Giới thiệu mô hình</a>
      <a class="site-header__link" href="admin.html" data-nav="admin" data-auth="admin" hidden>Admin</a>
      <a class="site-header__link" href="admin-models.html" data-nav="models" data-auth="admin" hidden>Models</a>
      <span data-auth="guest" hidden>
        <a class="btn" href="login.html">Đăng nhập</a>
        <a class="btn btn--primary" href="register.html">Đăng ký</a>
      </span>
      <span data-auth="user" hidden>
        <span data-user-name></span>
        <a class="btn" href="#" data-action="logout">Thoát</a>
      </span>
    </nav>
  </div>
</header>`;

class SiteHeader extends HTMLElement {
  connectedCallback() {
    // innerHTML ở đây AN TOÀN vì chuỗi là hằng số do ta viết, không phải
    // dữ liệu người dùng nhập. Quy tắc thật là: KHÔNG đưa dữ liệu người dùng
    // qua innerHTML. Xem docs/CACH-DUNG-FILE-CHUNG.md mục 9.
    this.innerHTML = TEMPLATE;
    initHeader();          // bật/tắt phần Đăng nhập ↔ Tài khoản

    // Truyền dữ liệu VÀO component bằng thuộc tính HTML:
    //     <site-header active="home"></site-header>
    // → mục "Trang chủ" được tô đậm. Đây là cách làm component "khác nhau
    //   một chút" ở từng trang mà vẫn chỉ có một file nguồn.
    const active = this.getAttribute('active');
    if (active) this.querySelector(`[data-nav="${active}"]`)?.classList.add('is-active');
  }
}

customElements.define('site-header', SiteHeader);
