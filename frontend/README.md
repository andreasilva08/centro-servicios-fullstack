# Frontend — Sprint 1 (Vue 3 + Vite)

Implementación visual de las 3 historias de usuario del Sprint 1:

- **HUS-01** – Login (`src/views/LoginView.vue`)
- **HUS-02** – Registro de usuarios (`src/views/RegistroView.vue`)
- **HUS-03** – Dashboard principal (`src/views/DashboardView.vue`)

Incluye validaciones visuales del lado del cliente (campos obligatorios, formato
de correo, longitud de contraseña y coincidencia de contraseñas) y mensajes de
error/éxito en cada formulario. Los datos son simulados (mock) — los `TODO`
marcados en el código señalan dónde se conectará cada endpoint del backend.

## Cómo correrlo

```bash
npm install
npm run dev
```

Rutas disponibles:
- `/` → Login
- `/registro` → Registro
- `/dashboard` → Dashboard

## Cómo integrarlo a tu repo (rama `frontend`)

```bash
# 1. Ubícate en la rama frontend
git checkout frontend

# 2. Copia el contenido de este proyecto a la raíz (o carpeta frontend/) del repo

# 3. HUS-01: Login
git checkout -b feature/frontend-login
git add src/views/LoginView.vue src/components/AuthLayout.vue src/components/FormField.vue
git commit -m "feat(frontend): interfaz de login con validaciones visuales (HUS-01)"
git push origin feature/frontend-login
# → Abrir Pull Request hacia frontend

# 4. HUS-02: Registro (repite el flujo desde frontend)
git checkout frontend
git checkout -b feature/frontend-registro
git add src/views/RegistroView.vue
git commit -m "feat(frontend): formulario de registro con validaciones (HUS-02)"
git push origin feature/frontend-registro
# → Abrir Pull Request hacia frontend

# 5. HUS-03: Dashboard (repite el flujo desde frontend)
git checkout frontend
git checkout -b feature/frontend-dashboard
git add src/views/DashboardView.vue
git commit -m "feat(frontend): vista de dashboard con tarjetas de resumen (HUS-03)"
git push origin feature/frontend-dashboard
# → Abrir Pull Request hacia frontend
```

## Estructura

```
src/
  assets/style.css       # tokens de diseño (color, tipografía)
  components/
    AuthLayout.vue        # layout compartido login/registro
    FormField.vue         # input reutilizable con validación visual
  views/
    LoginView.vue          # HUS-01
    RegistroView.vue       # HUS-02
    DashboardView.vue      # HUS-03
  router/index.js
  main.js
  App.vue
```
