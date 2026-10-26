<template>
  <label class="field">
    <span class="field__label">{{ label }}</span>
    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      class="field__input"
      :class="{ 'field__input--error': error }"
      @input="$emit('update:modelValue', $event.target.value)"
      @blur="$emit('blur')"
    />
    <span v-if="error" class="field__error">{{ error }}</span>
  </label>
</template>

<script setup>
defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, required: true },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  autocomplete: { type: String, default: 'off' },
  error: { type: String, default: '' }
})
defineEmits(['update:modelValue', 'blur'])
</script>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field__label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
}

.field__input {
  background: rgba(15, 23, 42, .82);
  border: 1px solid rgba(71, 85, 105, .85);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 14px;
  color: #f8fafc;
  transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
}

.field__input::placeholder {
  color: var(--text-muted);
}

.field__input:focus {
  border-color: #818cf8;
  outline: 0;
  background: rgba(15, 23, 42, .98);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, .22);
}

.field__input--error {
  border-color: var(--error);
}

.field__error {
  font-size: 12.5px;
  color: var(--error);
}
.field__label { font-size: 14px; font-weight: 650; color: #e2e8f0; }
.field__input { font-size: 15px; }
</style>
