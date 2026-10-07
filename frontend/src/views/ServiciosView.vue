<template>
  <div class="dashboard">
    <aside class="sidebar">
      <div class="sidebar__brand">
        <span class="brand-mark" aria-hidden="true"></span>
        <span>Sistema Sprint 2</span>
      </div>

      <nav class="sidebar__nav">
        <router-link to="/dashboard" class="sidebar__link">Resumen</router-link>
        <router-link to="/servicios" class="sidebar__link sidebar__link--active">Servicios</router-link>
      </nav>

      <button class="sidebar__logout" @click="handleLogout">Cerrar sesión</button>
    </aside>

    <main class="content">
      <header class="content__header">
        <div>
          <h1>Gestión de Servicios</h1>
          <p>Administra los servicios ofrecidos por el centro de atención.</p>
        </div>
        <button class="btn-primary" @click="openCreateModal">+ Nuevo servicio</button>
      </header>

      <div v-if="loading" class="loading-text">Cargando servicios…</div>

      <section v-else class="panel">
        <table class="services-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Precio</th>
              <th>Duración</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="services.length === 0">
              <td colspan="6" class="empty-cell">No hay servicios registrados.</td>
            </tr>
            <tr v-for="service in services" :key="service.id">
              <td class="font-bold">{{ service.nombre }}</td>
              <td class="text-muted">{{ service.descripcion || 'Sin descripción' }}</td>
              <td>${{ service.precio }}</td>
              <td>{{ service.duracion }} min</td>
              <td>
                <span class="badge" :class="service.estado === 'activo' ? 'badge--success' : 'badge--muted'">
                  {{ service.estado }}
                </span>
              </td>
              <td>
                <div class="action-buttons">
                  <button class="btn-icon" @click="openEditModal(service)">Editar</button>
                  <button class="btn-icon btn-icon--danger" @click="openDeleteModal(service)">Eliminar</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>

    <!-- Modales -->
    <ServicioModal
      :show="showModal"
      :service-data="selectedService"
      :submitting="submitting"
      :form-error="modalError"
      @close="showModal = false"
      @save="handleSaveService"
    />

    <ConfirmModal
      :show="showDeleteModal"
      title="¿Eliminar servicio?"
      :message="`¿Estás seguro de eliminar '${selectedService?.nombre}'? Esta acción no se puede deshacer.`"
      :loading="deleting"
      @close="showDeleteModal = false"
      @confirm="handleConfirmDelete"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
import ServicioModal from '../components/ServicioModal.vue'
import ConfirmModal from '../components/ConfirmModal.vue'

const router = useRouter()
const services = ref([])
const loading = ref(true)

const showModal = ref(false)
const showDeleteModal = ref(false)
const selectedService = ref(null)
const submitting = ref(false)
const deleting = ref(false)
const modalError = ref('')

async function fetchServices() {
  loading.value = true
  try {
    const response = await api.get('/servicios')
    services.value = response.data
  } catch (error) {
    console.error('Error al obtener servicios:', error)
  } finally {
    loading.value = false
  }
}

onMounted(fetchServices)

function openCreateModal() {
  selectedService.value = null
  modalError.value = ''
  showModal.value = true
}

function openEditModal(service) {
  selectedService.value = service
  modalError.value = ''
  showModal.value = true
}

function openDeleteModal(service) {
  selectedService.value = service
  showDeleteModal.value = true
}

async function handleSaveService(payload) {
  submitting.value = true
  modalError.value = ''

  try {
    if (payload.isEditing) {
      await api.put(`/servicios/${payload.id}`, payload)
    } else {
      await api.post('/servicios', payload)
    }
    showModal.value = false
    await fetchServices()
  } catch (error) {
    modalError.value = error.response?.data?.message || 'Error al guardar el servicio.'
  } finally {
    submitting.value = false
  }
}

async function handleConfirmDelete() {
  if (!selectedService.value) return
  deleting.value = true

  try {
    await api.delete(`/servicios/${selectedService.value.id}`)
    showDeleteModal.value = false
    await fetchServices()
  } catch (error) {
    console.error('Error al eliminar:', error)
  } finally {
    deleting.value = false
  }
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
  gap: 32px;
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

.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px;
  overflow-x: auto;
}

.services-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 14px;
}

.services-table th,
.services-table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}

.services-table th {
  color: var(--text-muted);
  font-weight: 500;
}

.badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  text-transform: capitalize;
}

.badge--success {
  background: rgba(62, 207, 142, 0.15);
  color: var(--success);
}

.badge--muted {
  background: var(--surface-raised);
  color: var(--text-muted);
}

.action-buttons {
  display: flex;
  gap: 8px;
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