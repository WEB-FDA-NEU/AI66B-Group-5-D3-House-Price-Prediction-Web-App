import { brand } from './site-header.js';
class SiteFooter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `<footer class="site-footer"><div class="container site-footer__grid">
      <div class="site-footer__brand"><a class="logo" href="index.html">${brand}</a><p class="site-footer__tagline">Hiểu giá trị ngôi nhà.<br>Tự tin cho hành trình tiếp theo.</p><span class="footer-location">TP. Hồ Chí Minh, Việt Nam</span></div>
      <nav class="site-footer__col" aria-label="Khám phá"><h3 class="site-footer__title">Khám phá</h3><ul><li><a href="predict.html">Định giá nhà & đất</a></li><li><a href="explore.html">Bản đồ demo</a></li><li><a href="premium.html">HomeVal Premium</a></li><li><a href="about-model.html">Mô hình & dữ liệu</a></li><li><a href="data-sources.html">Nguồn dữ liệu</a></li><li><a href="how-it-works.html">Cách hoạt động</a></li></ul></nav>
      <nav class="site-footer__col" aria-label="Tài khoản"><h3 class="site-footer__title">Không gian của bạn</h3><ul><li><a href="predictions.html">Dự đoán đã lưu</a></li><li><a href="profile.html">Hồ sơ cá nhân</a></li><li><a href="register.html">Tạo tài khoản</a></li></ul></nav>
      <div class="site-footer__col"><h3 class="site-footer__title">Minh bạch từ dữ liệu</h3><p class="site-footer__tagline">Mô hình dùng giá rao 2024. Bản đồ là minh họa; thanh toán là thử nghiệm. Đọc sai số và giới hạn trước khi sử dụng.</p><a class="text-link" href="about-model.html">Tìm hiểu mô hình ↗</a></div>
    </div><div class="container site-footer__bottom"><p>© ${new Date().getFullYear()} HomeVal. Đồ án Nhóm 5.</p><p>Được xây dựng với dữ liệu & sự thấu hiểu.</p></div></footer>`;
  }
}
customElements.define('site-footer', SiteFooter);
