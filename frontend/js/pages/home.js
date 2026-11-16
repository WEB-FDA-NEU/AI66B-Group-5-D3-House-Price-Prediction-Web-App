import '../components/site-header.js';
import '../components/site-footer.js';
import { getHomeModelStats } from '../api.js';
import { money } from '../model-catalog.js';
import { isLand } from '../property.js';

const quickForm = document.querySelector('.quick-form');
function syncAreaLimit() {
  quickForm.elements.area_m2.max = isLand(quickForm.elements.property_type.value) ? '10000' : '1000';
}
quickForm.elements.property_type.addEventListener('change', syncAreaLimit);
syncAreaLimit();

const slides = [
  {title:'Nhìn sâu dữ liệu.',emphasis:'Hiểu đúng giá trị.',description:'Khám phá giá trị ngôi nhà qua dữ liệu, đối chiếu các mô hình và hiểu khoảng giá trước khi đưa ra quyết định.',cta:'Bắt đầu định giá',href:'predict.html'},
  {title:'Thêm góc nhìn.',emphasis:'Rõ hơn trước khi đầu tư.',description:'Đặt các mô hình cạnh nhau trên cùng một tài sản. Đọc mức chênh lệch và sai số trước khi đi sâu vào một cơ hội.',cta:'Khám phá Premium',href:'premium.html'},
  {title:'Hiểu điều đứng sau.',emphasis:'Tự tin đọc khoảng giá.',description:'Mỗi ước tính đều có giới hạn. Tìm hiểu dữ liệu, điểm mạnh và điểm yếu của từng mô hình bằng ngôn ngữ dễ hiểu.',cta:'Tìm hiểu mô hình',href:'about-model.html'}
];
let currentSlide=0;
const heroCopy=document.querySelector('.hero-copy');
const heroImage=document.querySelector('.lux-hero') ?? document.querySelector('.hero-visual');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function showSlide(index) {
  currentSlide=(index+slides.length)%slides.length;const slide=slides[currentSlide];
  const heading=heroCopy.querySelector('h1');const emphasis=document.createElement('em');emphasis.textContent=slide.emphasis;
  heading.replaceChildren(document.createTextNode(slide.title),document.createElement('br'),emphasis);
  heroCopy.querySelector('.hero-description').textContent=slide.description;
  const cta=heroCopy.querySelector('.hero-actions .btn');cta.href=slide.href;cta.textContent=slide.cta+' ↗';
  document.querySelectorAll('[data-hero-slide]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.heroSlide)===currentSlide)));
  document.querySelector('.hero-carousel-count').textContent=`0${currentSlide+1} / 03`;
  if (!reduced.matches) {
    heroCopy.getAnimations().forEach(animation=>animation.cancel());
    heroCopy.animate([{opacity:.35,transform:'translateX(14px)'},{opacity:1,transform:'translateX(0)'}],{duration:350,easing:'cubic-bezier(.22,.7,.2,1)'});
  }
}
document.querySelectorAll('[data-hero-slide]').forEach(button=>button.addEventListener('click',()=>showSlide(Number(button.dataset.heroSlide))));
document.getElementById('hero-next').addEventListener('click',()=>showSlide(currentSlide+1));
document.getElementById('hero-previous').addEventListener('click',()=>showSlide(currentSlide-1));
document.querySelector('.hero-carousel-controls').addEventListener('keydown',event=>{if(event.target.closest('.hero-carousel-tabs,.hero-carousel-arrows')&&['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();showSlide(currentSlide+(event.key==='ArrowRight'?1:-1));document.querySelector(`[data-hero-slide="${currentSlide}"]`).focus();}});
let touchStart=null;
heroImage.addEventListener('touchstart',event=>{const touch=event.touches[0];touchStart={x:touch.clientX,y:touch.clientY};},{passive:true});
heroImage.addEventListener('touchend',event=>{if(!touchStart)return;const touch=event.changedTouches[0];const dx=touch.clientX-touchStart.x,dy=touch.clientY-touchStart.y;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.5)showSlide(currentSlide+(dx<0?1:-1));touchStart=null;},{passive:true});

const modelStatsBody = document.getElementById('model-accuracy-body');
function metric(label, value) {
  const item = document.createElement('div');
  item.className = 'stat';
  const valueNode = document.createElement('strong');
  valueNode.className = 'stat__value';
  valueNode.textContent = value;
  const labelNode = document.createElement('span');
  labelNode.className = 'stat__label';
  labelNode.textContent = label;
  item.append(valueNode, labelNode);
  return item;
}

function renderModelStats(info) {
  const metrics = info.metrics || {};
  const r2 = Number(metrics.r2);
  const mae = Number(metrics.mae_vnd);
  const within = Number(metrics.within_20_percent);
  const mape = Number(metrics.mape_percent);
  const withinLabel = Number.isFinite(within) ? 'Mẫu có sai số không quá 20%' : 'Sai số phần trăm trung bình';
  const withinValue = Number.isFinite(within)
    ? `${within.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`
    : Number.isFinite(mape) ? `±${mape.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%` : '—';
  modelStatsBody.replaceChildren(
    metric('Phiên bản mô hình', info.model_version || '—'),
    metric('R² trên tập kiểm tra', Number.isFinite(r2) ? r2.toLocaleString('vi-VN', { maximumFractionDigits: 2 }) : '—'),
    metric('Sai số tuyệt đối trung bình', Number.isFinite(mae) ? money(mae) : '—'),
    metric(withinLabel, withinValue),
  );
  const meta = document.createElement('p');
  meta.className = 'model-accuracy__meta';
  meta.textContent = `${info.algorithm || 'Mô hình HomeVal'} · Số liệu được cập nhật theo phiên bản đang phát hành.`;
  modelStatsBody.before(meta);
}

function renderModelStatsMessage(message, actionText) {
  const text = document.createElement('p');
  text.textContent = message;
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'btn';
  retry.textContent = actionText;
  retry.addEventListener('click', () => { loadModelStats(); });
  modelStatsBody.replaceChildren(text, retry);
}

async function loadModelStats() {
  modelStatsBody.setAttribute('aria-busy', 'true');
  modelStatsBody.replaceChildren(document.createElement('p'));
  modelStatsBody.firstElementChild.textContent = 'Đang tải số liệu mô hình…';
  const previousMeta = modelStatsBody.parentElement.querySelector('.model-accuracy__meta');
  if (previousMeta) previousMeta.remove();
  try {
    const info = await getHomeModelStats();
    renderModelStats(info);
  } catch (error) {
    const message = error?.status === 404
      ? 'Chưa có mô hình đang phát hành để hiển thị số liệu.'
      : error?.detail || 'Không tải được số liệu mô hình.';
    renderModelStatsMessage(message, error?.status === 404 ? 'Tải lại' : 'Thử lại');
  } finally {
    modelStatsBody.removeAttribute('aria-busy');
  }
}

loadModelStats();
