import { startCheckout, completeCheckout, getEntitlements } from '../api.js';
import { isLoggedIn, requireLogin } from '../auth.js';

/** In-context upgrade; the prediction form remains mounted throughout checkout. */
export function createPremiumUpgrade({ beforeLogin, onUnlocked }) {
  const dialog = document.createElement('dialog');
  dialog.className = 'upgrade-drawer';
  dialog.setAttribute('aria-labelledby', 'upgrade-title');
  dialog.innerHTML = `
    <div class="drawer-top"><span class="eyebrow">HOMEVAL / PREMIUM</span><button class="icon-button" type="button" data-close aria-label="Đóng bảng Premium">×</button></div>
    <div class="drawer-intro"><span class="upgrade-symbol" aria-hidden="true">✧</span><h2 id="upgrade-title">Thêm góc nhìn.<br><em>Ngay trên tài sản của bạn.</em></h2><p>Giữ nguyên thông tin đang nhập. Mở thêm mô hình để đối chiếu trước khi quyết định.</p></div>
    <div class="upgrade-benefits"><div><span>01</span><p><strong>Thêm hai mô hình</strong><small>Random Forest và Gradient Boosting đã được kiểm định.</small></p></div><div><span>02</span><p><strong>Đặt các ước tính cạnh nhau</strong><small>Cùng một tài sản, đọc cả khoảng giá và mức chênh lệch.</small></p></div><div><span>03</span><p><strong>Tiếp tục từ nơi đang làm</strong><small>Thông tin biểu mẫu được giữ lại sau khi nâng cấp.</small></p></div></div>
    <div class="drawer-plan"><div><strong>Premium · 30 ngày</strong><small>Giá trải nghiệm</small></div><p>199.000₫</p></div>
    <p class="sandbox-note">THANH TOÁN THỬ · Không thu tiền, không nhập thông tin thẻ.</p>
    <p class="drawer-status" role="status" aria-live="polite"></p>
    <div data-stage="plan"><button type="button" class="btn btn--primary drawer-primary" data-start>Thử mở Premium ↗</button><button type="button" class="drawer-secondary" data-close>Tiếp tục dùng Free</button></div>
    <div data-stage="payment" hidden><p class="checkout-id"></p><div class="checkout-total"><span>Tổng tiền giả lập</span><strong data-total></strong></div><button type="button" class="btn btn--primary drawer-primary" data-outcome="success">Giả lập thanh toán thành công</button><div class="drawer-test-options"><button class="drawer-secondary" type="button" data-outcome="failed">Thử thất bại</button><button class="drawer-secondary" type="button" data-outcome="cancelled">Hủy giao dịch</button></div></div>
    <div data-stage="success" hidden><button type="button" class="btn btn--primary drawer-primary" data-close>Chọn mô hình & tiếp tục ↗</button></div>
    <a class="drawer-learn" href="about-model.html#comparison" target="_blank" rel="noopener">Đọc sai số và giới hạn mô hình ↗</a>`;
  document.body.append(dialog);
  let transaction = null;
  let busy = false;
  let opener = null;
  const status = dialog.querySelector('.drawer-status');
  const start = dialog.querySelector('[data-start]');
  function stage(name) { dialog.querySelectorAll('[data-stage]').forEach(node => { node.hidden = node.dataset.stage !== name; }); }
  function setBusy(value) { busy = value; dialog.setAttribute('aria-busy', String(value)); dialog.querySelectorAll('button').forEach(button => { button.disabled = value; }); }
  async function finish(outcome, close = false) {
    if (busy || !transaction) return;
    setBusy(true); status.textContent = 'Đang xử lý giao dịch thử…';
    try {
      const result = await completeCheckout(transaction.id, outcome);
      transaction = null;
      if (result.status === 'success') {
        stage('success'); status.textContent = 'Premium đã mở. Các mô hình nâng cao đã sẵn sàng trong biểu mẫu của bạn.';
        try { await onUnlocked(result.entitlement); } catch { status.textContent = 'Premium đã mở. Đóng bảng này và chọn Thử kết nối lại để cập nhật mô hình.'; }
      } else {
        stage('plan'); status.textContent = result.status === 'failed' ? 'Giao dịch thử thất bại. Bạn vẫn dùng Free và có thể thử lại.' : 'Đã hủy giao dịch. Thông tin tài sản được giữ nguyên.';
      }
      if (close) dialog.close();
    } catch (error) { status.textContent = error.detail || 'Chưa xử lý được. Vui lòng thử lại.'; }
    finally { setBusy(false); }
  }
  async function close() {
    if (busy) return;
    if (transaction) await finish('cancelled', true);
    else dialog.close();
  }
  dialog.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', close));
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('close', () => {
    const target = opener?.isConnected && opener.matches('button,a,input,select') ? opener : document.getElementById('model_id');
    target?.focus({preventScroll:true});
  });
  dialog.addEventListener('click', event => { if (event.target === dialog && event.clientX < dialog.getBoundingClientRect().left) close(); });
  dialog.querySelectorAll('[data-outcome]').forEach(button => button.addEventListener('click', () => finish(button.dataset.outcome)));
  start.addEventListener('click', async () => {
    if (!isLoggedIn()) { beforeLogin(); sessionStorage.setItem('homeval_upgrade_intent', '1'); requireLogin(); return; }
    setBusy(true); status.textContent = 'Đang chuẩn bị giao dịch thử…';
    try {
      const access = await getEntitlements();
      if (access.plan === 'premium') { stage('success'); status.textContent = 'Tài khoản của bạn đã có Premium.'; await onUnlocked(access); return; }
      transaction = await startCheckout(); stage('payment');
      dialog.querySelector('[data-total]').textContent = new Intl.NumberFormat('vi-VN', {style:'currency', currency:transaction.currency}).format(transaction.amount);
      dialog.querySelector('.checkout-id').textContent = 'Mã: ' + transaction.id;
      status.textContent = 'Chọn một kết quả để kiểm tra thanh toán. Không có tiền thật.';
    } catch (error) {
      if (error.status === 401) { beforeLogin(); sessionStorage.setItem('homeval_upgrade_intent', '1'); requireLogin(); }
      else status.textContent = error.detail || 'Chưa kết nối được thanh toán. Bạn có thể đóng bảng và tiếp tục nhập thông tin.';
    } finally { setBusy(false); }
  });
  return {
    open() {
      if (dialog.open) return;
      opener = document.activeElement;
      stage('plan'); status.textContent = ''; start.textContent = isLoggedIn() ? 'Thử mở Premium ↗' : 'Đăng nhập để mở Premium ↗';
      dialog.showModal();
    }
  };
}
