<template>
  <AuthLayout
    title="Iniciar sesión"
    subtitle="Ingresa tus credenciales para acceder al sistema."
    footnote="¿No tienes cuenta? Pide a un administrador que te registre."
    aside-title="HUS-01 · Login"
    aside-text="Como usuario quiero iniciar sesión para acceder al sistema."
    :aside-list="[
      'Validación de credenciales',
      'Campos obligatorios',
      'Mensajes de error claros'
    ]"
  >
    <form class="form" novalidate @submit.prevent="handleSubmit">
      <FormField
        v-model="form.email"
        label="Correo electrónico"
        type="email"
        placeholder="nombre@correo.com"
        autocomplete="username"
        :error="errors.email"
        @blur="validateField('email')"
      />

      <FormField
        v-model="form.password"
        label="Contraseña"
        type="password"
        placeholder="••••••••"
        autocomplete="current-password"
        :error="errors.password"
        @blur="validateField('password')"
      />

      <p v-if="formError" class="form__alert">{{ formError }}</p>

      <button type="submit" class="btn-primary" :disabled="submitting">
        {{ submitting ? 'Verificando…' : 'Entrar' }}
      </button>

      <router-link to="/registro" class="form__link">
        ¿Eres administrador y necesitas registrar un usuario?
      </router-link>
    </form>
  </AuthLayout>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthLayout from '../components/AuthLayout.vue'
import FormField from '../components/FormField.vue'
import api from '../services/api'

const router = useRouter()

const form = reactive({
  email: '',
  password: ''
})

const errors = reactive({
  email: '',
  password: ''
})

const formError = ref('')
const submitting = ref(false)

function validateField(field) {
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
    if (!form.password) {
      errors.password = 'La contraseña es obligatoria.'
    } else if (form.password.length < 6) {
      errors.password = 'Debe tener al menos 6 caracteres.'
    } else {
      errors.password = ''
    }
  }
}

async function handleSubmit() {
  formError.value = ''
  validateField('email')
  validateField('password')

  if (errors.email || errors.password) {
    formError.value = 'Revisa los campos marcados antes de continuar.'
    return
  }

  submitting.value = true
  try {
    const response = await api.post('/auth/login', {
      email: form.email,
      password: form.password
    })

    // Guardar token devuelto por el backend
    if (response.data.token) {
      localStorage.setItem('token', response.data.token)
    }

    router.push('/dashboard')
  } catch (error) {
    formError.value =
      error.response?.data?.message ||
      'Credenciales incorrectas o error de conexión.'
  } finally {
    submitting.value = false
  }
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