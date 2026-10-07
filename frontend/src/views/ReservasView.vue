<template>
  <div class="dashboard">
    <aside class="sidebar">
      <div class="sidebar__brand">
        <span class="brand-mark" aria-hidden="true"></span>
        <span>Sistema Sprint 2</span>
      </div>

      <nav class="sidebar__nav">
        <router-link to="/dashboard" class="sidebar__link">Resumen</router-link>
        <router-link to="/servicios" class="sidebar__link">Servicios</router-link>
        <router-link to="/reservas" class="sidebar__link sidebar__link--active">Reservas</router-link>
      </nav>

      <button class="sidebar__logout" @click="handleLogout">Cerrar sesión</button>
    </aside>

    <main class="content">
      <header class="content__header">
        <div>
          <h1>Gestión de Reservas y Citas</h1>
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

      <section v-else class="panel">
        <table class="reservas-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Servicio</th>
              <th>Fecha y Hora</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredReservas.length === 0">
              <td colspan="5" class="empty-cell">No se encontraron reservas.</td>
            </tr>
            <tr v-for="reserva in filteredReservas" :key="reserva.id">
              <td>
                <div class="font-bold">{{ reserva.clienteNombre }}</div>
                <div class="text-muted text-sm">{{ reserva.clienteEmail }}</div>
              </td>
              <td>{{ reserva.servicioNombre }}</td>
              <td>
                <div>{{ formatDate(reserva.fechaHora) }}</div>
                <div class="text-muted text-sm">{{ formatTime(reserva.fechaHora) }}</div>
              </td>
              <td>
                <span class="badge" :class="getBadgeClass(reserva.estado)">
                  {{ reserva.estado }}
                </span>
              </td>
              <td>
                <div class="action-buttons">
                  <select
                    :value="reserva.estado"
                    class="status-select"
                    @change="updateStatus(reserva, $event.target.value)"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="confirmada">Confirmar</option>
                    <option value="completada">Completar</option>
                    <option value="cancelada">Cancelar</option>
                  </select>
                  <button
                    class="btn-icon btn-icon--danger"
                    @click="openDeleteModal(reserva)"
                  >
                    Eliminar
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>

    <!-- Modal para confirmar eliminación/cancelación -->
    <ConfirmModal
      :show="showDeleteModal"
      title="¿Eliminar reserva?"
      :message="`¿Estás seguro de eliminar la cita de '${selectedReserva?.clienteNombre}'?`"
      :loading="deleting"
      @close="showDeleteModal = false"
      @confirm="handleConfirmDelete"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
import ConfirmModal from '../components/ConfirmModal.vue'

const router = useRouter()
const reservas = ref([])
const loading = ref(true)
const searchQuery = ref('')
const statusFilter = ref('todos')

const showDeleteModal = ref(false)
const selectedReserva = ref(null)
const deleting = ref(false)

async function fetchReservas() {
  loading.value = true
  try {
    const response = await api.get('/reservas')
    reservas.value = response.data
  } catch (error) {
    console.error('Error al cargar reservas:', error)
  } finally {
    loading.value = false
  }
}

onMounted(fetchReservas)

const filteredReservas = computed(() => {
  return reservas.value.filter((r) => {
    const matchesSearch =
      r.clienteNombre.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      r.servicioNombre.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesStatus =
      statusFilter.value === 'todos' || r.estado === statusFilter.value

    return matchesSearch && matchesStatus
  })
})

async function updateStatus(reserva, newStatus) {
  try {
    await api.patch(`/reservas/${reserva.id}`, { estado: newStatus })
    reserva.estado = newStatus
  } catch (error) {
    console.error('Error al actualizar estado:', error)
    alert('No se pudo actualizar el estado de la reserva.')
  }
}

function openDeleteModal(reserva) {
  selectedReserva.value = reserva
  showDeleteModal.value = true
}

async function handleConfirmDelete() {
  if (!selectedReserva.value) return
  deleting.value = true

  try {
    await api.delete(`/reservas/${selectedReserva.value.id}`)
    showDeleteModal.value = false
    await fetchReservas()
  } catch (error) {
    console.error('Error al eliminar reserva:', error)
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
      return 'badge--info'
    case 'completada':
      return 'badge--success'
    case 'cancelada':
      return 'badge--error'
    default:
      return 'badge--warning'
  }
}

function openCreateModal() {
  // Espacio para emitir o redirigir al formulario de agendamiento
  alert('Función de agendamiento manual disponible en la versión extendida.')
}

function handleLogout() {
  localStorage.removeItem('token')
  router.push('/')
}
</script>

<style scoped>
.dashboard {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 240px 1fr;
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
</style>