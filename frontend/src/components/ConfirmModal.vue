<template>
  <div v-if="show" class="modal-overlay" @click.self="close">
    <div class="modal-card">
      <h3>{{ title }}</h3>
      <p>{{ message }}</p>
      <slot />
      <div class="modal-actions">
        <button class="btn-secondary" @click="close">Cancelar</button>
        <button class="btn-danger" :disabled="loading || confirmDisabled" @click="$emit('confirm')">
          {{ loading ? 'Procesando...' : confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: '¿Confirmar acción?' },
  message: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  confirmDisabled: { type: Boolean, default: false },
  confirmLabel: { type: String, default: 'Confirmar' }
})

const emit = defineEmits(['close', 'confirm'])

function close() {
  emit('close')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
  backdrop-filter: blur(8px);
}

.modal-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 24px;
  max-width: 400px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-card h3 {
  font-size: 18px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}

.btn-secondary {
  background: var(--surface-raised);
  color: var(--text);
  border: 1px solid var(--border);
  padding: 9px 14px;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.btn-danger {
  background: var(--error);
  color: #fff;
  border: none;
  padding: 9px 14px;
  border-radius: var(--radius-sm);
  font-weight: 600;
  cursor: pointer;
}

.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.modal-card h3 { font-size: 24px; font-weight: 800; letter-spacing: -.025em; }
.modal-card p { color: #cbd5e1; font-size: 15px; line-height: 1.65; }
.btn-secondary, .btn-danger { padding: 11px 16px; font-size: 14px; font-weight: 700; border-radius: 10px; }
</style>
