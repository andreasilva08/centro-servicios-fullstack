<template>
  <div class="wrap" ref="root">
    <button class="bell" :aria-expanded="open" aria-label="Notificaciones de tu cuenta" @click="toggle"><svg viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12h4"/></svg><span v-if="unread.length" class="count">{{ unread.length }}</span></button>
    <Transition name="drop"><section v-if="open" class="menu"><header><strong>Mis notificaciones</strong><small>{{ unread.length }} sin leer</small></header><p v-if="!items.length" class="empty">No tienes notificaciones nuevas.</p><button v-for="item in items.slice(0, 8)" :key="item._id" class="item" @click="openNotification(item)"><span class="dot" :class="{ read: item.leida }"></span><span><strong>{{ item.titulo }}</strong><small>{{ item.mensaje }}<br>{{ when(item.createdAt) }}</small></span></button></section></Transition>
  </div>
</template>
<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
const router = useRouter()
const root = ref(null), open = ref(false), items = ref([])
const unread = computed(() => items.value.filter(item => !item.leida))
async function refresh() { try { const { data } = await api.get('/notificaciones'); items.value = Array.isArray(data) ? data : (data.notificaciones || []) } catch { /* conserva el ultimo resultado */ } }
function toggle() { open.value = !open.value; if (open.value) refresh() }
function relatedId(value) { return value && typeof value === 'object' ? value._id || value.id || '' : value || '' }
async function openNotification(item) {
  try { await api.put(`/notificaciones/${item._id}/leer`); item.leida = true } catch { /* conserva la alerta si no se pudo marcar */ }
  open.value = false
  const reservationId = relatedId(item.reservaId)
  if (reservationId) router.push({ name: 'reservas', query: { reservaId: String(reservationId) } })
  else router.push({ name: 'reservas' })
}
function when(date) { return date ? new Date(date).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : 'Ahora' }
function outside(event) { if (!root.value?.contains(event.target)) open.value = false }
let timer
onMounted(() => { refresh(); timer = setInterval(refresh, 10000); document.addEventListener('click', outside) })
onUnmounted(() => { clearInterval(timer); document.removeEventListener('click', outside) })
</script>
<style scoped>
.wrap{position:relative}.bell{position:relative;width:38px;height:38px;display:grid;place-items:center;border:1px solid #334155;border-radius:11px;background:#111827;color:#cbd5e1;cursor:pointer}.bell svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}.count{position:absolute;top:-6px;right:-7px;min-width:18px;height:18px;display:grid;place-items:center;padding:0 4px;border:2px solid #0b1120;border-radius:999px;background:#4f46e5;color:#fff;font-size:9px;font-weight:850}.menu{position:absolute;top:calc(100% + 10px);right:0;z-index:120;width:min(350px,calc(100vw - 26px));max-height:65vh;overflow:auto;border:1px solid #475569;border-radius:14px;background:#111827;box-shadow:0 20px 55px #020617cc}.menu header{display:grid;gap:4px;padding:14px;border-bottom:1px solid #334155}.menu header strong{color:#f8fafc;font-size:13px}.menu header small,.item small{color:#94a3b8;font-size:10px}.item{width:100%;display:flex;align-items:flex-start;gap:10px;padding:12px;border:0;border-bottom:1px solid #293548;background:transparent;text-align:left;cursor:pointer}.item>span:last-child{display:grid;gap:5px}.item strong{color:#e2e8f0;font-size:11px}.item small{line-height:1.45}.dot{width:8px;height:8px;margin-top:4px;flex:0 0 auto;border-radius:50%;background:#fbbf24}.dot.read{background:#64748b}.empty{padding:18px;color:#94a3b8;font-size:12px}.drop-enter-active,.drop-leave-active{transition:opacity .15s,transform .15s}.drop-enter-from,.drop-leave-to{opacity:0;transform:translateY(-5px)}
</style>
