<template>
  <main class="profile-page">
    <header class="page-heading"><span class="eyebrow">TU ESPACIO DE VIAJE</span><h1>Mi perfil</h1><p>Personaliza tus datos y prepara cada aventura a tu manera.</p></header>
    <div class="profile-grid">
      <section class="traveler-card">
        <div class="traveler-top"><div class="avatar-ring"><div class="avatar">{{ initials }}</div></div><div><span class="eyebrow">VIAJERO SANGILERO</span><h2>{{ form.nombre || 'Tu perfil viajero' }}</h2><p>{{ form.ciudadOrigen || 'Cuéntanos de dónde vienes' }}</p><span class="role-badge">{{ user.rol === 'admin' ? 'Administrador' : 'Viajero explorador' }}</span></div></div>
        <div class="stats"><div><span class="stat-icon"><svg viewBox="0 0 24 24"><path d="M8 3v3m8-3v3M4 9h16M5 5h14v15H5z"/></svg></span><strong>{{ stats.totalReservas }}</strong><span>Aventuras reservadas</span></div><div><span class="stat-icon stat-icon--green"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/><circle cx="12" cy="12" r="9"/></svg></span><strong>{{ stats.reservasCompletadas }}</strong><span>Experiencias completadas</span></div></div>
        <div class="medal" :class="{ 'medal--earned': stats.reservasCompletadas > 0 }"><span class="medal-icon">✦</span><div><strong>{{ stats.reservasCompletadas > 0 ? 'Explorador de Santander' : 'Medalla de explorador' }}</strong><small>{{ stats.reservasCompletadas > 0 ? 'Desbloqueada · aventura completada' : 'Completa tu primera aventura para desbloquearla' }}</small></div></div>
      </section>

      <form class="form-card" @submit.prevent="save">
        <div class="section-heading"><div><span class="eyebrow">INFORMACIÓN PERSONAL</span><h2>Tu identidad viajera</h2></div><span class="secure-tag">PERFIL PRIVADO</span></div>
        <div class="form-grid">
          <label>Nombre completo<input v-model.trim="form.nombre" autocomplete="name" required minlength="3"></label>
          <label>Correo electrónico<input v-model.trim="form.email" type="email" autocomplete="email" required></label>
          <label>Teléfono<input v-model.trim="form.telefono" type="tel" autocomplete="tel"></label>
          <label>Ciudad de origen<input v-model.trim="form.ciudadOrigen" placeholder="Ej. Bucaramanga"></label>
          <label>Tipo de documento<select v-model="form.tipoDocumento"><option value="">Selecciona</option><option>Cédula de ciudadanía</option><option>Cédula de extranjería</option><option>Pasaporte</option><option>Tarjeta de identidad</option></select></label>
          <label>Número de documento<input v-model.trim="form.numeroDocumento" autocomplete="off"></label>
        </div>
        <div class="divider"></div>
        <section class="subsection"><div><h3>¿Qué aventuras te gustan?</h3><p>Usaremos tus intereses para personalizar el catálogo.</p></div><div class="interest-list"><label v-for="interest in interests" :key="interest" class="interest"><input v-model="form.intereses" type="checkbox" :value="interest"><span>{{ interest }}</span></label></div></section>
        <div class="divider"></div>
        <section class="subsection emergency"><div><h3>Contacto de emergencia</h3><p>Una persona de confianza para tus salidas.</p></div><div class="form-grid"><label>Nombre<input v-model.trim="form.contactoEmergenciaNombre" autocomplete="off"></label><label>Teléfono<input v-model.trim="form.contactoEmergenciaTelefono" type="tel" autocomplete="off"></label></div></section>
        <p v-if="message" class="feedback" :class="{ 'feedback--error': hasError }" role="status">{{ message }}</p>
        <footer><button class="save-button" :disabled="saving"><span v-if="saving" class="spinner"></span>{{ saving ? 'Guardando cambios…' : 'Guardar perfil' }}</button></footer>
      </form>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import api from '../services/api'

const stored = () => { try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} } }
const user = ref(stored())
const form = reactive({ nombre: user.value.nombre || '', email: user.value.email || '', telefono: '', tipoDocumento: '', numeroDocumento: '', ciudadOrigen: '', intereses: [], contactoEmergenciaNombre: '', contactoEmergenciaTelefono: '' })
const stats = reactive({ totalReservas: 0, reservasCompletadas: 0 })
const interests = ['Rafting', 'Parapente', 'Senderismo']
const message = ref(''), hasError = ref(false), saving = ref(false)
const initials = computed(() => (form.nombre || 'V').trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join(''))

function applyUser(data) {
  user.value = data
  for (const field of Object.keys(form)) form[field] = Array.isArray(data[field]) ? [...data[field]] : data[field] || (field === 'intereses' ? [] : '')
  stats.totalReservas = data.estadisticas?.totalReservas || 0
  stats.reservasCompletadas = data.estadisticas?.reservasCompletadas || 0
  localStorage.setItem('user', JSON.stringify({ ...stored(), ...data }))
}

onMounted(async () => {
  try { applyUser((await api.get('/auth/me')).data) }
  catch (error) { message.value = error.response?.data?.mensaje || 'No se pudo cargar el perfil.'; hasError.value = true }
})

async function save() {
  saving.value = true; message.value = ''; hasError.value = false
  try { applyUser((await api.put('/auth/profile', form)).data); message.value = 'Tu perfil viajero quedó actualizado.' }
  catch (error) { message.value = error.response?.data?.mensaje || 'No se pudo actualizar el perfil.'; hasError.value = true }
  finally { saving.value = false }
}
</script>

<style scoped>
.form-grid label{font-size:14px;font-weight:600}.form-grid input,.form-grid select{padding:12px 14px;font-size:15px}.subsection h3{font-size:15px}.subsection p{font-size:12px}.interest{font-size:12px}.save-button{padding:14px;font-size:14px}.section-heading h2{font-size:21px}.page-heading p{font-size:15px}
.profile-page{max-width:1380px;margin:0 auto;padding:40px 42px 64px;color:#f8fafc}.page-heading{margin-bottom:26px}.eyebrow{color:#a5b4fc;font-size:9px;font-weight:800;letter-spacing:.17em}.page-heading h1{margin:8px 0;font-size:32px;letter-spacing:-.04em}.page-heading p{color:#9aa8bb;font-size:13px}.profile-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:start;gap:24px}.traveler-card,.form-card{border:1px solid #334155;border-radius:19px;background:linear-gradient(145deg,#172235ec,#111827f5);box-shadow:0 18px 50px #02061755}.traveler-card{grid-column:span 1;position:sticky;top:24px;padding:22px}.form-card{grid-column:span 2;padding:24px}.traveler-top{display:flex;align-items:center;gap:14px;padding-bottom:21px}.traveler-top>div:last-child{min-width:0}.avatar-ring{width:88px;height:88px;flex:0 0 auto;padding:3px;display:grid;place-items:center;border-radius:28px;background:conic-gradient(from 140deg,#22d3ee,#6366f1,#c084fc,#22d3ee);box-shadow:0 10px 30px #4f46e545}.avatar{width:100%;height:100%;display:grid;place-items:center;border:3px solid #111827;border-radius:25px;background:linear-gradient(135deg,#4f46e5,#0e7490);color:white;font-size:28px;font-weight:800}.traveler-top h2{margin:6px 0 3px;font-size:16px}.traveler-top p{color:#9aa8bb;font-size:11px}.role-badge{display:inline-flex;margin-top:6px;padding:5px 8px;border:1px solid #818cf84a;border-radius:999px;background:#6366f11c;color:#c7d2fe;font-size:9px;font-weight:700}.stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:17px 0;border-top:1px solid #334155;border-bottom:1px solid #334155}.stats div{display:grid;grid-template-columns:36px 1fr;align-items:center;column-gap:8px}.stat-icon{grid-row:span 2;width:34px;height:34px;display:grid;place-items:center;border:1px solid #818cf838;border-radius:11px;background:#6366f118;color:#a5b4fc}.stat-icon svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}.stat-icon--green{border-color:#34d39938;background:#34d39918;color:#6ee7b7}.stats strong{font-size:22px;letter-spacing:-.04em}.stats div>span:last-child{color:#94a3b8;font-size:9px;line-height:1.35}.medal{display:flex;align-items:center;gap:12px;margin-top:16px;padding:13px;border:1px solid #475569;border-radius:13px;background:#0b112080}.medal--earned{border-color:#fbbf2470;background:linear-gradient(120deg,#fbbf2415,#0b112080)}.medal-icon{width:32px;height:32px;display:grid;place-items:center;border-radius:50%;background:#64748b35;color:#94a3b8;font-size:19px}.medal--earned .medal-icon{background:#fbbf2424;color:#fcd34d}.medal div{display:grid;gap:4px}.medal strong{font-size:10px}.medal small{color:#94a3b8;font-size:9px;line-height:1.4}.section-heading{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:21px}.section-heading h2{margin:6px 0 0;font-size:18px}.secure-tag{padding:6px 8px;border:1px solid #334155;border-radius:999px;color:#94a3b8;font-size:8px;font-weight:700;letter-spacing:.08em}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:15px}.form-grid label{display:grid;gap:7px;color:#cbd5e1;font-size:11px;font-weight:650}.form-grid input,.form-grid select{width:100%;min-width:0;padding:11px 12px;border:1px solid #334155;border-radius:10px;background:#0b1120b8;color:#f8fafc;font:inherit;font-weight:400;font-size:12px}.form-grid input:focus,.form-grid select:focus{outline:0;border-color:#818cf8;box-shadow:0 0 0 3px #6366f126}.form-grid input::placeholder{color:#64748b}.divider{height:1px;margin:22px 0;background:linear-gradient(90deg,transparent,#475569,transparent)}.subsection{display:grid;grid-template-columns:.8fr 1.2fr;gap:20px}.subsection h3{margin:0 0 5px;font-size:12px}.subsection p{color:#94a3b8;font-size:10px;line-height:1.5}.interest-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.interest{min-height:55px;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:9px 11px;border:1px solid #334155;border-radius:13px;background:#0b112080;color:#cbd5e1;font-size:10px;cursor:pointer;transition:background .18s,border-color .18s,color .18s}.interest:has(input:checked){border-color:#818cf8;background:linear-gradient(135deg,#4f46e533,#4338ca18);color:#e0e7ff;box-shadow:0 0 0 2px #6366f11a}.interest input{width:14px;height:14px;accent-color:#6366f1}.emergency{grid-template-columns:.8fr 1.2fr}.feedback{margin:17px 0 0;color:#6ee7b7;font-size:11px}.feedback--error{color:#fda4af}.form-card footer{display:flex;justify-content:flex-end;margin-top:19px}.save-button{width:100%;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:13px;border:0;border-radius:10px;background:#4f46e5;color:white;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 7px 18px #4338ca42;transition:background .18s,transform .18s}.save-button:hover:not(:disabled){background:#6366f1;transform:translateY(-1px)}.save-button:disabled{opacity:.65;cursor:wait}.spinner{width:13px;height:13px;border:2px solid #ffffff70;border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:1000px){.profile-grid{grid-template-columns:1fr 1.6fr;gap:16px}.traveler-card{position:static}.avatar-ring{width:72px;height:72px}.avatar{font-size:23px}.stats{grid-template-columns:1fr}}@media(max-width:760px){.profile-grid{grid-template-columns:1fr}.traveler-card,.form-card{grid-column:auto}}@media(max-width:600px){.profile-page{padding:25px 17px 42px}.form-card{padding:18px}.form-grid{grid-template-columns:1fr}.subsection,.emergency{grid-template-columns:1fr;gap:12px}.interest-list{grid-template-columns:1fr}.page-heading h1{font-size:27px}.traveler-top{align-items:flex-start}}
</style>
