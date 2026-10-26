<template>
  <main class="content">
    <header class="page-heading">
      <div><span class="eyebrow">ADMINISTRACI&Oacute;N</span><h1>Gesti&oacute;n de usuarios</h1><p>Consulta las cuentas y administra sus permisos.</p></div>
      <button class="primary" @click="startCreate">+ Nuevo usuario</button>
    </header>

    <section class="user-metrics" aria-label="Resumen de usuarios">
      <article class="metric-card"><span>Total de usuarios registrados</span><strong>{{ users.length }}</strong></article>
      <article class="metric-card"><span>Clientes activos</span><strong>{{ activeClients }}</strong></article>
      <article class="metric-card"><span>Administradores</span><strong>{{ adminCount }}</strong></article>
    </section>
    <label class="user-search"><span>Buscar por nombre o correo</span><input v-model.trim="searchQuery" type="search" placeholder="Nombre o correo electr&oacute;nico" autocomplete="off"></label>

    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-if="loading" class="muted">Cargando usuarios...</p>

    <form v-if="editing" class="form panel" @submit.prevent="save">
      <h2>{{ form._id ? 'Editar usuario' : 'Crear usuario' }}</h2>
      <label>Nombre<input v-model.trim="form.nombre" autocomplete="name" placeholder="Nombre completo" required minlength="3"></label>
      <label>Correo<input v-model.trim="form.email" type="email" autocomplete="email" placeholder="correo@ejemplo.com" required></label>
      <label>Contrase&ntilde;a<input v-model="form.password" type="password" :placeholder="form._id ? 'Dejar vac&iacute;o para conservarla' : 'M&iacute;nimo 8 caracteres'" :required="!form._id" minlength="8" autocomplete="new-password"></label>
      <label>Tel&eacute;fono<input v-model.trim="form.telefono" autocomplete="tel" placeholder="Tel&eacute;fono"></label>
      <label>Rol<select v-model="form.rol"><option value="cliente">Cliente</option><option value="admin">Administrador</option></select></label>
      <label>Estado<select v-model="form.estado"><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></label>
      <div class="form-actions"><button class="primary" :disabled="saving">{{ saving ? 'Guardando...' : 'Guardar usuario' }}</button><button type="button" class="secondary" @click="editing = false">Cancelar</button></div>
    </form>

    <div class="panel table-panel">
      <table>
        <thead><tr><th>Nombre</th><th>Correo</th><th>Rol actual</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>
          <tr v-for="user in visibleUsers" :key="user._id">
            <td class="user-name">{{ user.nombre }}</td><td>{{ user.email }}</td>
            <td><span class="role-badge" :class="user.rol === 'admin' ? 'role-admin' : 'role-client'">{{ user.rol === 'admin' ? 'Administrador' : 'Cliente' }}</span></td>
            <td><span class="status-badge" :class="user.estado === 'activo' ? 'status-active' : 'status-inactive'">{{ user.estado }}</span></td>
            <td class="actions"><button class="secondary small" @click="startEdit(user)">Editar</button><button class="danger small" @click="askRemove(user)">Eliminar</button></td>
          </tr>
          <tr v-if="!loading && !visibleUsers.length"><td colspan="5" class="empty">No hay usuarios que coincidan con la b&uacute;squeda.</td></tr>
        </tbody>
      </table>
    </div>

    <ConfirmModal :show="Boolean(userToDelete)" title="Confirmar eliminaci&oacute;n" :message="deleteMessage" :loading="deleting" @close="userToDelete = null" @confirm="removeUser" />
    <Transition name="toast"><div v-if="notice" class="toast" role="status">{{ notice }}</div></Transition>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import api from '../services/api'
import ConfirmModal from '../components/ConfirmModal.vue'

const users = ref([]), loading = ref(true), saving = ref(false), editing = ref(false), deleting = ref(false)
const error = ref(''), notice = ref(''), userToDelete = ref(null)
const searchQuery = ref('')
let noticeTimer
const form = reactive({ _id: '', nombre: '', email: '', password: '', telefono: '', rol: 'cliente', estado: 'activo' })
const activeClients = computed(() => users.value.filter(user => user.rol === 'cliente' && user.estado === 'activo').length)
const adminCount = computed(() => users.value.filter(user => user.rol === 'admin').length)
const visibleUsers = computed(() => {
  const query = searchQuery.value.toLocaleLowerCase('es')
  const principal = users.value.find(user => user.rol === 'admin' && /admin/i.test(user.email || ''))
    || [...users.value].filter(user => user.rol === 'admin').sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0]
  return users.value
    .filter(user => `${user.nombre || ''} ${user.email || ''}`.toLocaleLowerCase('es').includes(query))
    .sort((a, b) => {
      if (String(a._id) === String(principal?._id)) return -1
      if (String(b._id) === String(principal?._id)) return 1
      if (a.rol !== b.rol) return a.rol === 'admin' ? -1 : 1
      return String(a.nombre).localeCompare(String(b.nombre), 'es')
    })
})
const deleteMessage = computed(() => userToDelete.value ? `Se eliminará la cuenta de ${userToDelete.value.nombre} (${userToDelete.value.email}). Esta acción no se puede deshacer.` : '')

function toast(message) { notice.value = message; clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { notice.value = '' }, 3200) }
async function load() {
  loading.value = true; error.value = ''
  try { users.value = (await api.get('/usuarios')).data }
  catch (e) { error.value = e.response?.data?.mensaje || 'No se pudieron cargar los usuarios.' }
  finally { loading.value = false }
}
function reset() { Object.assign(form, { _id: '', nombre: '', email: '', password: '', telefono: '', rol: 'cliente', estado: 'activo' }) }
function startCreate() { reset(); editing.value = true }
function startEdit(user) { Object.assign(form, user, { _id: user._id, password: '' }); editing.value = true }
async function save() {
  saving.value = true; error.value = ''
  const data = { ...form }; if (!data.password) delete data.password
  try {
    if (form._id) await api.put(`/usuarios/${form._id}`, data)
    else await api.post('/usuarios', data)
    editing.value = false; await load(); toast(form._id ? 'Usuario actualizado.' : 'Usuario creado.')
  } catch (e) { error.value = e.response?.data?.mensaje || 'No se pudo guardar el usuario.' }
  finally { saving.value = false }
}
function askRemove(user) { userToDelete.value = user }
async function removeUser() {
  if (!userToDelete.value) return
  deleting.value = true; error.value = ''
  try { await api.delete(`/usuarios/${userToDelete.value._id}`); userToDelete.value = null; await load(); toast('Usuario eliminado.') }
  catch (e) { error.value = e.response?.data?.mensaje || 'No se pudo eliminar el usuario.' }
  finally { deleting.value = false }
}
onMounted(load)
</script>

<style scoped>
.content{min-height:100%;padding:36px;display:flex;flex-direction:column;gap:22px;color:#e2e8f0}.page-heading{display:flex;justify-content:space-between;align-items:center;gap:18px}.page-heading h1{margin:7px 0;font-size:30px;font-weight:800;letter-spacing:-.035em;color:#f8fafc}.page-heading p,.muted{margin:0;color:#94a3b8;font-size:15px}.eyebrow{color:#a5b4fc;font-size:11px;font-weight:800;letter-spacing:.16em}.panel{background:linear-gradient(145deg,#172235eb,#111827ee);border:1px solid #334155;border-radius:16px;box-shadow:0 12px 32px #02061740}.primary,.secondary,.danger{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:9px 14px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;transition:background .18s,border-color .18s}.primary{border:0;background:#4f46e5;color:white}.primary:hover{background:#6366f1}.primary:disabled{opacity:.65;cursor:wait}.secondary{border:1px solid #475569;background:#1e293b;color:#dbe3ee}.secondary:hover{border-color:#818cf8}.danger{border:1px solid #7f1d1d;background:#450a0a70;color:#fda4af}.danger:hover{background:#7f1d1d}.table-panel{overflow-x:auto;padding:8px 16px}table{width:100%;min-width:680px;border-collapse:collapse}th,td{text-align:left;padding:15px 12px;border-bottom:1px solid #334155;font-size:14px}th{color:#94a3b8;font-size:12px;font-weight:700;letter-spacing:.04em}tbody tr:last-child td{border-bottom:0}.user-name{color:#f8fafc;font-weight:700}.role-badge,.status-badge{display:inline-flex;align-items:center;padding:5px 10px;border-radius:999px;font-size:12px;font-weight:700}.role-admin{background:#312e81;color:#c7d2fe;border:1px solid #6366f155}.role-client{background:#164e63;color:#a5f3fc;border:1px solid #0891b255}.status-active{background:#052e16;color:#86efac}.status-inactive{background:#334155;color:#cbd5e1}.actions{white-space:nowrap}.small{min-height:34px;padding:7px 10px;font-size:12px}.actions button+button{margin-left:8px}.empty{text-align:center;color:#94a3b8;padding:28px}.form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;padding:20px}.form h2{grid-column:1/-1;margin:0 0 2px;color:#f8fafc;font-size:19px}.form label{display:grid;gap:7px;color:#cbd5e1;font-size:13px;font-weight:700}.form input,.form select{width:100%;min-height:42px;padding:9px 11px;background:#0b1120;color:#f8fafc;border:1px solid #334155;border-radius:9px;font:inherit;font-weight:400}.form input:focus,.form select:focus{outline:0;border-color:#818cf8;box-shadow:0 0 0 3px #6366f126}.form-actions{grid-column:1/-1;display:flex;gap:10px}.error{margin:0;color:#fda4af;font-size:14px}.toast{position:fixed;z-index:120;right:24px;top:24px;padding:14px 18px;border:1px solid #4ade8080;border-radius:12px;background:#052e16;color:#bbf7d0;box-shadow:0 16px 36px #02061780;font-size:14px;font-weight:700}.toast-enter-active,.toast-leave-active{transition:opacity .2s,transform .2s}.toast-enter-from,.toast-leave-to{opacity:0;transform:translateY(-8px)}@media(max-width:700px){.content{padding:20px}.page-heading{align-items:flex-start;flex-direction:column}.form{grid-template-columns:1fr}.form h2,.form-actions{grid-column:1}}
.user-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.metric-card{display:grid;gap:10px;padding:18px 20px;border:1px solid #334155;border-radius:15px;background:linear-gradient(145deg,#172235eb,#111827ee);box-shadow:0 12px 32px #02061730}.metric-card span{color:#94a3b8;font-size:12px;font-weight:700}.metric-card strong{color:#f8fafc;font-size:28px;font-weight:850;line-height:1}@media(max-width:700px){.user-metrics{grid-template-columns:1fr}}.user-search{display:grid;gap:7px;color:#cbd5e1;font-size:12px;font-weight:700}.user-search input{width:min(100%,520px);min-height:42px;padding:10px 13px;border:1px solid #475569;border-radius:10px;background:#0f172a;color:#f8fafc;font:inherit;font-weight:400}.user-search input:focus{outline:0;border-color:#818cf8;box-shadow:0 0 0 3px #6366f126}</style>
