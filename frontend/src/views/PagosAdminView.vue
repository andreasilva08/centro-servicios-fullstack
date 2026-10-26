<template>
  <main class="payments-page">
    <Transition name="toast"><div v-if="notice" class="payment-toast" role="status">{{ notice }}</div></Transition>
    <header class="page-head">
      <div><span class="eyebrow">CENTRO DE OPERACIONES · SAN GIL</span><h1>Gestión de Pagos</h1><p>Trazabilidad de las transacciones y pagos recibidos.</p></div>
      <button class="refresh" :disabled="loading" @click="loadPayments">{{ loading ? 'Actualizando…' : 'Actualizar' }}</button>
    </header>

    <section class="financial-summary" aria-label="Resumen financiero actualizado">
      <article class="financial-card financial-income"><span>Ingresos por pagos aprobados</span><strong>{{ currency(financialSummary.ingresosCOP) }}</strong><small>Solo transacciones aprobadas</small></article>
      <article class="financial-card financial-refunds"><span>Reembolsos procesados</span><strong>{{ currency(financialSummary.reembolsosCOP) }}</strong><small>Excluidos de ingresos y mostrados por separado</small></article>
      <article class="financial-card"><span>Pagos pendientes</span><strong>{{ Number(financialSummary.pagosPendientes || 0).toLocaleString('es-CO') }}</strong><small>{{ currency(financialSummary.montoPendienteCOP) }} sin contabilizar</small></article>
    </section>

    <section class="search-panel panel">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>
      <input v-model.trim="searchQuery" type="search" aria-label="Buscar transacciones" placeholder="Buscar cliente, correo o referencia TXN…" autocomplete="off">
      <span>{{ filteredPayments.length }} resultados</span>
    </section>

    <section class="filters panel">
      <label>Método de pago<select v-model="methodFilter" @change="loadPayments"><option value="todos">Todos los métodos</option><option v-for="method in methods" :key="method" :value="method">{{ method }}</option></select></label>
      <label>Estado financiero<select v-model="stateFilter" @change="loadPayments"><option value="todos">Todos los estados</option><option v-for="state in states" :key="state" :value="state">{{ state }}</option></select></label>
      <span class="result-count">{{ filteredPayments.length }} transacciones</span>
    </section>

    <section class="panel table-panel">
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <div v-else-if="loading" class="empty">Cargando pagos…</div>
      <div v-else-if="!filteredPayments.length" class="empty">No hay transacciones que coincidan con la búsqueda y los filtros.</div>
      <div v-else class="table-wrap"><table><thead><tr><th>Transacción</th><th>Cliente</th><th>Método</th><th>Monto</th><th>Estado</th><th>Fecha</th><th>Acciones</th></tr></thead><tbody>
        <tr v-for="payment in filteredPayments" :key="payment._id"><td><strong class="reference">{{ payment.referenciaTransaccion }}</strong><small>{{ payment.reservaId?.ticketCode || payment.reservaId?._id || 'Reserva' }}</small></td><td><strong>{{ payment.clienteId?.nombre || payment.reservaId?.clienteSnapshot?.nombre || 'Cliente de oficina' }}</strong><small>{{ payment.clienteId?.email || payment.reservaId?.clienteSnapshot?.email || 'Sin correo' }}</small></td><td><strong>{{ payment.metodoPago }}</strong><small v-if="payment.comprobanteReferencia">Comprobante: {{ payment.comprobanteReferencia }}</small><small v-else-if="payment.metodoPago === 'Efectivo'">Pago presencial · validar en oficina</small><small v-else-if="payment.metodoPago === 'Transferencia Bancaria'">Sin referencia adjunta</small></td><td class="amount">{{ currency(payment.monto) }}</td><td><span class="badge" :class="`badge--${stateClass(payment.estadoPago)}`">{{ payment.estadoPago }}</span></td><td>{{ formatDate(payment.fechaPago) }}</td><td><button class="view-payment" type="button" title="Ver detalles" aria-label="Ver detalles" @click="openDetails(payment)"><svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></button><button v-if="canReview(payment)" class="row-action approve" @click="beginAction(payment, 'Aprobado')">Aprobar</button><button v-if="canReview(payment)" class="row-action reject" @click="beginAction(payment, 'Rechazado')">Rechazar</button><button v-if="canRefund(payment)" class="row-action refund" @click="beginAction(payment, 'Reembolsado')">{{ payment.estadoPago === 'Pendiente de Reembolso' ? 'Procesar reembolso' : 'Reembolso' }}</button><button v-if="canRejectRefund(payment)" class="row-action reject" @click="beginAction(payment, 'ReembolsoRechazado')">Rechazar solicitud</button></td></tr>
      </tbody></table></div>
    </section>
    <div v-if="selectedPayment" class="detail-overlay" @click.self="selectedPayment = null">
      <section class="detail-modal" role="dialog" aria-modal="true" aria-labelledby="payment-detail-title">
        <header class="detail-head"><div><span class="eyebrow">DETALLE DE TRANSACCION</span><h2 id="payment-detail-title">Pago {{ selectedPayment.referenciaTransaccion }}</h2></div><button class="close" type="button" aria-label="Cerrar detalle" @click="selectedPayment = null">&times;</button></header>
        <div class="detail-grid">
          <article class="detail-item"><span>ID unico de transaccion</span><strong class="mono">{{ selectedPayment._id }}</strong></article>
          <article class="detail-item"><span>Referencia</span><strong class="mono">{{ selectedPayment.referenciaTransaccion }}</strong></article>
          <article class="detail-item"><span>Cliente</span><strong>{{ selectedPayment.clienteId?.nombre || selectedPayment.reservaId?.clienteSnapshot?.nombre || 'Cliente de oficina' }}</strong><small>{{ selectedPayment.clienteId?.email || selectedPayment.reservaId?.clienteSnapshot?.email || 'Sin correo' }}</small><small>{{ selectedPayment.clienteId?.telefono || selectedPayment.reservaId?.clienteSnapshot?.telefono || 'Sin telefono' }}</small></article>
          <article class="detail-item"><span>Aventura / reserva</span><strong>{{ selectedPayment.reservaId?.servicio?.nombre || 'Servicio no disponible' }}</strong><small>Ticket: {{ selectedPayment.reservaId?.ticketCode || selectedPayment.reservaId?._id || 'Sin reserva' }}</small></article>
          <article class="detail-item"><span>Metodo de pago</span><strong class="method-chip"><i>{{ methodMark(selectedPayment.metodoPago) }}</i>{{ selectedPayment.metodoPago }}</strong></article>
          <article class="detail-item"><span>Monto registrado</span><strong class="detail-amount">{{ currency(selectedPayment.monto) }}</strong></article>
          <article class="detail-item"><span>Estado financiero</span><strong><span class="badge" :class="`badge--${stateClass(selectedPayment.estadoPago)}`">{{ selectedPayment.estadoPago }}</span></strong></article>
          <article class="detail-item"><span>Fecha y hora de la tentativa</span><strong>{{ formatExactDate(selectedPayment.fechaPago) }}</strong></article>
          <article v-if="selectedPayment.comprobanteReferencia" class="detail-item"><span>Referencia del comprobante</span><strong class="mono">{{ selectedPayment.comprobanteReferencia }}</strong></article>
          <article v-else-if="selectedPayment.metodoPago === 'Efectivo'" class="detail-item"><span>Validación de efectivo</span><strong>Pago presencial pendiente de verificación en oficina</strong></article>
          <article v-if="selectedPayment.motivoSolicitudReembolso" class="detail-item"><span>Motivo de solicitud de reembolso</span><strong>{{ selectedPayment.motivoSolicitudReembolso }}</strong><small v-if="selectedPayment.fechaSolicitudReembolso">Solicitado: {{ formatExactDate(selectedPayment.fechaSolicitudReembolso) }}</small></article>
          <article v-if="selectedPayment.motivoRechazoReembolso" class="detail-item"><span>Decisión de reembolso</span><strong>{{ selectedPayment.motivoRechazoReembolso }}</strong><small v-if="selectedPayment.fechaDecisionReembolso">Revisado: {{ formatExactDate(selectedPayment.fechaDecisionReembolso) }}</small></article>
          <article v-if="selectedPayment.motivoRechazo" class="detail-item"><span>Motivo de rechazo</span><strong>{{ selectedPayment.motivoRechazo }}</strong><small v-if="selectedPayment.fechaRevision">Revisado: {{ formatExactDate(selectedPayment.fechaRevision) }}</small></article>
          <article v-if="selectedPayment.estadoPago === 'Reembolsado'" class="detail-item"><span>Reembolso</span><strong class="mono">{{ selectedPayment.referenciaReembolso || 'Registrado' }}</strong><small>{{ selectedPayment.motivoReembolso }}</small><small v-if="selectedPayment.fechaReembolso">Procesado: {{ formatExactDate(selectedPayment.fechaReembolso) }}</small></article>
        </div>
        <footer class="detail-footer"><button type="button" class="refresh" @click="selectedPayment = null">Cerrar</button></footer>
      </section>
    </div>
    <div v-if="actionPayment" class="detail-overlay action-layer" @click.self="actionPayment = null">
      <section class="detail-modal action-modal" role="dialog" aria-modal="true" aria-labelledby="action-title">
        <header class="detail-head"><div><span class="eyebrow">REVISION FINANCIERA</span><h2 id="action-title">{{ actionTitle }}</h2></div><button class="close" type="button" aria-label="Cerrar" @click="actionPayment = null">&times;</button></header>
        <p class="action-description">{{ actionDescription }}</p>
        <label v-if="actionType !== 'Aprobado'" class="reason-label">Motivo requerido<textarea v-model.trim="actionReason" rows="3" maxlength="500" placeholder="Escribe una nota para la auditoria y la notificacion al cliente"></textarea></label>
        <p v-if="actionError" class="error" role="alert">{{ actionError }}</p>
        <footer class="detail-footer"><button type="button" class="refresh" :disabled="actionLoading" @click="actionPayment = null">Volver</button><button type="button" class="confirm-action" :class="`confirm-${actionType.toLowerCase()}`" :disabled="actionLoading || (actionType !== 'Aprobado' && actionReason.length < 4)" @click="submitAction">{{ actionLoading ? 'Procesando...' : actionButton }}</button></footer>
      </section>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'
import { formatCOP } from '../utils/currency'

const methods = ['Tarjeta de Crédito', 'PSE', 'Nequi', 'DaviPlata', 'Efectivo', 'Transferencia Bancaria']
const states = ['Aprobado', 'Pendiente', 'Pendiente de Validación en Oficina', 'Pendiente de Aprobación', 'Pendiente de Reembolso', 'Rechazado', 'Reembolsado']
const route = useRoute()
const router = useRouter()
const payments = ref([])
const financialSummary = ref({ ingresosCOP: 0, reembolsosCOP: 0, pagosPendientes: 0, montoPendienteCOP: 0 })
const searchQuery = ref('')
const loading = ref(false)
const error = ref('')
const methodFilter = ref('todos')
const stateFilter = ref('todos')
const selectedPayment = ref(null)
const actionPayment = ref(null)
const actionType = ref('')
const actionReason = ref('')
const actionError = ref('')
const actionLoading = ref(false)
const notice = ref('')
const filteredPayments = computed(() => {
  const query = searchQuery.value.toLocaleLowerCase('es')
  if (!query) return payments.value
  return payments.value.filter(payment => {
    const customerName = payment.clienteId?.nombre || payment.reservaId?.clienteSnapshot?.nombre || ''
    const customerEmail = payment.clienteId?.email || payment.reservaId?.clienteSnapshot?.email || ''
    return [customerName, customerEmail, payment.referenciaTransaccion || ''].some(value => String(value).toLocaleLowerCase('es').includes(query))
  })
})
const actionTitle = computed(() => actionType.value === 'Reembolsado' ? 'Procesar reembolso' : actionType.value === 'ReembolsoRechazado' ? 'Rechazar solicitud de reembolso' : actionType.value === 'Aprobado' ? 'Aprobar pago' : 'Rechazar pago')
const actionButton = computed(() => actionType.value === 'Reembolsado' ? 'Confirmar reembolso' : actionType.value === 'ReembolsoRechazado' ? 'Rechazar solicitud' : actionType.value === 'Aprobado' ? 'Aprobar y confirmar reserva' : 'Rechazar pago')
const actionDescription = computed(() => actionType.value === 'Reembolsado'
  ? `Se registrará el reembolso de ${actionPayment.value ? currency(actionPayment.value.monto) : ''} y la reserva quedará cancelada para auditoría.`
  : actionType.value === 'ReembolsoRechazado'
    ? 'El pago seguirá aprobado y la reserva confirmada. El motivo de rechazo se notificará al cliente.'
  : actionType.value === 'Aprobado'
    ? 'El pago quedará aprobado, la reserva se confirmará y se generará el código del ticket.'
    : 'El pago quedará rechazado y el motivo se notificará al cliente. La reserva seguirá pendiente de un nuevo pago.')

async function loadPayments() {
  loading.value = true
  error.value = ''
  try {
    const params = { metodoPago: methodFilter.value, estadoPago: stateFilter.value }
    const response = await api.get('/pagos', { params })
    if (!Array.isArray(response.data)) throw new Error('La respuesta de pagos tiene un formato inesperado.')
    payments.value = response.data
  } catch (cause) {
    error.value = cause.response?.data?.mensaje || 'No se pudo cargar el registro de pagos.'
  } finally {
    loading.value = false
  }
}

async function loadFinancialSummary() {
  try {
    const { data } = await api.get('/pagos/summary')
    financialSummary.value = data
  } catch {
    // El registro de pagos permanece disponible si falla el resumen financiero.
  }
}

function currency(value) { return formatCOP(value) }
function openDetails(payment) { selectedPayment.value = payment }
function openPaymentFromQuery() {
  const requestedId = String(route.query.pagoId || '')
  if (!requestedId) return
  const payment = payments.value.find(item => String(item._id) === requestedId)
  if (!payment) return
  selectedPayment.value = payment
  const query = { ...route.query }
  delete query.pagoId
  router.replace({ query })
}
function methodMark(method) { return ({ 'Tarjeta de Crédito': 'CC', PSE: 'P', Nequi: 'N', DaviPlata: 'D', Efectivo: '$', Transferencia: '↗', 'Transferencia Bancaria': '↗' })[method] || '$' }
function formatDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Sin fecha' : date.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
}
function formatExactDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Sin fecha' : date.toLocaleString('es-CO', { dateStyle: 'full', timeStyle: 'medium' })
}
function stateClass(state) { return ({ Aprobado: 'approved', Rechazado: 'rejected', Reembolsado: 'refunded', Pendiente: 'pending', 'Pendiente de Validación en Oficina': 'pending', 'Pendiente de Aprobación': 'pending', 'Pendiente de Reembolso': 'refund-pending' })[state] || 'pending' }
function canReview(payment) { return ['Pendiente', 'Pendiente de Validación en Oficina', 'Pendiente de Aprobación'].includes(payment.estadoPago) }
function canRefund(payment) { return ['Aprobado', 'Pendiente de Reembolso'].includes(payment.estadoPago) && payment.reservaId?.estado !== 'completada' }
function canRejectRefund(payment) { return payment.estadoPago === 'Pendiente de Reembolso' }
function beginAction(payment, type) {
  actionPayment.value = payment
  actionType.value = type
  actionReason.value = ''
  actionError.value = ''
}
async function submitAction() {
  if (!actionPayment.value || actionLoading.value) return
  actionLoading.value = true
  actionError.value = ''
  try {
    const id = actionPayment.value._id
    if (actionType.value === 'Reembolsado') {
      await api.post(`/pagos/${id}/refund`, { motivoReembolso: actionReason.value })
    } else if (actionType.value === 'ReembolsoRechazado') {
      await api.patch(`/pagos/${id}/refund-request/review`, { motivo: actionReason.value })
    } else {
      await api.patch(`/pagos/${id}/review`, {
        estadoPago: actionType.value,
        ...(actionType.value === 'Rechazado' ? { motivoRechazo: actionReason.value } : {})
      })
    }
    actionPayment.value = null
    selectedPayment.value = null
    notice.value = actionType.value === 'Reembolsado' ? 'Reembolso registrado correctamente.' : actionType.value === 'ReembolsoRechazado' ? 'Solicitud rechazada y cliente notificado.' : actionType.value === 'Aprobado' ? 'Pago aprobado y reserva confirmada.' : 'Pago rechazado y cliente notificado.'
    await Promise.all([loadPayments(), loadFinancialSummary()])
    window.dispatchEvent(new Event('financial-metrics-updated'))
    window.setTimeout(() => { notice.value = '' }, 4500)
  } catch (cause) {
    actionError.value = cause.response?.data?.mensaje || cause.response?.data?.error || 'No se pudo completar la operación.'
  } finally {
    actionLoading.value = false
  }
}
watch(() => [route.query.pagoId, payments.value], openPaymentFromQuery, { immediate: true })
onMounted(() => Promise.all([loadPayments(), loadFinancialSummary()]))
</script>

<style scoped>
.payments-page{min-height:100%;padding:34px 38px 48px;display:grid;align-content:start;gap:20px;color:#e2e8f0}.page-head{display:flex;align-items:center;justify-content:space-between;gap:16px}.eyebrow{color:#a5b4fc;font-size:10px;font-weight:800;letter-spacing:.15em}.page-head h1{margin:7px 0;color:#f8fafc;font-size:30px;font-weight:850;letter-spacing:-.04em}.page-head p{margin:0;color:#94a3b8;font-size:14px}.panel{border:1px solid #334155;border-radius:16px;background:linear-gradient(145deg,#172235eb,#111827ee);box-shadow:0 14px 36px #02061740}.filters{display:flex;align-items:end;gap:14px;padding:17px}.filters label{display:grid;gap:7px;color:#aab7ca;font-size:11px;font-weight:700}.filters select{min-width:190px;padding:10px 12px;border:1px solid #475569;border-radius:10px;background:#0f172a;color:#f1f5f9;font-size:12px}.result-count{margin-left:auto;padding-bottom:10px;color:#94a3b8;font-size:12px}.refresh{padding:10px 14px;border:1px solid #475569;border-radius:10px;background:#1e293b;color:#e2e8f0;font-size:12px;font-weight:750;cursor:pointer}.refresh:disabled{opacity:.6}.table-panel{min-width:0;padding:8px 18px}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;text-align:left}th{padding:14px 12px;color:#8190a5;font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}td{padding:15px 12px;border-top:1px solid #293548;color:#cbd5e1;font-size:12px;white-space:nowrap}td strong,td small{display:block}td strong{color:#f1f5f9;font-size:12px}td small{max-width:230px;margin-top:4px;overflow:hidden;color:#8291a8;font-size:10px;text-overflow:ellipsis}.reference{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#c7d2fe}.amount{color:#a7f3d0;font-weight:800}.badge{display:inline-flex;padding:5px 9px;border-radius:999px;font-size:10px;font-weight:800}.badge--approved{background:#064e3b80;color:#86efac}.badge--rejected{background:#7f1d1d80;color:#fda4af}.badge--pending{background:#78350f80;color:#fcd34d}.empty{padding:30px 12px;color:#94a3b8;text-align:center;font-size:13px}.error{padding:20px;color:#fda4af;font-size:13px}@media(max-width:720px){.payments-page{padding:22px 16px}.page-head{align-items:flex-start}.page-head h1{font-size:25px}.filters{align-items:stretch;flex-direction:column}.filters select{width:100%}.result-count{margin:0;padding:0}}
.view-payment{width:34px;height:34px;display:inline-grid;vertical-align:middle;place-items:center;border:1px solid #6366f166;border-radius:9px;background:#312e8144;color:#c7d2fe;cursor:pointer}.view-payment:hover{background:#4338ca;color:white}.view-payment svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.row-action{margin-left:5px;padding:7px 9px;border:1px solid transparent;border-radius:8px;font-size:10px;font-weight:750;cursor:pointer}.approve{background:#064e3b66;color:#86efac;border-color:#10b98144}.reject,.refund{background:#7f1d1d66;color:#fda4af;border-color:#ef444444}.refund{background:#78350f66;color:#fcd34d;border-color:#f59e0b44}.badge--refunded{background:#312e8166;color:#c4b5fd}.action-layer{z-index:160}.action-modal{width:min(100%,540px)}.action-description{margin:0 0 18px;color:#cbd5e1;font-size:14px;line-height:1.6}.reason-label{display:grid;gap:8px;color:#cbd5e1;font-size:12px;font-weight:700}.reason-label textarea{resize:vertical;padding:12px;border:1px solid #475569;border-radius:10px;background:#0f172a;color:#f8fafc;font:inherit}.confirm-action{padding:10px 14px;border:0;border-radius:10px;background:#4f46e5;color:white;font-size:12px;font-weight:800;cursor:pointer}.confirm-action:disabled{opacity:.45;cursor:not-allowed}.confirm-rechazado{background:#be123c}.confirm-reembolsado{background:#b45309}.payment-toast{position:fixed;z-index:200;top:22px;right:24px;padding:14px 18px;border:1px solid #34d39966;border-radius:13px;background:#064e3bdd;color:#d1fae5;box-shadow:0 18px 50px #02061799;font-size:13px;font-weight:750}.toast-enter-active,.toast-leave-active{transition:all .22s ease}.toast-enter-from,.toast-leave-to{opacity:0;transform:translateY(-8px)}.detail-overlay{position:fixed;inset:0;z-index:150;display:grid;place-items:center;padding:18px;background:#020617c9;backdrop-filter:blur(12px)}.detail-modal{width:min(100%,760px);max-height:calc(100vh - 36px);overflow:auto;padding:24px;border:1px solid #475569;border-radius:20px;background:linear-gradient(145deg,#172235,#0b1120);box-shadow:0 28px 90px #020617c9;color:#e2e8f0}.detail-head{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;margin-bottom:20px}.detail-head h2{margin:7px 0 0;color:#f8fafc;font-size:22px;overflow-wrap:anywhere}.close{width:36px;height:36px;border:1px solid #475569;border-radius:10px;background:#1e293b;color:#cbd5e1;font-size:23px;cursor:pointer}.detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.detail-item{min-width:0;display:grid;align-content:start;gap:7px;padding:14px;border:1px solid #334155;border-radius:12px;background:#0b112080}.detail-item>span{color:#94a3b8;font-size:11px;font-weight:700}.detail-item>strong{color:#f1f5f9;font-size:13px;overflow-wrap:anywhere}.detail-item small{color:#aab7ca;font-size:11px;overflow-wrap:anywhere}.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px!important}.method-chip{display:flex;align-items:center;gap:9px}.method-chip i{width:27px;height:27px;display:grid;place-items:center;border-radius:9px;background:#312e81;color:#c7d2fe;font-size:10px;font-style:normal;font-weight:850}.detail-amount{color:#6ee7b7!important;font-size:20px!important}.detail-footer{display:flex;justify-content:flex-end;margin-top:18px;padding-top:14px;border-top:1px solid #334155}@media(max-width:600px){.detail-modal{padding:18px}.detail-grid{grid-template-columns:1fr}.detail-head h2{font-size:18px}}</style>

<style scoped>
.badge--refund-pending{background:#4c1d9580;color:#ddd6fe}.confirm-reembolsorechazado{background:#be123c}.row-action{white-space:nowrap}
</style>

<style scoped>
.search-panel{display:flex;align-items:center;gap:12px;padding:12px 15px}.search-panel svg{width:18px;height:18px;flex:0 0 auto;fill:none;stroke:#94a3b8;stroke-width:1.8;stroke-linecap:round}.search-panel input{width:100%;min-width:0;height:40px;border:0;outline:0;background:transparent;color:#f8fafc;font:inherit;font-size:14px}.search-panel input::placeholder{color:#8291a8}.search-panel span{flex:0 0 auto;color:#94a3b8;font-size:11px;font-weight:700}@media(max-width:520px){.search-panel{flex-wrap:wrap}.search-panel span{margin-left:30px}}
.financial-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.financial-card{min-width:0;display:grid;gap:9px;padding:18px;border:1px solid #334155;border-radius:15px;background:linear-gradient(145deg,#172235eb,#111827ee);box-shadow:0 14px 36px #02061740}.financial-card>span{color:#aab7ca;font-size:12px;font-weight:700}.financial-card>strong{color:#f8fafc;font-size:22px;font-weight:850;overflow-wrap:anywhere}.financial-card>small{color:#8291a8;font-size:11px;line-height:1.45}.financial-income{border-color:#10b98155}.financial-income>strong{color:#6ee7b7}.financial-refunds{border-color:#f59e0b55}.financial-refunds>strong{color:#fcd34d}@media(max-width:850px){.financial-summary{grid-template-columns:1fr}} 
</style>
