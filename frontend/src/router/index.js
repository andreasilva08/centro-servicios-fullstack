import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import RegistroView from '../views/RegistroView.vue'
import DashboardView from '../views/DashboardView.vue'
import ServiciosView from '../views/ServiciosView.vue'
import UsuariosView from '../views/UsuariosView.vue'
import ReservasView from '../views/ReservasView.vue'
import PerfilView from '../views/PerfilView.vue'
import SobreNosotrosView from '../views/SobreNosotrosView.vue'
import PagosAdminView from '../views/PagosAdminView.vue'
import AppLayout from '../components/AppLayout.vue'

const routes = [
  { path: '/', name: 'login', component: LoginView, meta: { requiresGuest: true } },
  { path: '/registro', name: 'registro', component: RegistroView, meta: { requiresGuest: true } },
  { path: '/app', component: AppLayout, meta: { requiresAuth: true }, children: [
    { path: '/dashboard', name: 'dashboard', component: DashboardView, meta: { requiresAdmin: true } },
    { path: '/servicios', name: 'servicios', component: ServiciosView },
    { path: '/reservas', name: 'reservas', component: ReservasView },
    { path: '/usuarios', name: 'usuarios', component: UsuariosView, meta: { requiresAdmin: true } },
    { path: '/pagos', name: 'pagos', component: PagosAdminView, meta: { requiresAdmin: true } },
    { path: '/perfil', name: 'perfil', component: PerfilView, meta: { requiresClient: true } },
    { path: '/sobre-nosotros', name: 'sobre-nosotros', component: SobreNosotrosView, meta: { requiresClient: true } }
  ] },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to) => {
  const token = localStorage.getItem('token')
  let user = {}
  try { user = JSON.parse(localStorage.getItem('user') || '{}') } catch { localStorage.removeItem('user') }
  const requiresAuth = to.matched.some(route => route.meta.requiresAuth)
  const requiresAdmin = to.matched.some(route => route.meta.requiresAdmin)
  const requiresClient = to.matched.some(route => route.meta.requiresClient)

  if (requiresAuth && !token) return { name: 'login' }
  if (to.meta.requiresGuest && token) return { name: user.rol === 'admin' ? 'dashboard' : 'servicios' }
  if (requiresAdmin && user.rol !== 'admin') return { name: 'servicios' }
  if (requiresClient && user.rol !== 'cliente') return { name: 'dashboard' }
})

export default router
