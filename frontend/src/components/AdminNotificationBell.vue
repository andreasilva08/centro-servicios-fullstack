<template>
  <div class="notification-wrap" ref="root">
    <button class="bell" :aria-expanded="open" aria-label="Notificaciones de pagos pendientes" @click="toggle">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12h4"/></svg>
      <span v-if="unreadCount" class="count">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
    </button>
    <Transition name="dropdown"><section v-if="open" class="menu" aria-label="Notificaciones administrativas">
      <header><div><strong>Actividad financiera</strong><small>{{ unreadCount }} alertas pendientes</small></div><button class="view-all" @click="goToPayments">Ver pagos</button></header>
      <p v-if="!notifications.length" class="empty">No hay notificaciones nuevas.</p>
      <button v-for="item in latest" :key="item._id" class="notice" @click="openNotification(item)">
        <span class="dot" :class="{ read: item.leida }"></span><span class="notice-copy"><strong>{{ item.titulo }}</strong><small>{{ item.mensaje }} · {{ relativeDate(item.createdAt) }}</small></span><span class="arrow">›</span>
      </button>
      <footer v-if="notifications.length" @click="goToPayments">Abrir gestion de pagos <span>→</span></footer>
    </section></Transition>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
const router = useRouter()
const root = ref(null), open = ref(false), notifications = ref([]), unreadCount = ref(0)
const latest = computed(() => notifications.value.slice(0, 8))
let timer
async function refresh() {
  try {
    const { data } = await api.get('/notificaciones')
    notifications.value = Array.isArray(data) ? data : (data.notificaciones || [])
    unreadCount.value = Array.isArray(data) ? notifications.value.filter(item => !item.leida).length : Number(data.noLeidas || 0)
  } catch { /* conserva las notificaciones visibles */ }
}
function toggle() { open.value = !open.value; if (open.value) refresh() }
function relatedId(value) { return value && typeof value === 'object' ? value._id || value.id || '' : value || '' }
async function openNotification(item) {
  try {
    await api.put(`/notificaciones/${item._id}/leer`)
    notifications.value = notifications.value.map(row => row._id === item._id ? { ...row, leida: true } : row)
    unreadCount.value = Math.max(0, unreadCount.value - (item.leida ? 0 : 1))
  } catch { /* el siguiente sondeo sincroniza el estado del servidor */ }
  open.value = false
  const paymentId = relatedId(item.pagoId)
  const reservationId = relatedId(item.reservaId)
  if (reservationId && ['reserva_pendiente', 'reserva_cancelada'].includes(item.tipo)) {
    router.push({ name: 'reservas', query: { reservaId: String(reservationId) } })
  } else if (paymentId) {
    router.push({ name: 'pagos', query: { pagoId: String(paymentId) } })
  } else if (reservationId) {
    router.push({ name: 'reservas', query: { reservaId: String(reservationId) } })
  } else {
    goToPayments()
  }
}
function goToPayments() { open.value = false; router.push({ name: 'pagos' }) }
function relativeDate(value) { if (!value) return 'Ahora'; return new Date(value).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) }
function onOutside(event) { if (!root.value?.contains(event.target)) open.value = false }
onMounted(() => { refresh(); timer = setInterval(refresh, 5000); document.addEventListener('click', onOutside) })
onUnmounted(() => { clearInterval(timer); document.removeEventListener('click', onOutside) })
</script>

<style scoped>
.notification-wrap{position:relative}.bell{position:relative;width:38px;height:38px;display:grid;place-items:center;border:1px solid #334155;border-radius:11px;background:#111827;color:#cbd5e1;cursor:pointer;transition:border-color .18s,background .18s}.bell:hover,.bell[aria-expanded=true]{border-color:#818cf8;background:#312e8140;color:#e0e7ff}.bell svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.65;stroke-linecap:round;stroke-linejoin:round}.count{position:absolute;top:-6px;right:-7px;min-width:18px;height:18px;display:grid;place-items:center;padding:0 4px;border:2px solid #0b1120;border-radius:999px;background:#ef4444;color:#fff;font-size:9px;font-weight:850}.menu{position:absolute;top:calc(100% + 11px);right:0;width:min(380px,calc(100vw - 28px));max-height:70vh;overflow:auto;border:1px solid #475569;border-radius:15px;background:#111827;box-shadow:0 22px 60px #020617c9}.menu>header{position:sticky;top:0;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:15px;border-bottom:1px solid #334155;background:#111827}.menu>header div{display:grid;gap:4px}.menu>header strong{color:#f8fafc;font-size:13px}.menu>header small{color:#94a3b8;font-size:10px}.view-all{border:0;background:none;color:#a5b4fc;font-size:11px;font-weight:700;cursor:pointer}.notice{width:100%;display:flex;align-items:center;gap:10px;padding:12px 14px;border:0;border-bottom:1px solid #253145;background:transparent;text-align:left;cursor:pointer}.notice:hover{background:#1e293b}.dot{width:8px;height:8px;flex:0 0 auto;border-radius:50%;background:#fbbf24;box-shadow:0 0 10px #fbbf2460}.dot.read{background:#64748b;box-shadow:none}.notice-copy{min-width:0;display:grid;gap:4px;flex:1}.notice-copy strong{color:#e2e8f0;font-size:11px}.notice-copy small{display:-webkit-box;overflow:hidden;color:#94a3b8;font-size:10px;line-height:1.4;-webkit-line-clamp:2;-webkit-box-orient:vertical}.arrow{color:#64748b;font-size:18px}.empty{margin:0;padding:20px 15px;color:#94a3b8;font-size:12px}.menu>footer{padding:12px 15px;color:#c7d2fe;font-size:11px;font-weight:700;cursor:pointer}.menu>footer span{float:right}.dropdown-enter-active,.dropdown-leave-active{transition:opacity .15s,transform .15s}.dropdown-enter-from,.dropdown-leave-to{opacity:0;transform:translateY(-5px)}
</style>
