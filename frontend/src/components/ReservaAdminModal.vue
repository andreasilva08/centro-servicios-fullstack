<template>
  <div v-if="show" class="overlay" @click.self="close">
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="office-title">
      <header class="head"><div><span class="eyebrow">VENTA EN OFICINA · SAN GIL</span><h2 id="office-title">Nueva reserva presencial</h2><p>Registra una llamada o atención en mostrador. Si anotas un pago, se confirma y emite ticket QR.</p></div><button class="close" aria-label="Cerrar" @click="close">&times;</button></header>
      <form @submit.prevent="submit">
        <fieldset class="client-kind"><legend>Cliente</legend><label><input v-model="clientType" type="radio" value="existing"> Cliente registrado</label><label><input v-model="clientType" type="radio" value="guest"> Datos rápidos de oficina</label></fieldset>
        <label v-if="clientType === 'existing'" class="field">Seleccionar cliente<select v-model="form.usuario" required><option value="" disabled>Elige un cliente activo</option><option v-for="user in clients" :key="user._id" :value="user._id">{{ user.nombre }} · {{ user.email }}</option></select></label>
        <div v-else class="grid two"><label class="field">Nombre completo<input v-model.trim="form.clienteInvitado.nombre" required maxlength="100" placeholder="Nombre del viajero"></label><label class="field">Teléfono<input v-model.trim="form.clienteInvitado.telefono" type="tel" maxlength="30" placeholder="Celular de contacto"></label><label class="field wide">Correo<input v-model.trim="form.clienteInvitado.email" type="email" maxlength="150" placeholder="correo@ejemplo.com"></label><small class="hint wide">Para identificar una venta de oficina, registra al menos teléfono o correo.</small></div>
        <div class="grid two">
          <label class="field wide">Experiencia<select v-model="form.servicio" required><option value="" disabled>Selecciona una experiencia</option><option v-for="service in activeServices" :key="service._id" :value="service._id">{{ service.nombre }} · {{ currency(service.precio) }} · {{ service.duracion }} min</option></select></label>
          <label class="field">Fecha<input v-model="form.fecha" type="date" :min="today" required></label><label class="field">Hora<input v-model="form.hora" type="time" required></label>
          <label class="field">Participantes<input v-model.number="form.participantes" type="number" min="1" max="20" step="1" required></label><label class="field">Nivel de experiencia<select v-model="form.nivelExperiencia"><option>Principiante</option><option>Intermedio</option><option>Avanzado</option><option>Experto</option></select></label>
          <label class="insurance wide"><input v-model="form.seguroMedico" type="checkbox"><span>Incluir seguro de aventura <small>+$15.000 COP por participante</small></span></label>
          <label class="field wide">Notas para el guía<textarea v-model.trim="form.observaciones" rows="2" maxlength="500" placeholder="Observaciones o acuerdos de la venta"></textarea></label>
        </div>
        <div class="payment-box"><label class="payment-toggle"><input v-model="form.pagoDirecto" type="checkbox"><span>Pago recibido en oficina</span></label><label v-if="form.pagoDirecto" class="field">Método de pago<select v-model="form.metodoPago" required><option value="efectivo">Efectivo</option><option value="tarjeta">Tarjeta en datáfono</option><option value="transferencia">Transferencia</option><option value="nequi">Nequi</option><option value="daviplata">DaviPlata</option><option value="pse">PSE</option></select></label><p>{{ form.pagoDirecto ? 'La reserva quedará confirmada y se generará el ticket QR.' : 'La reserva quedará pendiente de pago.' }}</p></div>
        <div class="total"><span>Total estimado</span><strong>{{ currency(total) }}</strong></div>
        <p v-if="displayError" class="error" role="alert">{{ displayError }}</p>
        <footer><button type="button" class="secondary" @click="close">Cancelar</button><button type="submit" class="primary" :disabled="submitting">{{ submitting ? 'Guardando...' : 'Registrar reserva' }}</button></footer>
      </form>
    </section>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { formatCOP } from '../utils/currency'
const props = defineProps({ show: Boolean, clients: { type: Array, default: () => [] }, services: { type: Array, default: () => [] }, submitting: Boolean, error: { type: String, default: '' } })
const emit = defineEmits(['close', 'save'])
const clientType = ref('existing')
const localError = ref('')
const blank = () => ({ usuario: '', clienteInvitado: { nombre: '', email: '', telefono: '' }, servicio: '', fecha: '', hora: '', participantes: 1, nivelExperiencia: 'Principiante', seguroMedico: false, observaciones: '', pagoDirecto: false, metodoPago: 'efectivo' })
const form = reactive(blank())
const activeServices = computed(() => props.services.filter(service => service.estado === 'activo'))
const selectedService = computed(() => activeServices.value.find(service => String(service._id) === String(form.servicio)))
const total = computed(() => ((Number(selectedService.value?.precio) || 0) + (form.seguroMedico ? 15000 : 0)) * Number(form.participantes || 1))
const displayError = computed(() => localError.value || props.error)
const now = new Date()
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
watch(() => props.show, visible => { if (visible) { Object.assign(form, blank()); clientType.value = 'existing'; localError.value = '' } })
function currency(value) { return formatCOP(value) }
function close() { emit('close') }
function submit() {
  localError.value = ''
  if (!form.servicio || !form.fecha || !form.hora || !Number.isInteger(Number(form.participantes)) || form.participantes < 1 || form.participantes > 20) { localError.value = 'Selecciona servicio, fecha, hora y de 1 a 20 participantes.'; return }
  const fechaHora = new Date(`${form.fecha}T${form.hora}`)
  if (Number.isNaN(fechaHora.getTime()) || fechaHora <= new Date()) { localError.value = 'La fecha y hora deben ser futuras.'; return }
  if (clientType.value === 'existing' && !form.usuario) { localError.value = 'Selecciona el cliente registrado.'; return }
  if (clientType.value === 'guest' && (!form.clienteInvitado.nombre.trim() || (!form.clienteInvitado.email.trim() && !form.clienteInvitado.telefono.trim()))) { localError.value = 'Indica el nombre y al menos un teléfono o correo.'; return }
  const payload = { ...form, fechaHora: fechaHora.toISOString() }
  if (clientType.value === 'guest') delete payload.usuario
  else delete payload.clienteInvitado
  emit('save', payload)
}
</script>

<style scoped>
.overlay{position:fixed;inset:0;z-index:125;display:grid;place-items:center;padding:16px;background:#020617c9;backdrop-filter:blur(11px)}.modal{width:min(100%,700px);max-height:calc(100vh - 32px);overflow:auto;padding:24px;border:1px solid #475569;border-radius:20px;background:linear-gradient(145deg,#172235,#0b1120);box-shadow:0 28px 80px #020617c9;color:#e2e8f0}.head{display:flex;justify-content:space-between;gap:18px;margin-bottom:18px}.eyebrow{color:#a5b4fc;font-size:9px;font-weight:800;letter-spacing:.15em}.head h2{margin:7px 0;color:#f8fafc;font-size:23px}.head p{margin:0;color:#94a3b8;font-size:12px;line-height:1.5}.close{border:0;background:none;color:#cbd5e1;font-size:26px;cursor:pointer}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.wide{grid-column:1/-1}.client-kind{display:flex;flex-wrap:wrap;gap:14px;margin:0 0 14px;padding:12px;border:1px solid #334155;border-radius:11px}.client-kind legend{padding:0 5px;color:#c7d2fe;font-size:12px;font-weight:750}.client-kind label,.payment-toggle{display:flex;align-items:center;gap:8px;color:#dbe3ee;font-size:12px;font-weight:650}.client-kind input,.payment-toggle input,.insurance input{accent-color:#6366f1}.field{display:grid;gap:6px;margin-bottom:13px;color:#dbe3ee;font-size:12px;font-weight:700}.grid .field{margin:0}.field input,.field select,.field textarea{width:100%;min-width:0;min-height:41px;padding:9px 11px;border:1px solid #334155;border-radius:9px;background:#080e1b;color:#f8fafc;font:inherit;font-weight:400}.field textarea{resize:vertical}.field input:focus,.field select:focus,.field textarea:focus{outline:0;border-color:#818cf8;box-shadow:0 0 0 3px #6366f122}.hint{color:#94a3b8;font-size:10px}.insurance{grid-column:1/-1;display:flex;align-items:center;gap:9px;padding:11px;border:1px solid #334155;border-radius:10px;color:#e2e8f0;font-size:12px;font-weight:700}.insurance small{display:block;margin-top:4px;color:#94a3b8;font-size:10px;font-weight:400}.payment-box{display:grid;gap:11px;margin-top:15px;padding:13px;border:1px solid #475569;border-radius:12px;background:#0b112080}.payment-box p{margin:0;color:#94a3b8;font-size:11px}.total{display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding:13px;border:1px solid #6366f155;border-radius:11px;background:#312e8130}.total span{color:#cbd5e1;font-size:12px}.total strong{color:#e0e7ff;font-size:17px}.error{color:#fda4af;font-size:12px}footer{display:flex;justify-content:flex-end;gap:9px;margin-top:15px;padding-top:14px;border-top:1px solid #334155}.primary,.secondary{min-height:39px;padding:9px 13px;border-radius:9px;font-size:12px;font-weight:750;cursor:pointer}.primary{border:0;background:#4f46e5;color:white}.primary:disabled{opacity:.65;cursor:wait}.secondary{border:1px solid #475569;background:#1e293b;color:#dbe3ee}@media(max-width:520px){.modal{padding:18px}.grid{grid-template-columns:1fr}.wide,.insurance{grid-column:auto}.client-kind{display:grid}}
</style>
