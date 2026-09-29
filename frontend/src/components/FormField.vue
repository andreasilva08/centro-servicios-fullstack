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
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 11px 12px;
  font-size: 14px;
  color: var(--text);
  transition: border-color 0.15s ease;
}

.field__input::placeholder {
  color: var(--text-muted);
}

.field__input:focus {
  border-color: var(--accent);
}

.field__input--error {
  border-color: var(--error);
}

.field__error {
  font-size: 12.5px;
  color: var(--error);
}
</style>
