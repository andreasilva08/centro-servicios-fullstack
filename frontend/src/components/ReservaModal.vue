<template>
  <div v-if="show" class="overlay" @click.self="$emit('close')">
    <section class="modal" role="dialog" aria-modal="true" :aria-label="reservationData ? 'Editar reserva' : 'Nueva reserva'">
      <header class="modal-header">
        <div><span class="eyebrow">SAN GIL · SANTANDER</span><h2>{{ reservationData ? 'Ajusta tu aventura' : 'Reserva tu experiencia' }}</h2><p>Prepara tu próxima escapada a la naturaleza.</p></div>
        <button class="close" type="button" aria-label="Cerrar" @click="$emit('close')">×</button>
      </header>
      <form @submit.prevent="submit">
        <div class="field field--wide"><label>Experiencia</label><div class="service-picker"><article v-if="selectedService" class="selected-service"><img :src="selectedService.imageUrl" alt=""/><span><strong>{{ selectedService.nombre }}</strong><small>{{ selectedService.categoria || 'San Gil' }} · {{ selectedService.duracion }} min · {{ currency(selectedService.precio) }}</small></span><button type="button" @click="clearServiceSelection">Cambiar</button></article><template v-else><div class="service-search-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg><input ref="serviceInput" id="service-search" v-model="serviceSearch" type="search" role="combobox" aria-label="Buscar experiencia" aria-autocomplete="list" :aria-expanded="serviceOpen" aria-controls="service-options" placeholder="Escribe o selecciona una experiencia de aventura..." autocomplete="off" @focus="serviceOpen = true" @keydown.down.prevent="serviceOpen = true" @keydown.esc="serviceOpen = false" @keydown.enter.prevent="selectFirstService" @input="onServiceSearch"></div><div v-if="serviceOpen" id="service-options" class="service-menu" role="listbox"><button v-for="service in filteredServiceOptions" :key="service._id || service.id" type="button" role="option" :aria-selected="String(form.servicio) === String(service._id || service.id)" :class="{ selected: String(form.servicio) === String(service._id || service.id) }" @mousedown.prevent="selectService(service)"><img :src="service.imageUrl" alt=""/><span><strong>{{ service.nombre }}</strong><small>{{ service.categoria || 'San Gil' }} · {{ service.duracion }} min</small></span><b>{{ currency(service.precio) }}</b></button><p v-if="!filteredServiceOptions.length" class="no-options">No encontramos experiencias con ese nombre.</p></div></template></div></div>
        <div class="field-grid">
          <label class="field">Fecha<div class="input-icon-wrap"><svg viewBox="0 0 24 24"><path d="M8 3v3m8-3v3M4 9h16M5 5h14v15H5z"/></svg><input v-model="form.fecha" type="date" :min="today" required></div></label>
          <label class="field">Hora<div class="input-icon-wrap"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><input v-model="form.hora" type="time" :min="minimumTime" required></div></label>
          <div class="field"><span>Participantes</span><div class="stepper"><button type="button" aria-label="Quitar participante" :disabled="form.participantes <= 1" @click="form.participantes--">−</button><output>{{ form.participantes }} <small>{{ form.participantes === 1 ? 'persona' : 'personas' }}</small></output><button type="button" aria-label="Agregar participante" :disabled="form.participantes >= 20" @click="form.participantes++">+</button></div></div>
          <div class="field experience-field"><span>Nivel de experiencia</span><div class="level-picker"><button type="button" class="level-trigger" :aria-expanded="levelOpen" @click="levelOpen = !levelOpen"><svg viewBox="0 0 24 24" aria-hidden="true"><path :d="levelIcon(form.nivelExperiencia)"/></svg><span>{{ form.nivelExperiencia }}</span><span class="chevron">⌄</span></button><div v-if="levelOpen" class="level-menu"><button v-for="level in levels" :key="level" type="button" :class="{ selected: form.nivelExperiencia === level }" @click="form.nivelExperiencia = level; levelOpen = false"><svg viewBox="0 0 24 24" aria-hidden="true"><path :d="levelIcon(level)"/></svg><span><strong>{{ level }}</strong><small>{{ levelDescription(level) }}</small></span></button></div></div></div>
        </div>
        <label class="insurance"><input v-model="form.seguroMedico" type="checkbox"><span><strong>Incluir seguro médico de aventura</strong><small>Cobertura opcional · {{ currency(insurancePrice) }} por participante</small></span><b>+{{ currency(insurancePrice) }}</b></label>
        <label class="field">Notas para el guía <span class="optional">OPCIONAL</span><textarea v-model="form.observaciones" rows="3" maxlength="500" placeholder="Cuéntanos si tienes alguna consideración para tu experiencia…"></textarea></label>
        <div v-if="selectedService" class="price-summary"><div><span>Resumen de tu aventura</span><small>{{ form.participantes }} × {{ currency(selectedService.precio) }}{{ form.seguroMedico ? ' + seguro' : '' }}</small></div><strong>{{ currency(totalPrice) }}</strong></div>
        <p v-if="displayError" class="error" role="alert">{{ displayError }}</p>
        <footer><button class="secondary" type="button" @click="$emit('close')">Cancelar</button><button class="primary" type="submit" :disabled="submitting"><span v-if="submitting" class="spinner"></span>{{ submitting ? 'Confirmando…' : 'Confirmar reserva' }}</button></footer>
      </form>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { formatCOP } from '../utils/currency'

const props = defineProps({ show: Boolean, services: { type: Array, default: () => [] }, reservationData: { type: Object, default: null }, submitting: Boolean, formError: { type: String, default: '' } })
const emit = defineEmits(['close', 'save'])
const form = reactive({ servicio: '', fecha: '', hora: '', participantes: 1, nivelExperiencia: 'Principiante', seguroMedico: false, observaciones: '' })
const localError = ref('')
const levelOpen = ref(false)
const serviceOpen = ref(false)
const serviceSearch = ref('')
const serviceInput = ref(null)
const levels = ['Principiante', 'Intermedio', 'Avanzado', 'Experto']
const insurancePrice = 15000
const now = new Date()
now.setSeconds(0, 0)
now.setMinutes(now.getMinutes() + 1)
const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
const minimumTime = computed(() => form.fecha === today ? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` : '00:00')
const selectedService = computed(() => props.services.find(service => String(service._id || service.id) === String(form.servicio)))
const filteredServiceOptions = computed(() => {
  const query = serviceSearch.value.trim().toLocaleLowerCase()
  if (!query) return props.services
  return props.services.filter(service => `${service.nombre} ${service.categoria || ''} ${service.descripcion || ''}`.toLocaleLowerCase().includes(query))
})
const totalPrice = computed(() => ((Number(selectedService.value?.precio) || 0) + (form.seguroMedico ? insurancePrice : 0)) * Number(form.participantes || 1))
const displayError = computed(() => localError.value || props.formError)

watch(() => [props.show, props.reservationData], () => {
  localError.value = ''
  serviceSearch.value = ''
  serviceOpen.value = false
  if (props.reservationData) {
    const date = new Date(props.reservationData.fechaHora || props.reservationData.fecha)
    form.servicio = props.reservationData.servicio?._id || props.reservationData.servicio || ''
    form.fecha = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    form.hora = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    form.participantes = props.reservationData.participantes || 1
    form.nivelExperiencia = props.reservationData.nivelExperiencia || 'Principiante'
    form.seguroMedico = props.reservationData.seguroMedico || false
    form.observaciones = props.reservationData.observaciones || ''
  } else {
    form.servicio = ''
    form.fecha = ''; form.hora = ''; form.participantes = 1; form.nivelExperiencia = 'Principiante'; form.seguroMedico = false; form.observaciones = ''
  }
}, { immediate: true })

function currency(value) { return formatCOP(value) }
function onServiceSearch() { serviceOpen.value = true; if (selectedService.value && serviceSearch.value !== selectedService.value.nombre) form.servicio = '' }
function selectService(service) { form.servicio = service._id || service.id; serviceSearch.value = ''; serviceOpen.value = false; localError.value = '' }
function selectFirstService() { if (filteredServiceOptions.value.length) selectService(filteredServiceOptions.value[0]) }
async function clearServiceSelection() { form.servicio = ''; serviceSearch.value = ''; serviceOpen.value = true; await nextTick(); serviceInput.value?.focus() }
function levelIcon(level) {
  if (level === 'Principiante') return 'M12 3v18m-7-9h14'
  if (level === 'Intermedio') return 'M3 17l6-6 4 4 8-9'
  if (level === 'Avanzado') return 'M3 20 10 5l4 8 2-4 5 11z'
  return 'm12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16v5m-2.5-2.5h5'
}
function levelDescription(level) { return ({ Principiante: 'Primera vez o nivel básico', Intermedio: 'Ya tienes algo de experiencia', Avanzado: 'Buscas un reto mayor', Experto: 'Experiencia técnica sólida' })[level] }
function submit() {
  const localDate = new Date(`${form.fecha}T${form.hora}`)
  if (!selectedService.value || !form.fecha || !form.hora || Number.isNaN(localDate.getTime()) || localDate <= new Date()) { localError.value = 'Selecciona una experiencia y una fecha y hora futuras.'; return }
  if (!Number.isInteger(Number(form.participantes)) || form.participantes < 1 || form.participantes > 20) { localError.value = 'Elige entre 1 y 20 participantes.'; return }
  localError.value = ''
  emit('save', { servicio: form.servicio, fechaHora: localDate.toISOString(), participantes: form.participantes, nivelExperiencia: form.nivelExperiencia, seguroMedico: form.seguroMedico, observaciones: form.observaciones.trim() })
}
</script>

<style scoped>
.overlay{position:fixed;inset:0;z-index:100;background:#020617b8;backdrop-filter:blur(12px);display:grid;place-items:center;padding:18px}.modal{width:min(100%,560px);max-height:calc(100vh - 36px);overflow:auto;padding:26px;background:linear-gradient(145deg,#172235f5,#0e1726f7);border:1px solid #475569a8;border-radius:21px;box-shadow:0 28px 90px #020617bd}.modal-header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:22px}.eyebrow{color:#a5b4fc;font-size:10px;font-weight:800;letter-spacing:.16em}.modal h2{margin:8px 0;font-size:23px;letter-spacing:-.025em}.modal-header p{color:#9aa8bb;font-size:14px}.close{border:0;background:transparent;color:#cbd5e1;font-size:26px;line-height:1;cursor:pointer}.modal form{display:grid;gap:15px}.field{display:grid;gap:7px;color:#d4dbe6;font-size:14px;font-weight:700}.field-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}.field input,.field select,.field textarea{width:100%;min-width:0;padding:11px 12px;background:#0b1120c9;color:#f8fafc;border:1px solid #334155;border-radius:10px;font:inherit;font-size:15px;font-weight:400}.field textarea{resize:vertical}.field input:focus,.field select:focus,.field textarea:focus{outline:0;border-color:#818cf8;box-shadow:0 0 0 3px #6366f126}.insurance{display:flex;align-items:center;gap:11px;padding:13px;border:1px solid #334155;border-radius:12px;background:#0b112080;cursor:pointer}.insurance>input{accent-color:#6366f1;width:16px;height:16px}.insurance span{display:grid;gap:4px;flex:1;color:#e2e8f0;font-size:13px}.insurance small{color:#94a3b8;font-weight:400;font-size:12px}.insurance b{color:#c7d2fe;font-size:11px;white-space:nowrap}.optional{margin-left:auto;color:#8291a8;font-size:8px;letter-spacing:.12em}.price-summary{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:13px 14px;border:1px solid #334155;border-radius:12px;background:#0b112080}.price-summary div{display:grid;gap:4px;color:#e2e8f0;font-size:14px}.price-summary small{color:#94a3b8;font-size:12px}.price-summary strong{color:#c7d2fe;font-size:17px;white-space:nowrap}.error{color:#fda4af;font-size:12px}footer{display:flex;justify-content:flex-end;gap:9px;margin-top:4px}.primary,.secondary{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:10px;padding:11px 15px;font-size:14px;font-weight:700;cursor:pointer;transition:background .18s,transform .18s}.primary{border:0;background:#4f46e5;color:white;box-shadow:0 6px 18px #4338ca40}.primary:hover:not(:disabled){background:#6366f1;transform:translateY(-1px)}.primary:disabled{opacity:.68;cursor:wait}.secondary{border:1px solid #475569;background:#1e293b;color:#dbe3ee}.spinner{width:14px;height:14px;border:2px solid #ffffff65;border-top-color:white;border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:480px){.modal{padding:20px}.field-grid{gap:10px}.modal h2{font-size:20px}}
.stepper{height:43px;display:flex;align-items:center;justify-content:space-between;padding:4px;border:1px solid #334155;border-radius:11px;background:#0b1120c9}.stepper button{width:33px;height:33px;border:1px solid #475569;border-radius:9px;background:#1e293b;color:#e0e7ff;font-size:19px;line-height:1;cursor:pointer}.stepper button:hover:not(:disabled){border-color:#818cf8;background:#312e81}.stepper button:disabled{opacity:.4;cursor:not-allowed}.stepper output{color:#f8fafc;font-size:12px;font-weight:700}.stepper output small{color:#94a3b8;font-size:10px;font-weight:400}.level-picker{position:relative}.level-trigger{width:100%;height:43px;display:flex;align-items:center;gap:9px;padding:0 12px;border:1px solid #334155;border-radius:11px;background:#0b1120c9;color:#e2e8f0;text-align:left;font:inherit;font-size:11px;cursor:pointer}.level-trigger svg,.level-menu svg{width:17px;height:17px;fill:none;stroke:#a5b4fc;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}.level-trigger .chevron{margin-left:auto;color:#94a3b8;font-size:17px}.level-menu{position:absolute;z-index:8;top:calc(100% + 7px);left:0;right:0;display:grid;padding:5px;border:1px solid #475569;border-radius:13px;background:#111827;box-shadow:0 16px 36px #020617a8}.level-menu button{display:flex;align-items:center;gap:10px;padding:9px;border:0;border-radius:9px;background:transparent;color:#e2e8f0;text-align:left;cursor:pointer}.level-menu button:hover,.level-menu button.selected{background:#312e815c}.level-menu button>span{display:grid;gap:3px}.level-menu strong{font-size:11px}.level-menu small{color:#94a3b8;font-size:9px}.insurance:has(input:checked){border-color:#818cf8;background:linear-gradient(110deg,#4f46e524,#0b112080);box-shadow:0 0 0 2px #6366f115}.price-summary{position:sticky;bottom:0;background:#111827ed;backdrop-filter:blur(12px);border-color:#6366f155;box-shadow:0 9px 25px #02061770}
.service-picker{position:relative}.service-trigger{width:100%;min-height:60px;display:flex;align-items:center;gap:11px;padding:8px 12px;border:1px solid #334155;border-radius:12px;background:#0b1120c9;color:#e2e8f0;text-align:left;cursor:pointer;transition:border-color .18s,background .18s}.service-trigger:hover,.service-trigger[aria-expanded=true]{border-color:#818cf8;background:#111827}.service-trigger>img,.service-menu img{width:44px;height:42px;flex:0 0 auto;object-fit:cover;border-radius:8px;background:#1e293b}.service-trigger-copy{min-width:0;display:grid;gap:5px;flex:1}.service-trigger-copy strong,.service-menu strong{overflow:hidden;color:#f1f5f9;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.service-trigger-copy small,.service-menu small{color:#94a3b8;font-size:9px}.service-trigger .chevron{margin-left:auto;color:#94a3b8}.service-menu{position:absolute;z-index:10;top:calc(100% + 7px);left:0;right:0;display:grid;gap:3px;max-height:270px;overflow-y:auto;padding:5px;border:1px solid #475569;border-radius:14px;background:#111827;box-shadow:0 18px 45px #020617cf}.service-menu button{display:flex;align-items:center;gap:10px;min-width:0;padding:7px;border:1px solid transparent;border-radius:10px;background:transparent;text-align:left;cursor:pointer}.service-menu button:hover,.service-menu button.selected{border-color:#818cf84a;background:#312e8140}.service-menu button>span{min-width:0;display:grid;gap:4px;flex:1}.service-menu button>b{color:#c7d2fe;font-size:9px;white-space:nowrap}.input-icon-wrap{position:relative}.input-icon-wrap>svg{display:none}.input-icon-wrap input{height:48px;padding:12px 14px;background:#0b1120;border-color:#334155;border-radius:12px;font-size:14px}.input-icon-wrap input::-webkit-calendar-picker-indicator{cursor:pointer;filter:invert(.8) sepia(.2) saturate(.8)}
.modal{font-size:15px}.modal h2{font-size:27px;font-weight:800}.modal-header p{font-size:14px}.field{font-size:14px;font-weight:650}.field input,.field select,.field textarea{padding:13px 14px;font-size:15px;border-radius:12px}.service-search-wrap{position:relative}.service-search-wrap>svg{position:absolute;z-index:1;top:50%;left:14px;width:19px;height:19px;transform:translateY(-50%);fill:none;stroke:#94a3b8;stroke-width:1.8;pointer-events:none}.service-search-wrap input{width:100%;height:54px;padding:12px 42px 12px 43px;border:1px solid #334155;border-radius:13px;background:#0b1120;color:#f8fafc;font:inherit;font-size:15px;font-weight:450;transition:border-color .18s,box-shadow .18s}.service-search-wrap input::placeholder{color:#8291a8}.service-search-wrap input:focus{outline:0;border-color:#818cf8;box-shadow:0 0 0 3px #6366f129}.service-search-wrap input::-webkit-search-cancel-button{filter:invert(.8);cursor:pointer}.service-menu{max-height:310px;padding:7px}.service-menu button{gap:12px;padding:9px}.service-menu img{width:52px;height:48px;border-radius:10px}.service-menu strong{font-size:13px}.service-menu small{font-size:11px}.service-menu button>b{font-size:12px}.no-options{margin:0;padding:16px 12px;color:#94a3b8;font-size:13px;text-align:center}.service-trigger-copy strong{font-size:14px}.service-trigger-copy small{font-size:11px}.level-trigger{height:48px;font-size:14px}.level-menu strong{font-size:13px}.level-menu small{font-size:11px}.stepper{height:48px}.stepper button{width:38px;height:38px;font-size:21px}.stepper output{font-size:14px}.stepper output small{font-size:12px}.insurance span{font-size:13px}.insurance small{font-size:11px}.insurance b{font-size:13px}.price-summary div{font-size:14px}.price-summary small{font-size:12px}.price-summary strong{font-size:20px}.primary,.secondary{padding:12px 17px;font-size:14px}.error{font-size:14px}
</style>

<style scoped>
.selected-service{min-height:68px;display:flex;align-items:center;gap:12px;padding:9px 11px;border:1px solid #818cf866;border-radius:13px;background:linear-gradient(110deg,#312e8144,#0b1120d9);box-shadow:0 8px 24px #02061740}.selected-service>img{width:52px;height:48px;flex:0 0 auto;object-fit:cover;border-radius:10px}.selected-service>span{min-width:0;display:grid;gap:5px;flex:1}.selected-service strong{overflow:hidden;color:#f8fafc;font-size:14px;text-overflow:ellipsis;white-space:nowrap}.selected-service small{color:#a5b4fc;font-size:11px}.selected-service button{padding:8px 11px;border:1px solid #6366f166;border-radius:9px;background:#312e81;color:#e0e7ff;font-size:12px;font-weight:750;cursor:pointer}.selected-service button:hover{background:#4338ca}
</style>
