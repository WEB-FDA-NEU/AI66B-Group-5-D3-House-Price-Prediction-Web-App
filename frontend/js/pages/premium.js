import { getEntitlements, startCheckout, completeCheckout } from '../api.js';
import { isLoggedIn, requireLogin, clearSession } from '../auth.js';
import { loadCatalog } from '../model-catalog.js';
import { toast } from '../ui.js';
const button = document.getElementById('checkout-button');
const status = document.getElementById('membership-status');
const retry = document.getElementById('membership-retry');
const dialog = document.getElementById('checkout-dialog');
const checkoutStatus = document.getElementById('checkout-status');
let checkout;
loadCatalog(document.getElementById('model-catalog')).catch(() => {});
async function refreshMembership() {
  retry.hidden = true;
  delete button.dataset.active;
  button.textContent = 'Thử thanh toán & mở Premium ↗';
  button.disabled = false;
  if (!isLoggedIn()) { status.textContent = 'Bạn đang dùng Free. Đăng nhập để thử thanh toán và lưu quyền Premium.'; return; }
  button.disabled = true;
  status.textContent = 'Đang kiểm tra gói của bạn…';
  try {
    const access = await getEntitlements();
    button.disabled = false;
    if (access.plan === 'premium') {
      status.textContent = access.role === 'admin' ? 'Tài khoản admin có quyền sử dụng tất cả mô hình.' : 'Premium đã mở · Hết hạn: ' + new Date(access.expires_at).toLocaleString('vi-VN');
      button.textContent = 'Premium đã mở · Đi đến định giá ↗'; button.dataset.active = 'true';
    } else { status.textContent = 'Gói hiện tại: Free. Bạn có thể thử giao dịch bên dưới.'; delete button.dataset.active; }
    if (!access.sandbox && access.plan !== 'premium') { button.disabled = true; status.textContent += ' Thanh toán thử nghiệm đang tắt.'; }
  } catch (error) {
    if (error.status === 401) {
      clearSession();
      status.textContent = 'Phiên đăng nhập đã hết hạn. Đăng nhập lại để kiểm tra gói của bạn.';
      button.textContent = 'Đăng nhập để tiếp tục ↗';
      button.disabled = false;
    } else {
      status.textContent = error.status === 0
        ? 'Chưa kết nối được máy chủ HomeVal để kiểm tra gói. Bạn có thể thử kết nối lại.'
        : error.detail || 'Không kiểm tra được gói. Vui lòng thử lại.';
      button.disabled = true;
      retry.hidden = false;
    }
  }
}
refreshMembership();
retry.addEventListener('click', refreshMembership);
button.addEventListener('click', async () => {
  if (!isLoggedIn()) { requireLogin(); return; }
  if (button.dataset.active) { location.href = 'predict.html'; return; }
  button.disabled = true;
  try {
    checkout = await startCheckout();
    document.getElementById('checkout-amount').textContent = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: checkout.currency }).format(checkout.amount);
    document.getElementById('checkout-id').textContent = 'Mã giao dịch: ' + checkout.id;
    checkoutStatus.textContent = 'Không nhập thông tin thanh toán thật.';
    dialog.showModal();
  } catch (error) { toast(error.detail || 'Không tạo được giao dịch.', 'error'); }
  finally { button.disabled = false; }
});
async function finish(outcome) {
  if (!checkout || dialog.dataset.busy) return;
  dialog.dataset.busy = 'true'; dialog.querySelectorAll('button').forEach(b => b.disabled = true);
  checkoutStatus.textContent = 'Đang xử lý giao dịch thử…';
  try {
    const response = await completeCheckout(checkout.id, outcome);
    dialog.close(); checkout = null;
    await refreshMembership();
    const messages = { success: 'Thanh toán thử thành công. Premium đã được mở trên tài khoản.', failed: 'Giao dịch thử thất bại. Gói tài khoản không thay đổi.', cancelled: 'Đã hủy giao dịch thử. Gói tài khoản không thay đổi.' };
    toast(messages[response.status]);
  } catch (error) { checkoutStatus.textContent = error.detail || 'Không xử lý được giao dịch. Có thể thử lại.'; }
  finally { delete dialog.dataset.busy; dialog.querySelectorAll('button').forEach(b => b.disabled = false); }
}
dialog.querySelectorAll('[data-outcome]').forEach(b => b.addEventListener('click', () => finish(b.dataset.outcome)));
dialog.addEventListener('cancel', event => { event.preventDefault(); finish('cancelled'); });
