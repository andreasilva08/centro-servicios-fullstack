<template>
  <div class="dashboard">
    <main class="content">
      <header class="content__header">
        <div>
          <h1>{{ isAdmin ? 'Gestión Global de Reservas' : 'Mis Reservas' }}</h1>
          <p>Consulta, agenda y gestiona el estado de las citas programadas.</p>
        </div>
        <button class="btn-primary" @click="openCreateModal">+ Nueva reserva</button>
      </header>

      <!-- Filtros de búsqueda y estado -->
      <div class="filters-bar">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar por cliente o servicio..."
          class="filter-input"
        />
        <select v-model="statusFilter" class="filter-select">
          <option value="todos">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="confirmada">Confirmada</option>
          <option value="completada">Completada</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>

      <div v-if="loading" class="loading-text">Cargando reservas…</div>

      <section v-else-if="loadError" class="panel load-error" role="alert"><p>{{ loadError }}</p><button class="btn-primary" @click="fetchReservas">Reintentar</button></section>
      <section v-else class="panel">
        <div v-if="isAdmin" class="admin-table-wrap"><table class="reservas-table admin-table"><thead><tr><th>Cliente</th><th>Aventura</th><th>Fecha</th><th>Viajeros</th><th>Estado</th><th>Total COP</th><th>Acciones</th></tr></thead><tbody>
          <tr v-if="!filteredReservas.length"><td colspan="7" class="empty-cell">No hay reservas para estos filtros.</td></tr>
          <tr v-for="reserva in filteredReservas" :key="reserva.id || reserva._id"><td><strong>{{ reserva.clienteNombre }}</strong><small>{{ reserva.clienteEmail || reserva.clienteTelefono || 'Venta de oficina' }}</small></td><td>{{ reserva.servicioNombre }}</td><td>{{ formatDate(reserva.fechaHora) }}<small>{{ formatTime(reserva.fechaHora) }}</small></td><td>{{ reserva.participantes || 1 }}</td><td><select class="status-select" :class="`status-select--${reserva.estado}`" :value="reserva.estado" :disabled="isTerminal(reserva.estado)" aria-label="Cambiar estado de reserva" @change="requestStatusChange(reserva, $event)"><option v-for="state in availableTransitions(reserva)" :key="state" :value="state">{{ stateLabels[state] }}</option></select></td><td>{{ currency(reserva.precioTotal) }}</td><td><div class="admin-actions"><button class="icon-action view" title="Ver detalles / ficha completa" aria-label="Ver detalles y ficha completa" @click="viewDetails(reserva)"><svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></button><button class="icon-action delete" title="Eliminar reserva" aria-label="Eliminar reserva" @click="openPermanentDeleteModal(reserva)"><svg viewBox="0 0 24 24"><path d="M4 7h16m-10 4v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"/></svg></button></div></td></tr>
        </tbody></table></div>
        <table v-else class="reservas-table"><thead><tr><th>Servicio</th><th>Fecha y hora</th><th>Estado</th><th>Acciones</th></tr></thead><tbody><tr v-if="!filteredReservas.length"><td colspan="4" class="empty-cell">No se encontraron reservas.</td></tr><tr v-for="reserva in filteredReservas" :key="reserva.id || reserva._id"><td>{{ reserva.servicioNombre }}</td><td>{{ formatDate(reserva.fechaHora) }}<small>{{ formatTime(reserva.fechaHora) }}</small></td><td><span class="badge" :class="getBadgeClass(reserva.estado)">{{ reserva.estado }}</span><small v-if="reserva.reembolsoPendiente" class="refund-status">Reembolso en revisión</small></td><td><div class="action-buttons"><button v-if="reserva.estado === 'pendiente'" class="btn-icon btn-icon--pay" @click="openCheckout(reserva)">Pagar</button><button v-if="reserva.estado === 'pendiente'" class="btn-icon btn-icon--danger" @click="openCancelModal(reserva)">Cancelar</button><button v-if="!isAdmin && reserva.estado === 'confirmada' && reserva.pagoAprobado && !reserva.reembolsoPendiente" class="btn-icon btn-icon--refund" @click="openRefundModal(reserva)">Solicitar reembolso</button><button v-if="reserva.ticketCode" class="btn-icon btn-icon--ticket" @click="viewTicket(reserva)">Ver ticket QR</button></div></td></tr></tbody></table>
      </section>
    </main>

    <!-- Modal para confirmar eliminación/cancelación -->
    <div v-if="refundModalOpen" class="refund-overlay" @click.self="refundModalOpen = false">
      <form class="refund-modal" role="dialog" aria-modal="true" aria-labelledby="refund-title" @submit.prevent="submitRefundRequest">
        <span class="refund-eyebrow">ATENCIÓN AL VIAJERO</span><h2 id="refund-title">Solicitar reembolso</h2>
        <p>La reserva permanecerá confirmada mientras administración revisa tu solicitud.</p>
        <label for="refund-reason">Motivo de la devolución</label>
        <textarea id="refund-reason" v-model.trim="refundReason" rows="4" maxlength="500" minlength="5" required placeholder="Cuéntanos por qué solicitas el reembolso"></textarea>
        <p v-if="refundError" class="refund-error" role="alert">{{ refundError }}</p>
        <footer><button type="button" class="btn-secondary" :disabled="refundSubmitting" @click="refundModalOpen = false">Volver</button><button type="submit" class="btn-primary" :disabled="refundSubmitting || refundReason.length < 5">{{ refundSubmitting ? 'Enviando…' : 'Enviar solicitud' }}</button></footer>
      </form>
    </div>
    <ConfirmModal
      :show="showCancelModal"
      title="¿Cancelar reserva?"
      :message="`¿Confirmas cancelar la reserva de '${isAdmin ? selectedReserva?.clienteNombre : selectedReserva?.servicioNombre}'?`"
      :loading="cancelling"
      @close="showCancelModal = false"
      @confirm="handleConfirmCancel"
    />
    <ConfirmModal :show="showPermanentDeleteModal" title="¿Eliminar reserva?" :message="`¿Estás seguro de eliminar la reserva de '${isAdmin ? selectedReserva?.clienteNombre : selectedReserva?.servicioNombre}'? Esta acción no se puede deshacer.`" :loading="deleting" @close="showPermanentDeleteModal = false" @confirm="handleConfirmDelete" />
    <ConfirmModal :show="showStatusConfirm" title="Confirmar cambio de estado" :message="statusMessage" :loading="statusSaving" :confirm-disabled="!statusEvidenceValid" :confirm-label="nextStatus === 'confirmada' ? 'Registrar y confirmar' : nextStatus === 'completada' ? 'Validar asistencia' : 'Confirmar cambio'" @close="dismissStatusChange" @confirm="confirmStatusChange">
      <div v-if="nextStatus === 'confirmada' && !targetAlreadyPaid" class="status-evidence">
        <label><input v-model="recordPayment" type="checkbox"> Confirmo que recibí el pago</label>
        <label class="payment-method">Método de pago<select v-model="paymentMethod" :disabled="!recordPayment"><option value="">Seleccionar método</option><option value="efectivo">Efectivo</option><option value="tarjeta">Tarjeta</option><option value="transferencia">Transferencia</option><option value="nequi">Nequi</option><option value="daviplata">DaviPlata</option><option value="pse">PSE</option></select></label>
      </div>
      <div v-if="nextStatus === 'completada'" class="status-evidence"><label><input v-model="attendanceConfirmed" type="checkbox"> Confirmo que validé la asistencia</label></div>
    </ConfirmModal>
    <ReservaModal :show="showForm" :services="services" :submitting="submitting" :form-error="formError" @close="showForm = false" @save="saveReservation" />
    <ReservaAdminModal :show="showAdminForm" :clients="clients" :services="services" :submitting="submitting" :error="formError" @close="showAdminForm = false" @save="saveOfficeReservation" />
    <CheckoutModal :show="checkoutOpen" :reservation="checkoutReservation" :submitting="paying" :form-error="paymentError" :registered-phone="registeredPhone" @close="checkoutOpen = false" @pay="processPayment" />
    <TicketModal :show="ticketOpen" :reservation="ticketReservation" @close="ticketOpen = false" />
    <FichaReservaModal :show="detailsOpen" :reservation="detailsReservation" @close="detailsOpen = false" />
    <Transition name="toast"><div v-if="toastMessage" class="toast-message" :class="`toast-message--${toastType}`" role="status"><span class="toast-icon"><svg viewBox="0 0 24 24"><path v-if="toastType === 'success'" d="m5 12 4 4L19 6"/><path v-else d="M12 8v5m0 4h.01"/><circle cx="12" cy="12" r="9"/></svg></span><span>{{ toastMessage }}</span><button aria-label="Cerrar notificación" @click="toastMessage = ''">×</button></div></Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'
import ConfirmModal from '../components/ConfirmModal.vue'
import ReservaModal from '../components/ReservaModal.vue'
import CheckoutModal from '../components/CheckoutModal.vue'
import TicketModal from '../components/TicketModal.vue'
import ReservaAdminModal from '../components/ReservaAdminModal.vue'
import FichaReservaModal from '../components/FichaReservaModal.vue'
import { formatCOP } from '../utils/currency'

const reservas = ref([])
const loadError = ref('')
const route = useRoute()
const router = useRouter()
const loading = ref(true)
const searchQuery = ref('')
const statusFilter = ref(route.query.estado === 'pendiente' ? 'pendiente' : 'todos')

const showCancelModal = ref(false)
const showPermanentDeleteModal = ref(false)
const selectedReserva = ref(null)
const deleting = ref(false)
const cancelling = ref(false)
const showForm = ref(false)
const showAdminForm = ref(false), clients = ref([])
const detailsOpen = ref(false), detailsReservation = ref(null)
const showStatusConfirm = ref(false), statusSaving = ref(false), statusTarget = ref(null), nextStatus = ref('')
const checkoutOpen = ref(false), checkoutReservation = ref(null), paying = ref(false), paymentError = ref('')
const refundModalOpen = ref(false), refundReservation = ref(null), refundReason = ref(''), refundSubmitting = ref(false), refundError = ref('')
const ticketOpen = ref(false), ticketReservation = ref(null)
const services = ref([])
const submitting = ref(false)
const formError = ref('')
const reservationStates = ['pendiente', 'confirmada', 'completada', 'cancelada']
const stateLabels = { pendiente: 'Pendiente', confirmada: 'Confirmada', completada: 'Completada', cancelada: 'Cancelada' }
const statusMessage = computed(() => statusTarget.value ? `¿Confirmas cambiar la reserva de ${statusTarget.value.clienteNombre} a estado ${stateLabels[nextStatus.value]?.toLowerCase()}?` : '')
const isAdmin = JSON.parse(localStorage.getItem('user') || '{}').rol === 'admin'
const targetAlreadyPaid = computed(() => statusTarget.value?.pagoAprobado === true)
const statusEvidenceValid = computed(() => nextStatus.value === 'confirmada'
  ? (targetAlreadyPaid.value || (recordPayment.value && Boolean(paymentMethod.value)))
  : nextStatus.value === 'completada' ? attendanceConfirmed.value : true)
const registeredPhone = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}').telefono || '' } catch { return '' } })()
const toastMessage = ref('')
const toastType = ref('success')
const recordPayment = ref(false), paymentMethod = ref(''), attendanceConfirmed = ref(false)
let toastTimeout

function notify(message, type = 'success') {
  toastMessage.value = message
  toastType.value = type
  clearTimeout(toastTimeout)
  toastTimeout = setTimeout(() => { toastMessage.value = '' }, 3800)
}

async function fetchReservas() {
  loading.value = true
  loadError.value = ''
  try {
    const response = await api.get('/reservas')
    if (!Array.isArray(response.data)) throw new Error('La API de reservas devolvió un formato inesperado.')
    reservas.value = response.data
  } catch (error) {
    console.error('Error al cargar reservas:', error)
    loadError.value = error.response?.data?.mensaje || (error.code === 'ECONNABORTED' ? 'La consulta tardó demasiado. Comprueba que el backend esté activo e inténtalo de nuevo.' : error.message || 'No se pudieron cargar las reservas. Comprueba la conexión con el backend.')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await fetchReservas()
  try { services.value = (await api.get('/servicios')).data } catch (e) { console.error(e) }
  if (route.query.nueva === '1') showForm.value = true
})
watch(() => route.query.estado, value => { statusFilter.value = value === 'pendiente' ? 'pendiente' : 'todos' })
watch(() => route.query.nueva, value => { if (value === '1' && !isAdmin) showForm.value = true })
watch(() => [route.query.reservaId, reservas.value], ([requestedId, items]) => {
  if (!requestedId) return
  const reservation = items.find(item => String(item.id || item._id) === String(requestedId))
  if (!reservation) return
  viewDetails(reservation)
  const query = { ...route.query }
  delete query.reservaId
  router.replace({ query })
}, { immediate: true })

const filteredReservas = computed(() => {
  return reservas.value.filter((r) => {
    const matchesSearch =
      (r.clienteNombre || '').toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (r.servicioNombre || '').toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesStatus =
      statusFilter.value === 'todos' || r.estado === statusFilter.value

    return matchesSearch && matchesStatus
  })
})

async function updateStatus(reserva, newStatus, evidence = {}) {
  try {
    const response = await api.patch(`/reservas/${reserva.id || reserva._id}`, { estado: newStatus, ...evidence })
    Object.assign(reserva, response.data)
    notify(`Reserva ${stateLabels[newStatus]?.toLowerCase() || 'actualizada'} correctamente.`)
    return true
  } catch (error) {
    console.error('Error al actualizar estado:', error)
    notify(error.response?.data?.mensaje || 'No se pudo actualizar el estado de la reserva.', 'error')
    return false
  }
}

function requestStatusChange(reserva, event) {
  const status = event.target.value
  event.target.value = reserva.estado
  if (!isAdmin || status === reserva.estado || isTerminal(reserva.estado) || !availableTransitions(reserva).includes(status)) return
  recordPayment.value = false; paymentMethod.value = ''; attendanceConfirmed.value = false
  statusTarget.value = reserva; nextStatus.value = status; showStatusConfirm.value = true
}

function dismissStatusChange() { showStatusConfirm.value = false; statusTarget.value = null; nextStatus.value = ''; recordPayment.value = false; paymentMethod.value = ''; attendanceConfirmed.value = false }

async function confirmStatusChange() {
  if (!statusTarget.value || !nextStatus.value) return
  statusSaving.value = true
  const evidence = nextStatus.value === 'confirmada'
    ? (targetAlreadyPaid.value ? {} : { registrarPago: recordPayment.value, metodoPago: paymentMethod.value })
    : nextStatus.value === 'completada' ? { asistenciaConfirmada: attendanceConfirmed.value } : {}
  const changed = await updateStatus(statusTarget.value, nextStatus.value, evidence)
  if (changed) dismissStatusChange()
  statusSaving.value = false
}

function isTerminal(state) { return state === 'completada' || state === 'cancelada' }
function availableTransitions(reserva) {
  if (reserva.estado === 'pendiente') return ['pendiente', 'confirmada', 'cancelada']
  if (reserva.estado === 'confirmada') return ['confirmada', 'completada', 'cancelada']
  return [reserva.estado]
}

function openCancelModal(reserva) {
  if (!isAdmin && !['pendiente', 'confirmada'].includes(reserva.estado)) return
  selectedReserva.value = reserva
  showCancelModal.value = true
}

function openRefundModal(reserva) {
  if (isAdmin || reserva.estado !== 'confirmada' || reserva.pagoAprobado !== true || reserva.reembolsoPendiente) return
  refundReservation.value = reserva
  refundReason.value = ''
  refundError.value = ''
  refundModalOpen.value = true
}

async function submitRefundRequest() {
  if (!refundReservation.value || refundReason.value.length < 5 || refundSubmitting.value) return
  refundSubmitting.value = true
  refundError.value = ''
  try {
    const id = refundReservation.value.id || refundReservation.value._id
    const response = await api.post(`/reservas/${id}/refund-request`, { motivo: refundReason.value })
    refundModalOpen.value = false
    await fetchReservas()
    notify(response.data.mensaje || 'Tu solicitud fue enviada a administración.')
  } catch (error) {
    refundError.value = error.response?.data?.mensaje || 'No se pudo enviar la solicitud de reembolso.'
  } finally {
    refundSubmitting.value = false
  }
}

function openCheckout(reserva) {
  if (isAdmin || reserva.estado !== 'pendiente') return
  checkoutReservation.value = reserva
  paymentError.value = ''
  checkoutOpen.value = true
}

function viewTicket(reserva) { ticketReservation.value = reserva; ticketOpen.value = true }
function viewDetails(reserva) { detailsReservation.value = reserva; detailsOpen.value = true }

async function processPayment(paymentData) {
  if (!checkoutReservation.value?._id && !checkoutReservation.value?.id) return
  paying.value = true; paymentError.value = ''
  try {
    const id = checkoutReservation.value._id || checkoutReservation.value.id
    const response = await api.post(`/reservas/${id}/pay`, paymentData)
    checkoutOpen.value = false
    if (response.data.pago?.estadoPago === 'Aprobado') {
      ticketReservation.value = response.data.reserva
      ticketOpen.value = true
      notify('Pago aprobado. Tu reserva esta confirmada y tu ticket QR esta listo.')
    } else {
      notify(response.data.mensaje || 'Pago registrado. Quedara pendiente de validacion administrativa.')
    }
    await fetchReservas()
  } catch (error) {
    paymentError.value = error.response?.data?.mensaje || 'No se pudo procesar el pago simulado.'
  } finally { paying.value = false }
}

function openPermanentDeleteModal(reserva) {
  selectedReserva.value = reserva
  showPermanentDeleteModal.value = true
}

async function handleConfirmCancel() {
  if (!selectedReserva.value) return
  cancelling.value = true

  try {
    await api.patch(`/reservas/${selectedReserva.value.id || selectedReserva.value._id}/cancel`)
    showCancelModal.value = false
    await fetchReservas()
    notify('La reserva fue cancelada.')
  } catch (error) {
    console.error('Error al cancelar reserva:', error)
    notify(error.response?.data?.mensaje || 'No se pudo cancelar la reserva.', 'error')
  } finally {
    cancelling.value = false
  }
}

async function handleConfirmDelete() {
  if (!selectedReserva.value) return
  deleting.value = true
  try {
    await api.delete(`/reservas/${selectedReserva.value.id || selectedReserva.value._id}`)
    showPermanentDeleteModal.value = false
    reservas.value = reservas.value.filter(item => String(item.id || item._id) !== String(selectedReserva.value.id || selectedReserva.value._id))
    notify('La reserva fue eliminada correctamente.')
  } catch (error) {
    notify(error.response?.data?.mensaje || 'No se pudo eliminar la reserva.', 'error')
  } finally {
    deleting.value = false
  }
}

function formatDate(dateTimeStr) {
  if (!dateTimeStr) return ''
  const date = new Date(dateTimeStr)
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

function currency(value) {
  return formatCOP(value)
}

function formatTime(dateTimeStr) {
  if (!dateTimeStr) return ''
  const date = new Date(dateTimeStr)
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getBadgeClass(estado) {
  switch (estado) {
    case 'confirmada':
      return 'badge--success'
    case 'completada':
      return 'badge--info'
    case 'cancelada':
      return 'badge--error'
    default:
      return 'badge--warning'
  }
}

async function openCreateModal() {
  formError.value = ''
  if (isAdmin) { await loadClients(); showAdminForm.value = true }
  else showForm.value = true
}

async function loadClients() {
  try { clients.value = (await api.get('/usuarios')).data.filter(user => user.rol === 'cliente' && user.estado === 'activo') }
  catch (error) { formError.value = error.response?.data?.mensaje || 'No se pudieron cargar los clientes.' }
}

async function saveOfficeReservation(payload) {
  submitting.value = true; formError.value = ''
  try {
    const response = await api.post('/reservas', payload)
    showAdminForm.value = false
    await fetchReservas()
    if (response.data.ticketCode) { ticketReservation.value = response.data; ticketOpen.value = true; notify('Venta registrada, reserva confirmada y ticket emitido.') }
    else notify('Reserva presencial creada como pendiente de pago.')
  } catch (error) { formError.value = error.response?.data?.mensaje || 'No se pudo registrar la reserva presencial.' }
  finally { submitting.value = false }
}

async function saveReservation(payload) {
  if (isAdmin) return
  formError.value = ''
  if (!payload.servicio || !payload.fechaHora || new Date(payload.fechaHora) <= new Date()) { formError.value = 'Selecciona un servicio y una fecha futura.'; return }
  submitting.value = true
  try {
    const response = await api.post('/reservas', payload)
    checkoutReservation.value = response.data
    paymentError.value = ''
    showForm.value = false; await fetchReservas()
    checkoutOpen.value = true
    notify('Reserva pendiente creada. Completa el pago para confirmarla.')
  }
  catch (error) { formError.value = error.response?.data?.mensaje || 'No se pudo guardar la reserva.' }
  finally { submitting.value = false }
}

</script>

<style scoped>
.dashboard {
  min-height: 100vh;
  display: block;
}

.sidebar {
  background: var(--surface);
  border-right: 1px solid var(--border);
  padding: 28px 20px;
  display: flex;
  flex-direction: column;
  gap: 36px;
}

.sidebar__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 14px;
}

.brand-mark {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: var(--accent);
  box-shadow: 0 0 0 4px var(--accent-soft);
}

.sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.sidebar__link {
  color: var(--text-muted);
  text-decoration: none;
  font-size: 14px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
}

.sidebar__link--active {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 500;
}

.sidebar__logout {
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 13px;
}

.content {
  padding: 40px 48px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.content__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-primary {
  background: var(--accent);
  color: #0d1117;
  border: none;
  border-radius: var(--radius-sm);
  padding: 10px 16px;
  font-weight: 600;
  cursor: pointer;
}

.filters-bar {
  display: flex;
  gap: 12px;
}

.filter-input,
.filter-select {
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  color: var(--text);
  font-size: 14px;
}

.filter-input {
  flex: 1;
}

.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px;
  overflow-x: auto;
}

.reservas-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 14px;
}

.reservas-table th,
.reservas-table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}

.reservas-table th {
  color: var(--text-muted);
  font-weight: 500;
}

.font-bold {
  font-weight: 600;
}

.text-muted {
  color: var(--text-muted);
}

.text-sm {
  font-size: 12.5px;
}

.badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  text-transform: capitalize;
}

.badge--warning {
  background: rgba(255, 193, 7, 0.15);
  color: #ffc107;
}

.badge--info {
  background: rgba(91, 140, 255, 0.15);
  color: var(--accent);
}

.badge--success {
  background: rgba(62, 207, 142, 0.15);
  color: var(--success);
}

.badge--error {
  background: rgba(255, 107, 107, 0.15);
  color: var(--error);
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-select {
  background: var(--surface-raised);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  font-size: 12.5px;
}

.status-actions { display: flex; flex-wrap: wrap; gap: 5px; }
.status-action { border: 1px solid transparent; border-radius: 999px; padding: 6px 8px; font-size: 10px; font-weight: 700; cursor: pointer; transition: transform .16s, filter .16s; }
.status-action:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.18); }
.status-action:disabled { opacity: .42; cursor: default; }
.status-action--pendiente { background: #fbbf2420; color: #fcd34d; border-color: #fbbf2438; }
.status-action--confirmada { background: #34d39920; color: #6ee7b7; border-color: #34d39938; }
.status-action--completada { background: #60a5fa20; color: #93c5fd; border-color: #60a5fa38; }
.status-action--cancelada { background: #fb718520; color: #fda4af; border-color: #fb718538; }

.btn-icon {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  cursor: pointer;
}

.btn-icon--danger {
  color: var(--error);
  border-color: rgba(255, 107, 107, 0.3);
}

.empty-cell {
  text-align: center;
  color: var(--text-muted);
  padding: 32px;
}
.delete-icon{width:32px;height:32px;flex:0 0 auto;display:inline-grid;place-items:center;border:1px solid #fb71853f;border-radius:9px;background:#fb718510;color:#fda4af;cursor:pointer;transition:transform .16s,background .16s,border-color .16s}.delete-icon svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}.delete-icon:hover{transform:translateY(-1px);border-color:#fb7185;background:#fb718525;color:#fecdd3}.toast-message{position:fixed;z-index:120;top:22px;right:24px;width:min(390px,calc(100vw - 32px));display:flex;align-items:center;gap:12px;padding:13px 14px;border:1px solid #34d39962;border-radius:14px;background:#10231eef;color:#d1fae5;box-shadow:0 18px 50px #020617a8;backdrop-filter:blur(15px);font-size:12px;font-weight:600}.toast-message--error{border-color:#fb718568;background:#28171cf2;color:#fecdd3}.toast-icon{width:30px;height:30px;flex:0 0 auto;display:grid;place-items:center;border-radius:10px;background:#34d39920;color:#6ee7b7}.toast-message--error .toast-icon{background:#fb718520;color:#fda4af}.toast-icon svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.toast-message>span:nth-child(2){flex:1;line-height:1.4}.toast-message>button{border:0;background:transparent;color:inherit;font-size:19px;cursor:pointer;opacity:.75}.toast-enter-active,.toast-leave-active{transition:opacity .24s,transform .24s}.toast-enter-from,.toast-leave-to{opacity:0;transform:translateY(-10px) scale(.98)}@media(max-width:720px){.toast-message{top:12px;right:12px}.action-buttons{flex-wrap:wrap}}
.btn-icon--pay{border-color:#818cf899;background:#312e8166;color:#c7d2fe;font-weight:750}.btn-icon--pay:hover{background:#4338ca;color:#fff}.btn-icon--ticket{border-color:#34d39970;background:#064e3b40;color:#86efac}.btn-icon--ticket:hover{background:#065f46;color:#d1fae5}
.admin-table-wrap{width:100%;overflow-x:auto}.admin-table{min-width:980px}.admin-table th{padding:14px 13px;color:#94a3b8;font-size:10px;letter-spacing:.1em;text-transform:uppercase}.admin-table td{padding:14px 13px;border-bottom:1px solid #293548;color:#dbe3ee;font-size:12px;vertical-align:middle}.admin-table td:first-child{min-width:160px}.admin-table td:first-child strong,.admin-table td:first-child small,.admin-table td:nth-child(3) small{display:block}.admin-table td:first-child strong{color:#f8fafc;font-size:12px}.admin-table td:first-child small,.admin-table td:nth-child(3) small{margin-top:4px;color:#8291a8;font-size:10px}.status-select{min-width:124px;appearance:none;padding:7px 28px 7px 11px;border:1px solid;border-radius:999px;font-size:11px;font-weight:800;cursor:pointer;background-image:linear-gradient(45deg,transparent 50%,currentColor 50%),linear-gradient(135deg,currentColor 50%,transparent 50%);background-position:calc(100% - 14px) 48%,calc(100% - 10px) 48%;background-size:4px 4px;background-repeat:no-repeat}.status-select--pendiente{border-color:#fbbf2466;background-color:#78350f66;color:#fcd34d}.status-select--confirmada{border-color:#34d39966;background-color:#064e3b66;color:#86efac}.status-select--completada{border-color:#60a5fa66;background-color:#1e3a8a66;color:#93c5fd}.status-select--cancelada{border-color:#fb718566;background-color:#7f1d1d66;color:#fda4af}.status-select option{background:#111827;color:#e2e8f0}.admin-actions{display:flex;align-items:center;gap:6px}.icon-action{width:34px;height:34px;display:grid;place-items:center;border:1px solid #475569;border-radius:9px;background:#1e293b;color:#cbd5e1;cursor:pointer;transition:background .16s,border-color .16s,color .16s}.icon-action svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}.icon-action.view:hover{border-color:#818cf8;background:#312e81;color:#e0e7ff}.icon-action.edit:hover{border-color:#38bdf8;background:#0c4a6e;color:#bae6fd}.icon-action.delete{border-color:#fb718544;background:#7f1d1d22;color:#fda4af}.icon-action.delete:hover{background:#991b1b;color:#fff}.reservas-table td small{display:block;margin-top:4px;color:#8291a8;font-size:10px}
.load-error{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:22px}.load-error p{margin:0;color:#fda4af;font-size:14px}@media(max-width:520px){.load-error{align-items:stretch;flex-direction:column}}
.status-evidence{display:grid;gap:12px;margin:8px 0;padding:13px;border:1px solid #475569;border-radius:12px;background:#0f172acc;color:#e2e8f0;font-size:13px}.status-evidence label{display:flex;align-items:center;gap:9px}.status-evidence input[type=checkbox]{width:16px;height:16px;accent-color:#6366f1}.status-evidence .payment-method{align-items:flex-start;flex-direction:column;font-weight:700}.status-evidence select{width:100%;padding:9px 11px;border:1px solid #475569;border-radius:9px;background:#111827;color:#f8fafc}.status-evidence select:disabled{opacity:.55}.status-select:disabled{cursor:not-allowed;opacity:.62}</style>

<style scoped>
.refund-overlay{position:fixed;inset:0;z-index:145;display:grid;place-items:center;padding:18px;background:#020617c9;backdrop-filter:blur(12px)}.refund-modal{width:min(100%,480px);display:grid;gap:12px;padding:25px;border:1px solid #475569;border-radius:19px;background:linear-gradient(145deg,#172235,#0b1120);box-shadow:0 28px 90px #020617c9;color:#e2e8f0}.refund-eyebrow{color:#a5b4fc;font-size:10px;font-weight:800;letter-spacing:.15em}.refund-modal h2{margin:0;color:#f8fafc;font-size:23px}.refund-modal p{margin:0;color:#94a3b8;font-size:13px;line-height:1.5}.refund-modal label{margin-top:5px;color:#dbe3ee;font-size:13px;font-weight:700}.refund-modal textarea{width:100%;resize:vertical;padding:12px;border:1px solid #475569;border-radius:11px;background:#0b1120;color:#f8fafc;font:inherit;font-size:14px}.refund-modal textarea:focus{outline:0;border-color:#818cf8;box-shadow:0 0 0 3px #6366f126}.refund-modal footer{display:flex;justify-content:flex-end;gap:9px;margin-top:5px}.refund-modal .btn-primary,.refund-modal .btn-secondary{min-height:40px;padding:9px 13px;border-radius:10px;font-size:13px;font-weight:750;cursor:pointer}.refund-modal .btn-primary{border:0;background:#4f46e5;color:white}.refund-modal .btn-secondary{border:1px solid #475569;background:#1e293b;color:#dbe3ee}.refund-modal button:disabled{opacity:.55;cursor:wait}.refund-error{color:#fda4af!important}.refund-status{display:block;margin-top:5px;color:#c4b5fd;font-size:11px}.btn-icon--refund{border:1px solid #a78bfa55;background:#4c1d9533;color:#ddd6fe}.btn-icon--refund:hover{background:#5b21b6}
</style>
