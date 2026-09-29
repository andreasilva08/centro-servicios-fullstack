<template>
  <AuthLayout
    title="Registrar usuario"
    subtitle="Crea una cuenta nueva dentro del sistema."
    footnote="¿Ya tienes cuenta? Vuelve al inicio de sesión."
    aside-title="HUS-02 · Registro"
    aside-text="Como administrador quiero registrar usuarios."
    :aside-list="[
      'Creación de usuario',
      'Validación de datos',
      'Confirmación de contraseña'
    ]"
  >
    <form class="form" novalidate @submit.prevent="handleSubmit">
      <FormField
        v-model="form.nombre"
        label="Nombre completo"
        placeholder="Ej. Ana Torres"
        autocomplete="name"
        :error="errors.nombre"
        @blur="validateField('nombre')"
      />

      <FormField
        v-model="form.email"
        label="Correo electrónico"
        type="email"
        placeholder="nombre@correo.com"
        autocomplete="email"
        :error="errors.email"
        @blur="validateField('email')"
      />

      <FormField
        v-model="form.password"
        label="Contraseña"
        type="password"
        placeholder="Mínimo 6 caracteres"
        autocomplete="new-password"
        :error="errors.password"
        @blur="validateField('password')"
      />

      <FormField
        v-model="form.confirmPassword"
        label="Confirmar contraseña"
        type="password"
        placeholder="Repite la contraseña"
        autocomplete="new-password"
        :error="errors.confirmPassword"
        @blur="validateField('confirmPassword')"
      />

      <p v-if="formSuccess" class="form__success">{{ formSuccess }}</p>
      <p v-else-if="formError" class="form__alert">{{ formError }}</p>

      <button type="submit" class="btn-primary" :disabled="submitting">
        {{ submitting ? 'Creando cuenta…' : 'Crear cuenta' }}
      </button>

      <router-link to="/" class="form__link">
        Volver a iniciar sesión
      </router-link>
    </form>
  </AuthLayout>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthLayout from '../components/AuthLayout.vue'
import FormField from '../components/FormField.vue'

const router = useRouter()

const form = reactive({
  nombre: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const errors = reactive({
  nombre: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const formError = ref('')
const formSuccess = ref('')
const submitting = ref(false)

function validateField(field) {
  if (field === 'nombre') {
    errors.nombre = form.nombre.trim().length < 3
      ? 'Ingresa el nombre completo.'
      : ''
  }

  if (field === 'email') {
    if (!form.email.trim()) {
      errors.email = 'El correo es obligatorio.'
    } else if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      errors.email = 'Ingresa un correo válido.'
    } else {
      errors.email = ''
    }
  }

  if (field === 'password') {
    errors.password = form.password.length < 6
      ? 'Debe tener al menos 6 caracteres.'
      : ''
    // Revalidar confirmación si ya se había escrito
    if (form.confirmPassword) validateField('confirmPassword')
  }

  if (field === 'confirmPassword') {
    errors.confirmPassword = form.confirmPassword !== form.password
      ? 'Las contraseñas no coinciden.'
      : ''
  }
}

function handleSubmit() {
  formError.value = ''
  formSuccess.value = ''
  ;['nombre', 'email', 'password', 'confirmPassword'].forEach(validateField)

  const hasErrors = Object.values(errors).some(Boolean)
  if (hasErrors) {
    formError.value = 'Revisa los campos marcados antes de continuar.'
    return
  }

  // TODO (integración backend): reemplazar por llamada real a
  // POST /api/users (HUS-02, Aprendiz 2 - Backend)
  submitting.value = true
  setTimeout(() => {
    submitting.value = false
    formSuccess.value = 'Cuenta creada correctamente. Ya puedes iniciar sesión.'
    setTimeout(() => router.push('/'), 900)
  }, 600)
}
</script>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form__alert {
  background: var(--error-soft);
  border: 1px solid var(--error);
  color: var(--error);
  font-size: 13px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
}

.form__success {
  background: rgba(62, 207, 142, 0.12);
  border: 1px solid var(--success);
  color: var(--success);
  font-size: 13px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
}

.btn-primary {
  background: var(--accent);
  color: #0d1117;
  border: none;
  border-radius: var(--radius-sm);
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-hover);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form__link {
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
  text-decoration: none;
}

.form__link:hover {
  color: var(--accent);
}
</style>
