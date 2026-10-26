<template>
  <Teleport to="body"><div v-if="show" class="overlay" @click.self="close">
    <section class="modal" role="dialog" aria-modal="true" :aria-labelledby="'service-modal-title'">
      <header class="modal-head"><div><span class="eyebrow">CAT&Aacute;LOGO DE AVENTURA</span><h2 id="service-modal-title">{{ isEditing ? 'Editar servicio' : 'Crear servicio' }}</h2><p>Configura la experiencia, su precio y las condiciones para los viajeros.</p></div><button class="close" type="button" aria-label="Cerrar" @click="close">&times;</button></header>
      <form @submit.prevent="submit">
        <div class="grid two">
          <label class="field wide">Nombre del servicio<input v-model.trim="form.nombre" required maxlength="120" placeholder="Ej. Rafting en el r&iacute;o Fonce"></label>
          <label class="field">Categor&iacute;a<select v-model="form.categoria" required><option v-for="category in categories" :key="category" :value="category">{{ category }}</option></select></label>
          <label class="field">Estado<select v-model="form.estado"><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></label>
          <label class="field">Precio por persona (COP)<input :value="priceInput" type="text" inputmode="numeric" autocomplete="off" required placeholder="70.000" aria-label="Precio por persona en pesos colombianos" @input="updatePrice"></label>
          <label class="field">Duraci&oacute;n (minutos)<input v-model.number="form.duracion" type="number" min="1" step="1" required placeholder="120"></label>
          <label class="field wide">URL de imagen<input v-model.trim="form.imageUrl" type="url" maxlength="500" placeholder="https://images.unsplash.com/..."></label>
          <label class="field wide">Descripci&oacute;n<textarea v-model.trim="form.descripcion" rows="3" maxlength="1000" placeholder="Describe lo que vivir&aacute; el grupo."></textarea></label>
          <label class="field wide">Requisitos f&iacute;sicos<textarea v-model.trim="form.requisitosFisicos" rows="2" maxlength="500" placeholder="Condici&oacute;n f&iacute;sica, experiencia o equipo personal requerido."></textarea></label>
          <label class="field wide">Restricciones de edad<textarea v-model.trim="form.restriccionesEdad" rows="2" maxlength="300" placeholder="Edad m&iacute;nima, restricciones de salud o acompa&ntilde;amiento."></textarea></label>
          <label class="field wide">Qu&eacute; incluye<textarea v-model.trim="form.incluye" rows="2" maxlength="500" placeholder="Equipo, gu&iacute;a, transporte, refrigerio, seguro..."></textarea></label>
        </div>
        <p v-if="formError" class="error" role="alert">{{ formError }}</p>
        <footer><button class="secondary" type="button" @click="close">Cancelar</button><button class="primary" type="submit" :disabled="submitting">{{ submitting ? 'Guardando...' : (isEditing ? 'Guardar cambios' : 'Crear servicio') }}</button></footer>
      </form>
    </section>
  </div></Teleport>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { formatCOPNumber, parseCOP } from '../utils/currency'

const props = defineProps({ show: Boolean, serviceData: { type: Object, default: null }, submitting: Boolean, formError: { type: String, default: '' } })
const emit = defineEmits(['close', 'save'])
const categories = ['Ríos y Agua', 'Alturas y Aire', 'Caminatas y Cuevas']
const isEditing = ref(false)
const priceInput = ref('')
const blankForm = () => ({ id: null, nombre: '', descripcion: '', imageUrl: '', categoria: 'Ríos y Agua', precio: '', duracion: '', estado: 'activo', requisitosFisicos: '', restriccionesEdad: '', incluye: '' })
const form = reactive(blankForm())

watch(() => [props.show, props.serviceData], () => {
  Object.assign(form, blankForm())
  priceInput.value = ''
  isEditing.value = Boolean(props.serviceData)
  if (props.serviceData) {
    Object.assign(form, { ...blankForm(), ...props.serviceData, id: props.serviceData._id || props.serviceData.id })
    priceInput.value = formatCOPNumber(form.precio)
  }
}, { immediate: true })

function close() { emit('close') }
function updatePrice(event) {
  const input = event.target
  const caret = input.selectionStart ?? input.value.length
  const digitsBeforeCaret = input.value.slice(0, caret).replace(/\D/g, '').length
  const parsed = parseCOP(input.value)
  const formatted = parsed === '' ? '' : formatCOPNumber(parsed)
  priceInput.value = formatted
  form.precio = parsed
  input.value = formatted
  let position = 0, digitsSeen = 0
  while (position < formatted.length && digitsSeen < digitsBeforeCaret) {
    if (/\d/.test(formatted[position])) digitsSeen++
    position++
  }
  input.setSelectionRange(position, position)
}
function submit() {
  const price = parseCOP(form.precio)
  if (!form.nombre.trim() || price === '' || !Number.isFinite(Number(price)) || Number(price) < 0 || !Number.isInteger(Number(form.duracion)) || Number(form.duracion) < 1) return
  emit('save', { ...form, precio: Number(price), duracion: Number(form.duracion), isEditing: isEditing.value })
}
</script>

<style scoped>
.overlay{position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;padding:18px;background:#020617b8;backdrop-filter:blur(12px)}.modal{width:min(100%,760px);max-height:calc(100dvh - 36px);overflow-y:auto;overscroll-behavior:contain;padding:26px;border:1px solid #475569a8;border-radius:20px;background:linear-gradient(145deg,#172235f7,#0e1726f8);box-shadow:0 28px 90px #020617bd}.modal-head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:22px}.eyebrow{color:#a5b4fc;font-size:10px;font-weight:800;letter-spacing:.16em}.modal h2{margin:8px 0 5px;color:#f8fafc;font-size:26px;font-weight:800;letter-spacing:-.03em}.modal-head p{margin:0;color:#94a3b8;font-size:14px;line-height:1.5}.close{border:0;background:none;color:#cbd5e1;font-size:28px;line-height:1;cursor:pointer}.grid{display:grid;gap:15px}.two{grid-template-columns:repeat(2,minmax(0,1fr))}.wide{grid-column:1/-1}.field{display:grid;gap:7px;color:#dbe3ee;font-size:13px;font-weight:700}.field input,.field select,.field textarea{width:100%;min-width:0;padding:11px 13px;border:1px solid #334155;border-radius:10px;background:#0b1120;color:#f8fafc;font:inherit;font-size:14px;font-weight:400}.field textarea{resize:vertical;line-height:1.5}.field input:focus,.field select:focus,.field textarea:focus{outline:0;border-color:#818cf8;box-shadow:0 0 0 3px #6366f126}.field input::placeholder,.field textarea::placeholder{color:#64748b}.error{margin:15px 0 0;color:#fda4af;font-size:14px}footer{display:flex;justify-content:flex-end;gap:10px;margin-top:22px;padding-top:16px;border-top:1px solid #334155}.primary,.secondary{min-height:42px;padding:10px 15px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer}.primary{border:0;background:#4f46e5;color:#fff}.primary:hover{background:#6366f1}.primary:disabled{opacity:.65;cursor:wait}.secondary{border:1px solid #475569;background:#1e293b;color:#dbe3ee}@media(max-width:600px){.modal{padding:20px}.two{grid-template-columns:1fr}.wide{grid-column:auto}.modal h2{font-size:23px}}
</style>
