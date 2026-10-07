import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import RegistroView from '../views/RegistroView.vue'
import DashboardView from '../views/DashboardView.vue'
import ServiciosView from '../views/ServiciosView.vue'

const routes = [
  { path: '/', name: 'login', component: LoginView, meta: { requiresGuest: true } },
  { path: '/registro', name: 'registro', component: RegistroView, meta: { requiresGuest: true } },
  { path: '/dashboard', name: 'dashboard', component: DashboardView, meta: { requiresAuth: true } },
  { path: '/servicios', name: 'servicios', component: ServiciosView, meta: { requiresAuth: true } },
  { path: '/reservas', name: 'reservas', component: ReservasView, meta: { requiresAuth: true } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')

  if (to.meta.requiresAuth && !token) {
    next({ name: 'login' })
  } else if (to.meta.requiresGuest && token) {
    next({ name: 'dashboard' })
  } else {
    next()
  }
})

export default router