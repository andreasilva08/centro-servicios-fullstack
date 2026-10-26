<template>
  <div v-if="show && reservation" class="overlay" @click.self="$emit('close')">
    <section class="ticket" role="dialog" aria-modal="true" aria-labelledby="ticket-title">
      <header class="ticket-head"><span class="confirmed"><i></i> RESERVA CONFIRMADA</span><button class="close" aria-label="Cerrar" @click="$emit('close')">&times;</button></header>
      <div class="ticket-title"><span class="eyebrow">BONO DIGITAL DE AVENTURA</span><h2 id="ticket-title">Tu próxima historia empieza aquí</h2><p>Presenta este código al guía antes de iniciar la experiencia.</p></div>
      <div class="ticket-code">{{ reservation.ticketCode || ticketFallback }}</div>
      <div class="qr"><img :src="qrUrl" alt="Código QR de validación del ticket"><small>Código QR de validación</small></div>
      <div class="details"><div class="adventure"><span>EXPERIENCIA</span><strong>{{ serviceName }}</strong></div><div><span>FECHA Y HORA</span><strong>{{ dateLabel }}</strong></div><div><span>PARTICIPANTES</span><strong>{{ reservation.participantes || 1 }}</strong></div><div><span>TOTAL PAGADO</span><strong>{{ currency(reservation.precioTotal) }}</strong></div><div class="meeting"><span>PUNTO DE ENCUENTRO</span><strong>{{ reservation.puntoEncuentro || 'Base de operaciones en San Gil; el guía confirmará el punto exacto.' }}</strong></div></div>
      <footer><button class="secondary" @click="$emit('close')">Cerrar</button><button class="download" @click="downloadTicket"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 20h14"/></svg>Descargar ticket</button></footer>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatCOP } from '../utils/currency'

const props = defineProps({ show: Boolean, reservation: { type: Object, default: null } })
defineEmits(['close'])
const code = computed(() => props.reservation?.ticketCode || '#SAN-GIL-AVENTURA')
const ticketFallback = computed(() => code.value)
const serviceName = computed(() => props.reservation?.servicio?.nombre || props.reservation?.servicioNombre || 'Experiencia de aventura')
const dateLabel = computed(() => { const value = props.reservation?.fechaHora || props.reservation?.fecha; const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Por confirmar' : date.toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' }) })
const qrPayload = computed(() => JSON.stringify({ codigo: code.value, reserva: String(props.reservation?._id || props.reservation?.id || '') }))
const qrUrl = computed(() => `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(qrPayload.value)}`)
function currency(value) { return formatCOP(value) }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]) }
function downloadTicket() {
  const html = `<!doctype html><html lang="es"><meta charset="utf-8"><title>Ticket ${escapeHtml(code.value)}</title><style>body{font:16px Arial,sans-serif;color:#172033;margin:0;padding:32px;background:#f1f5f9}.ticket{max-width:620px;margin:auto;padding:30px;background:white;border:1px solid #cbd5e1;border-radius:18px}h1{font-size:25px}.code{font-size:20px;font-weight:bold;color:#4338ca}img{display:block;width:190px;height:190px;margin:18px auto}.row{padding:12px 0;border-top:1px solid #e2e8f0}.label{display:block;color:#64748b;font-size:11px;margin-bottom:5px}</style><article class="ticket"><p>RESERVA CONFIRMADA · BONO DIGITAL DE AVENTURA</p><h1>Tu próxima historia empieza aquí</h1><p class="code">${escapeHtml(code.value)}</p><img src="${escapeHtml(qrUrl.value)}" alt="Código QR">${[['Experiencia',serviceName.value],['Fecha y hora',dateLabel.value],['Participantes',props.reservation?.participantes || 1],['Total pagado',currency(props.reservation?.precioTotal)],['Punto de encuentro',props.reservation?.puntoEncuentro || 'Base de operaciones en San Gil; el guía confirmará el punto exacto.']].map(([label,value])=>`<div class="row"><span class="label">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')}</article></html>`
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }))
  const link = document.createElement('a'); link.href = url; link.download = `ticket-${String(code.value).replace(/[^A-Za-z0-9-]/g, '')}.html`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
</script>

<style scoped>
.overlay{position:fixed;inset:0;z-index:140;display:grid;place-items:center;padding:16px;background:#020617d1;backdrop-filter:blur(12px)}.ticket{width:min(100%,510px);max-height:calc(100vh - 32px);overflow:auto;padding:24px;border:1px solid #475569;border-radius:20px;background:radial-gradient(ellipse at top,#312e8140,transparent 55%),linear-gradient(145deg,#172235,#0b1120);box-shadow:0 28px 90px #020617d1;color:#e2e8f0}.ticket-head{display:flex;justify-content:space-between;align-items:center}.confirmed{display:flex;align-items:center;gap:8px;color:#86efac;font-size:10px;font-weight:850;letter-spacing:.1em}.confirmed i{width:8px;height:8px;border-radius:50%;background:#4ade80;box-shadow:0 0 12px #4ade80}.close{border:0;background:none;color:#cbd5e1;font-size:26px;cursor:pointer}.ticket-title{text-align:center;margin:4px auto 15px}.eyebrow{color:#a5b4fc;font-size:9px;font-weight:800;letter-spacing:.15em}.ticket-title h2{margin:7px 0;color:#f8fafc;font-size:21px;letter-spacing:-.025em}.ticket-title p{margin:0;color:#94a3b8;font-size:12px;line-height:1.4}.ticket-code{width:max-content;max-width:100%;margin:0 auto 12px;padding:8px 13px;border:1px dashed #818cf8;border-radius:9px;background:#312e8150;color:#e0e7ff;font-size:15px;font-weight:850;letter-spacing:.08em}.qr{width:max-content;margin:0 auto 16px;padding:9px;border-radius:13px;background:white;text-align:center}.qr img{display:block;width:150px;height:150px}.qr small{display:block;padding-top:5px;color:#475569;font-size:9px}.details{display:grid;grid-template-columns:1fr 1fr;gap:0 16px;padding:0 4px}.details>div{display:grid;gap:5px;padding:10px 0;border-top:1px solid #334155}.details .adventure,.details .meeting{grid-column:1/-1}.details span{color:#8291a8;font-size:9px;font-weight:800;letter-spacing:.1em}.details strong{color:#e2e8f0;font-size:12px;line-height:1.45}.details .adventure strong{font-size:15px;color:#f8fafc}footer{display:flex;justify-content:flex-end;gap:9px;margin-top:16px;padding-top:15px;border-top:1px solid #334155}.secondary,.download{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:40px;padding:9px 13px;border-radius:10px;font-size:12px;font-weight:750;cursor:pointer}.secondary{border:1px solid #475569;background:#1e293b;color:#dbe3ee}.download{border:0;background:#4f46e5;color:white}.download:hover{background:#6366f1}.download svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}@media(max-width:430px){.ticket{padding:19px}.ticket-title h2{font-size:19px}footer{flex-direction:column-reverse}.secondary,.download{width:100%}}
</style>
