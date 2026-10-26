<template>
  <main class="dashboard-page">
    <header class="page-head"><div><span class="eyebrow">CENTRO DE OPERACIONES · SAN GIL</span><h1>Dashboard gerencial</h1><p>Indicadores de ingresos, demanda y reservas de aventura.</p></div><button class="refresh" :disabled="loading" @click="load">{{ loading ? 'Actualizando...' : 'Actualizar datos' }}</button></header>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <div v-if="loading && !summary" class="loading">Cargando métricas del sistema...</div>
    <template v-else>
      <section class="metrics-grid">
        <article class="metric-card metric-revenue"><span class="metric-icon">$</span><span class="metric-label">Ingresos aprobados</span><strong>{{ currency(totals.ingresosCOP) }}</strong><small>Pagos aprobados · reembolsos excluidos</small><small v-if="totals.reembolsosCOP">Reembolsos procesados: {{ currency(totals.reembolsosCOP) }}</small></article>
        <article class="metric-card"><span class="metric-icon">⌖</span><span class="metric-label">Aventureros registrados</span><strong>{{ number(totals.aventureros) }}</strong><small>Clientes con cuenta activa</small></article>
        <article class="metric-card"><span class="metric-icon">✦</span><span class="metric-label">Servicios activos</span><strong>{{ number(totals.servicios) }}<small class="of-total"> / 30</small></strong><small>Experiencias disponibles en catálogo</small></article>
        <article class="metric-card" :class="{ 'metric-alert': pendingCount > 0 }"><span class="metric-icon">!</span><span class="metric-label">Pendientes por atender</span><strong>{{ number(pendingCount) }}</strong><small>{{ pendingCount ? 'Requieren seguimiento' : 'No hay reservas pendientes' }}</small></article>
        <article class="metric-card metric-top"><span class="metric-icon">★</span><span class="metric-label">Experiencia más solicitada</span><strong>{{ summary?.experienciaMasSolicitada?.nombre || 'Sin reservas todavía' }}</strong><small v-if="summary?.experienciaMasSolicitada">{{ number(summary.experienciaMasSolicitada.reservas) }} reservas · {{ number(summary.experienciaMasSolicitada.participantes) }} aventureros</small><small v-else>Se mostrará cuando se registre una reserva</small></article>
      </section>

      <section class="operations-layout">
        <article class="operations panel">
          <header class="section-head"><div><span class="eyebrow">AGENDA INMEDIATA</span><h2>Estado de operaciones en San Gil</h2></div><span class="pending-pill" :class="{ clear: !pendingCount }">{{ pendingCount }} pendientes</span></header>
          <p v-if="!pendingReservations.length" class="empty">No hay reservas pendientes de atención.</p>
          <ul v-else class="pending-list"><li v-for="reservation in pendingReservations" :key="reservation.id"><span class="pending-dot"></span><div class="pending-main"><strong>{{ reservation.servicioNombre }}</strong><span>{{ reservation.clienteNombre }} · {{ formatDate(reservation.fechaHora) }}</span></div><button class="manage" @click="managePending">Gestionar</button></li></ul>
          <button v-if="pendingCount" class="all-pending" @click="managePending">Gestionar todas las reservas pendientes <span>→</span></button>
        </article>
        <article class="distribution panel"><header class="section-head"><div><span class="eyebrow">VOLUMEN DE SERVICIO</span><h2>Reservas por estado</h2></div></header><div v-for="state in states" :key="state.key" class="state-row"><span class="state-label"><i :class="`state-dot ${state.key}`"></i>{{ state.label }}</span><strong>{{ number(summary?.reservasPorEstado?.[state.key]) }}</strong></div><footer class="reservations-total"><span>Total de reservas</span><strong>{{ number(totals.reservas) }}</strong></footer></article>
      </section>
      <section class="panel activity"><header class="section-head"><div><span class="eyebrow">MOVIMIENTO RECIENTE</span><h2>Actividad reciente</h2></div></header><p v-if="!summary?.actividad?.length" class="empty">Todavía no hay actividad.</p><ul v-else><li v-for="item in summary.actividad" :key="item.id"><span>{{ item.title }}</span><time>{{ formatDate(item.meta, true) }}</time></li></ul></section>
    </template>
  </main>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
import { formatCOP } from '../utils/currency'

const router = useRouter()
const loading = ref(true), error = ref(''), summary = ref(null)
const totals = computed(() => summary.value?.totales || {})
const pendingCount = computed(() => summary.value?.reservasPorEstado?.pendiente || 0)
const pendingReservations = computed(() => summary.value?.reservasPendientes || [])
const states = [
  { key: 'pendiente', label: 'Pendientes' }, { key: 'confirmada', label: 'Confirmadas' },
  { key: 'completada', label: 'Completadas' }, { key: 'cancelada', label: 'Canceladas' }
]
function number(value) { return Number(value || 0).toLocaleString('es-CO') }
function currency(value) { return formatCOP(value) }
function formatDate(value, includeTime = false) { if (!value) return 'Fecha por confirmar'; return new Date(value).toLocaleString('es-CO', includeTime ? { dateStyle: 'short', timeStyle: 'short' } : { dateStyle: 'medium', timeStyle: 'short' }) }
function managePending() { router.push({ name: 'reservas', query: { estado: 'pendiente' } }) }
async function load() {
  loading.value = true; error.value = ''
  try { summary.value = (await api.get('/dashboard/summary')).data }
  catch (e) { error.value = e.response?.data?.mensaje || 'No se pudieron cargar las métricas.' }
  finally { loading.value = false }
}
onMounted(() => {
  load()
  window.addEventListener('financial-metrics-updated', load)
})
onUnmounted(() => window.removeEventListener('financial-metrics-updated', load))
</script>

<style scoped>
.dashboard-page{min-height:100%;padding:34px 38px 48px;display:grid;align-content:start;gap:23px;color:#e2e8f0}.page-head{display:flex;justify-content:space-between;align-items:center;gap:18px}.eyebrow{color:#a5b4fc;font-size:10px;font-weight:800;letter-spacing:.16em}.page-head h1{margin:7px 0;font-size:30px;font-weight:850;letter-spacing:-.04em;color:#f8fafc}.page-head p{margin:0;color:#94a3b8;font-size:14px}.refresh,.manage,.all-pending{border:1px solid #475569;border-radius:10px;background:#1e293b;color:#e2e8f0;font-size:13px;font-weight:700;cursor:pointer;transition:background .18s,border-color .18s}.refresh{padding:10px 14px}.refresh:hover,.manage:hover{border-color:#818cf8;background:#312e81}.refresh:disabled{opacity:.6}.metrics-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.metric-card,.panel{border:1px solid #334155;border-radius:15px;background:linear-gradient(145deg,#172235eb,#111827ee);box-shadow:0 12px 30px #02061738}.metric-card{min-height:143px;padding:18px;display:flex;flex-direction:column;gap:9px}.metric-label{color:#94a3b8;font-size:12px;font-weight:650}.metric-card>strong{min-width:0;color:#f8fafc;font-size:26px;font-weight:850;line-height:1.2;letter-spacing:-.035em;overflow-wrap:anywhere}.metric-card>small{color:#7f8da3;font-size:11px;line-height:1.45}.metric-card .of-total{color:#64748b;font-size:14px}.metric-revenue{border-color:#4f46e555;background:radial-gradient(ellipse at top right,#4f46e52b,transparent 70%),linear-gradient(145deg,#172235eb,#111827ee)}.metric-revenue>strong{color:#c7d2fe;font-size:23px}.metric-alert{border-color:#f59e0b75;background:radial-gradient(ellipse at top right,#f59e0b1c,transparent 70%),linear-gradient(145deg,#172235eb,#111827ee)}.metric-alert>strong{color:#fcd34d}.metric-top{grid-column:span 2}.metric-top>strong{font-size:20px}.operations-layout{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(270px,1fr);gap:16px}.panel{padding:21px}.section-head{display:flex;justify-content:space-between;align-items:center;gap:15px;margin-bottom:17px}.section-head h2{margin:5px 0 0;color:#f1f5f9;font-size:18px;font-weight:750;letter-spacing:-.02em}.pending-pill{padding:6px 9px;border-radius:999px;background:#78350f;color:#fde68a;font-size:11px;font-weight:750;white-space:nowrap}.pending-pill.clear{background:#052e16;color:#86efac}.pending-list,.activity ul{margin:0;padding:0;list-style:none}.pending-list{display:grid;gap:2px}.pending-list li{display:flex;align-items:center;gap:11px;padding:12px 0;border-top:1px solid #334155}.pending-dot,.state-dot{width:8px;height:8px;flex:0 0 auto;border-radius:50%;background:#fbbf24}.pending-main{min-width:0;display:grid;gap:4px;flex:1}.pending-main strong{overflow:hidden;color:#e2e8f0;font-size:13px;text-overflow:ellipsis;white-space:nowrap}.pending-main span{color:#94a3b8;font-size:11px}.manage{padding:7px 10px;font-size:11px}.all-pending{width:100%;margin-top:13px;padding:11px 12px;border-color:#4f46e566;background:#312e8138;color:#c7d2fe;text-align:left}.all-pending:hover{background:#3730a3}.all-pending span{float:right}.state-row,.reservations-total{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-top:1px solid #334155}.state-label{display:flex;align-items:center;gap:9px;color:#cbd5e1;font-size:13px}.state-row>strong,.reservations-total strong{color:#f8fafc;font-size:14px}.state-dot.pendiente{background:#fbbf24}.state-dot.confirmada{background:#4ade80}.state-dot.completada{background:#60a5fa}.state-dot.cancelada{background:#fb7185}.reservations-total{margin-top:5px}.reservations-total span{color:#94a3b8;font-size:12px}.activity ul{display:grid}.activity li{display:flex;justify-content:space-between;gap:18px;padding:11px 0;border-top:1px solid #334155;color:#dbe3ee;font-size:13px}.activity time{color:#8190a5;font-size:11px;white-space:nowrap}.empty,.loading{padding:15px 0;color:#94a3b8;font-size:13px}.error{margin:0;color:#fda4af;font-size:14px}@media(max-width:1080px){.metrics-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:760px){.dashboard-page{padding:22px 16px}.page-head{align-items:flex-start;flex-direction:column}.operations-layout{grid-template-columns:1fr}.metric-top{grid-column:auto}}@media(max-width:460px){.metrics-grid{grid-template-columns:1fr}.metric-card{min-height:120px}.activity li{flex-direction:column;gap:5px}}
.dashboard-page{gap:24px}.metrics-grid{grid-template-columns:minmax(0,1fr)}.metric-card{position:relative;min-height:150px;padding:21px}.metric-icon{position:absolute;right:18px;top:18px;width:38px;height:38px;display:grid;place-items:center;border:1px solid #818cf84d;border-radius:12px;background:#312e8145;color:#c7d2fe;font-size:21px;font-weight:800}.metric-revenue .metric-icon{border-color:#34d39955;background:#064e3b55;color:#6ee7b7}.metric-revenue>strong{color:#34d399}.metric-alert .metric-icon{border-color:#f59e0b66;background:#78350f55;color:#fcd34d}.metric-card>.metric-label{padding-right:46px}.metric-top{grid-column:auto}.metric-top>strong{max-width:95%;font-size:20px}@media(min-width:768px){.metrics-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:760px){.operations-layout{grid-template-columns:minmax(0,1fr)}}@media(max-width:460px){.metrics-grid{grid-template-columns:minmax(0,1fr)}}
</style>
