import '../experience.js';
import { initHeader } from '../auth.js';
export const brand = '<span class="logo-mark" aria-hidden="true"><svg viewBox="0 0 28 28" fill="none"><path d="m5 13 9-8 9 8v11h-7v-7h-4v7H5V13Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M18 5v4" stroke="currentColor" stroke-width="1.8"/></svg></span>Home<span class="logo-accent">Val</span>';
class SiteHeader extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `<a class="skip-link" href="#main-content">Đến nội dung chính</a>
    <header class="site-header"><div class="container site-header__inner">
      <a class="logo" href="index.html" aria-label="HomeVal — Trang chủ">${brand}</a>
      <button class="menu-toggle" type="button" aria-label="Mở menu" aria-expanded="false" aria-controls="main-nav"><span></span><span></span><span></span></button>
      <nav id="main-nav" aria-label="Điều hướng chính">
        <a class="site-header__link" href="index.html" data-nav="home">Trang chủ</a>
        <a class="site-header__link" href="predict.html" data-nav="predict">Định giá</a>
        <a class="site-header__link" href="explore.html" data-nav="explore">Bản đồ <small class="nav-beta">BETA</small></a>
        <a class="site-header__link" href="premium.html" data-nav="premium">Premium <span class="nav-star">✧</span></a>
        <a class="site-header__link" href="about-model.html" data-nav="about-model">Về mô hình</a>
        <a class="site-header__link" href="admin.html" data-nav="admin" data-auth="admin" hidden>Quản trị</a>
        <a class="site-header__link" href="admin-models.html" data-nav="models" data-auth="admin" hidden>Mô hình</a>
        <span class="header-account" data-auth="guest" hidden><a class="site-header__link" href="login.html">Đăng nhập</a><a class="btn btn--primary" href="register.html">Bắt đầu miễn phí <span aria-hidden="true">↗</span></a></span>
        <span class="header-account" data-auth="user" hidden><a class="site-header__link" href="predictions.html" data-nav="predictions">Đã lưu</a><a class="site-header__link account-name" href="profile.html" data-nav="profile" data-user-name></a><a class="btn" href="#" data-action="logout">Thoát</a></span>
      </nav>
    </div></header>`;
    initHeader();
    for (const link of this.querySelectorAll('[data-nav]')) {
      if (link.dataset.nav === this.getAttribute('active')) {
        link.classList.add('is-active'); link.setAttribute('aria-current', 'page');
      }
    }
    const main = document.querySelector('main');
    if (main && !main.id) main.id = 'main-content';
    const toggle = this.querySelector('.menu-toggle');
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      this.querySelector('nav').classList.toggle('is-open', open);
    });
    this.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        toggle.setAttribute('aria-expanded', 'false');
        this.querySelector('nav').classList.remove('is-open'); toggle.focus();
      }
    });
  }
}
customElements.define('site-header', SiteHeader);
