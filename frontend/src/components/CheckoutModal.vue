<template>
  <div v-if="show" class="overlay" @click.self="close">
    <section class="checkout" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
      <header class="head"><div><span class="eyebrow">PAGO SEGURO</span><h2 id="checkout-title">Confirma tu aventura</h2><p>Elige como realizar el pago. Efectivo y transferencias requieren validacion del equipo.</p></div><button class="close" aria-label="Cerrar" @click="close">&times;</button></header>
      <div class="summary"><div><strong>{{ reservation?.servicio?.nombre || reservation?.servicioNombre || 'Experiencia de aventura' }}</strong><small>{{ formattedDate }} · {{ participants }} {{ participants === 1 ? 'participante' : 'participantes' }}</small></div><b>{{ currency(reservation?.precioTotal) }}</b></div>
      <div class="methods" role="tablist" aria-label="Metodo de pago"><button v-for="option in methods" :key="option.id" type="button" role="tab" :aria-selected="method === option.id" :class="{ active: method === option.id }" @click="method = option.id"><span>{{ option.icon }}</span>{{ option.label }}</button></div>
      <form @submit.prevent="submit">
        <template v-if="method === 'tarjeta'">
          <label>Numero de tarjeta<input v-model="cardNumber" inputmode="numeric" autocomplete="cc-number" placeholder="0000 0000 0000 0000" maxlength="19" @input="formatCard"></label>
          <div class="split"><label>Vencimiento<input v-model="expiry" inputmode="numeric" autocomplete="cc-exp" placeholder="MM/AA" maxlength="5" @input="formatExpiry"></label><label>CVV<input v-model="cvv" type="password" inputmode="numeric" autocomplete="cc-csc" placeholder="•••" maxlength="4" @input="cvv = cvv.replace(/\D/g, '').slice(0, 4)"></label></div>
        </template>
        <template v-else-if="method === 'transferencia'">
          <label>Referencia del comprobante bancario<input v-model.trim="transferReference" maxlength="120" placeholder="Codigo de confirmacion bancaria" autocomplete="off"></label>
          <p class="method-note">La transferencia quedara pendiente hasta que el administrador valide la referencia.</p>
        </template>
        <template v-else-if="method === 'efectivo'">
          <div class="offline-note"><strong>Pago presencial en San Gil</strong><span>La reserva quedara pendiente de validacion hasta confirmar el pago en oficina.</span></div>
        </template>
        <template v-else>
          <label>Celular registrado<input v-model="phone" type="tel" inputmode="numeric" autocomplete="tel" placeholder="300 000 0000" maxlength="13" @input="phone = phone.replace(/[^\d+ ]/g, '').slice(0, 13)"></label>
          <p class="method-note">{{ method === 'pse' ? 'Usaremos el celular registrado para identificar el pago de prueba.' : `Recibiras una solicitud simulada de pago por ${method === 'nequi' ? 'Nequi' : 'DaviPlata'}.` }}</p>
        </template>
        <p v-if="error || formError" class="error" role="alert">{{ error || formError }}</p>
        <p class="privacy">Simulacion de pago. Los datos de tarjeta nunca se guardan.</p>
        <footer><button class="secondary" type="button" @click="close">Pagar despues</button><button class="primary" type="submit" :disabled="submitting"><span v-if="submitting" class="spinner"></span>{{ submitting ? 'Procesando...' : submitLabel }}</button></footer>
      </form>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { formatCOP } from '../utils/currency'

const props = defineProps({ show: Boolean, reservation: { type: Object, default: null }, submitting: Boolean, formError: { type: String, default: '' }, registeredPhone: { type: String, default: '' } })
const emit = defineEmits(['close', 'pay'])
const methods = [
  { id: 'tarjeta', label: 'Tarjeta', icon: 'CC' }, { id: 'pse', label: 'PSE', icon: 'P' },
  { id: 'nequi', label: 'Nequi', icon: 'N' }, { id: 'daviplata', label: 'DaviPlata', icon: 'D' },
  { id: 'efectivo', label: 'Efectivo', icon: '$' }, { id: 'transferencia', label: 'Transferencia', icon: '↗' }
]
const method = ref('tarjeta'), cardNumber = ref(''), expiry = ref(''), cvv = ref(''), phone = ref(''), transferReference = ref(''), error = ref('')
const participants = computed(() => props.reservation?.participantes || 1)
const submitLabel = computed(() => method.value === 'efectivo' ? 'Registrar pago en oficina' : method.value === 'transferencia' ? 'Enviar comprobante' : `Pagar ${currency(props.reservation?.precioTotal)}`)
const formattedDate = computed(() => { const date = new Date(props.reservation?.fechaHora || props.reservation?.fecha); return Number.isNaN(date.getTime()) ? 'Fecha por confirmar' : date.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) })
watch(() => props.show, visible => { if (visible) { method.value = 'tarjeta'; cardNumber.value = ''; expiry.value = ''; cvv.value = ''; phone.value = props.registeredPhone || ''; transferReference.value = ''; error.value = '' } })
function currency(value) { return formatCOP(value) }
function formatCard() { cardNumber.value = cardNumber.value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ') }
function formatExpiry() { const value = expiry.value.replace(/\D/g, '').slice(0, 4); expiry.value = value.length > 2 ? `${value.slice(0, 2)}/${value.slice(2)}` : value }
function close() { emit('close') }
function submit() {
  error.value = ''
  const data = { metodoPago: method.value }
  if (method.value === 'tarjeta') {
    const digits = cardNumber.value.replace(/\D/g, '')
    const [month, year] = expiry.value.split('/').map(Number)
    const expiryDate = new Date(2000 + (year || 0), month || 0, 0, 23, 59, 59)
    if (!/^\d{16}$/.test(digits) || !luhn(digits)) { error.value = 'Ingresa una tarjeta valida de 16 digitos.'; return }
    if (!/^\d{2}\/\d{2}$/.test(expiry.value) || month < 1 || month > 12 || expiryDate <= new Date()) { error.value = 'Ingresa una fecha de vencimiento valida (MM/AA).'; return }
    if (!/^\d{3,4}$/.test(cvv.value)) { error.value = 'El CVV debe tener 3 o 4 digitos.'; return }
    Object.assign(data, { numeroTarjeta: digits, vencimiento: expiry.value, cvv: cvv.value })
  } else if (method.value === 'transferencia') {
    if (transferReference.value.trim().length < 4) { error.value = 'Ingresa la referencia del comprobante bancario.'; return }
    data.comprobanteReferencia = transferReference.value.trim()
  } else if (['nequi', 'daviplata', 'pse'].includes(method.value)) {
    const digits = phone.value.replace(/\D/g, '').slice(-10)
    if (!/^3\d{9}$/.test(digits)) { error.value = 'Ingresa un celular colombiano valido de 10 digitos.'; return }
    data.celular = digits
  }
  emit('pay', data)
}
function luhn(value) { let sum = 0; for (let i = value.length - 1, p = 0; i >= 0; i--, p++) { let n = Number(value[i]); if (p % 2) { n *= 2; if (n > 9) n -= 9 } sum += n } return sum % 10 === 0 }
</script>

<style scoped>
.overlay{position:fixed;inset:0;z-index:130;display:grid;place-items:center;padding:18px;background:#020617c9;backdrop-filter:blur(12px)}.checkout{width:min(100%,600px);max-height:calc(100vh - 36px);overflow:auto;padding:25px;border:1px solid #475569;background:linear-gradient(145deg,#172235,#0b1120);border-radius:20px;box-shadow:0 28px 90px #020617c9;color:#e2e8f0}.head{display:flex;justify-content:space-between;gap:15px;margin-bottom:19px}.eyebrow{color:#a5b4fc;font-size:10px;font-weight:800;letter-spacing:.16em}.head h2{margin:7px 0;color:#f8fafc;font-size:25px;letter-spacing:-.03em}.head p{margin:0;color:#94a3b8;font-size:13px;line-height:1.5}.close{border:0;background:none;color:#cbd5e1;font-size:27px;cursor:pointer}.summary{display:flex;justify-content:space-between;gap:14px;padding:14px;border:1px solid #334155;border-radius:12px;background:#0b1120}.summary div{min-width:0;display:grid;gap:5px}.summary strong{color:#f8fafc;font-size:14px}.summary small{color:#94a3b8;font-size:11px}.summary>b{color:#c7d2fe;font-size:15px;white-space:nowrap}.methods{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:16px 0}.methods button{display:flex;align-items:center;justify-content:center;gap:6px;min-height:40px;padding:7px;border:1px solid #334155;border-radius:10px;background:#111827;color:#aebbd0;font-size:11px;font-weight:700;cursor:pointer}.methods button span{font-weight:850}.methods button.active{border-color:#818cf8;background:#312e8170;color:#e0e7ff}.checkout form{display:grid;gap:13px}.checkout label{display:grid;gap:7px;color:#dbe3ee;font-size:12px;font-weight:700}.checkout input{width:100%;height:44px;padding:10px 12px;border:1px solid #334155;border-radius:10px;background:#080e1b;color:#f8fafc;font:inherit;font-size:15px;letter-spacing:.04em}.checkout input:focus{outline:0;border-color:#818cf8;box-shadow:0 0 0 3px #6366f126}.checkout input::placeholder{color:#64748b}.split{display:grid;grid-template-columns:1fr 1fr;gap:12px}.method-note,.privacy{margin:0;color:#94a3b8;font-size:11px;line-height:1.45}.privacy{padding-top:3px}.offline-note{display:grid;gap:6px;padding:14px;border:1px solid #f59e0b55;border-radius:12px;background:#78350f20;color:#fde68a;font-size:12px;line-height:1.5}.offline-note strong{color:#fef3c7}.error{margin:0;color:#fda4af;font-size:12px}footer{display:flex;justify-content:flex-end;gap:9px;padding-top:7px}.primary,.secondary{min-height:41px;padding:10px 13px;border-radius:10px;font-size:12px;font-weight:750;cursor:pointer}.primary{display:flex;align-items:center;gap:8px;border:0;background:#4f46e5;color:white}.primary:hover{background:#6366f1}.primary:disabled{opacity:.65;cursor:wait}.secondary{border:1px solid #475569;background:#1e293b;color:#dbe3ee}.spinner{width:14px;height:14px;border:2px solid #ffffff66;border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:440px){.checkout{padding:20px}.methods{grid-template-columns:repeat(2,minmax(0,1fr))}.summary{flex-direction:column}.summary>b{align-self:flex-end}footer{flex-direction:column-reverse}.primary,.secondary{justify-content:center}}
</style>
