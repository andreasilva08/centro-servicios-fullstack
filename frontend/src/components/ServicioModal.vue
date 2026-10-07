<template>
  <div v-if="show" class="modal-overlay" @click.self="close">
    <div class="modal-card">
      <header class="modal-header">
        <h2>{{ isEditing ? 'Editar Servicio' : 'Nuevo Servicio' }}</h2>
        <button class="btn-close" @click="close">×</button>
      </header>

      <form class="form" @submit.prevent="handleSubmit">
        <FormField
          v-model="form.nombre"
          label="Nombre del servicio"
          placeholder="Ej. Mantenimiento Preventivo"
          :error="errors.nombre"
        />

        <div class="field">
          <span class="field__label">Descripción</span>
          <textarea
            v-model="form.descripcion"
            class="field__input field__textarea"
            placeholder="Detalles sobre este servicio..."
            rows="3"
          ></textarea>
        </div>

        <div class="form-row">
          <FormField
            v-model="form.precio"
            label="Precio ($)"
            type="number"
            placeholder="0.00"
            :error="errors.precio"
          />

          <FormField
            v-model="form.duracion"
            label="Duración (minutos)"
            type="number"
            placeholder="60"
            :error="errors.duracion"
          />
        </div>

        <div class="field">
          <span class="field__label">Estado</span>
          <select v-model="form.estado" class="field__input">
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </div>

        <p v-if="formError" class="form__alert">{{ formError }}</p>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" @click="close">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="submitting">
            {{ submitting ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import FormField from './FormField.vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  serviceData: { type: Object, default: null },
  submitting: { type: Boolean, default: false },
  formError: { type: String, default: '' }
})

const emit = defineEmits(['close', 'save'])

const isEditing = ref(false)

const form = reactive({
  id: null,
  nombre: '',
  descripcion: '',
  precio: '',
  duracion: '',
  estado: 'activo'
})

const errors = reactive({
  nombre: '',
  precio: '',
  duracion: ''
})

watch(
  () => props.serviceData,
  (newData) => {
    if (newData) {
      isEditing.value = true
      form.id = newData.id
      form.nombre = newData.nombre || ''
      form.descripcion = newData.descripcion || ''
      form.precio = newData.precio || ''
      form.duracion = newData.duracion || ''
      form.estado = newData.estado || 'activo'
    } else {
      isEditing.value = false
      form.id = null
      form.nombre = ''
      form.descripcion = ''
      form.precio = ''
      form.duracion = ''
      form.estado = 'activo'
    }
  },
  { immediate: true }
)

function close() {
  emit('close')
}

function handleSubmit() {
  errors.nombre = !form.nombre.trim() ? 'El nombre es obligatorio.' : ''
  errors.precio = !form.precio ? 'El precio es obligatorio.' : ''
  errors.duracion = !form.duracion ? 'La duración es obligatoria.' : ''

  if (errors.nombre || errors.precio || errors.duracion) return

  emit('save', { ...form, isEditing: isEditing.value })
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
}

.modal-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 28px;
  max-width: 500px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-close {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 24px;
  cursor: pointer;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field__label {
  font-size: 13px;
  font-weight: 500;
}

.field__input {
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  font-size: 14px;
  color: var(--text);
}

.field__textarea {
  resize: vertical;
  font-family: inherit;
}

.form__alert {
  background: var(--error-soft);
  border: 1px solid var(--error);
  color: var(--error);
  font-size: 13px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
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
  padding: 10px 16px;
  border-radius: var(--radius-sm);
  cursor: pointer;
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

.btn-primary:disabled {
  opacity: 0.6;
}
</style>