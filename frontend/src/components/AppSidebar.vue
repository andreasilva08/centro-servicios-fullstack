<template>
  <aside class="sidebar">
    <div class="brand"><span class="mark"></span><span>Centro de Servicios</span></div>
    <div class="identity"><strong>{{ user.nombre || 'Usuario' }}</strong><small>{{ user.rol === 'admin' ? 'Administrador' : 'Cliente' }}</small></div>
    <nav class="nav"><RouterLink v-for="item in items" :key="item.to" :to="item.to"><svg viewBox="0 0 24 24" aria-hidden="true"><path :d="item.icon"/></svg><span>{{ item.label }}</span></RouterLink></nav>
    <button class="logout" @click="logout"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5m5 5H3m10-9h5a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-5"/></svg><span>Cerrar sesión</span></button>
  </aside>
</template>
<script setup>
import { computed } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
const router = useRouter()
const user = computed(() => { try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} } })
const items = computed(() => user.value.rol === 'admin' ? [
  { to: '/dashboard', label: 'Dashboard Gerencial', icon: 'M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z' },
  { to: '/servicios', label: 'Gestión de Servicios', icon: 'M3 20h18M5 17l5-6 3 3 5-8 3 3' },
  { to: '/reservas', label: 'Gestión de Reservas', icon: 'M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13H4V6a1 1 0 0 1 1-1z' },
  { to: '/usuarios', label: 'Gestión de Usuarios', icon: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m6-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8m6-7a4 4 0 0 1 0 7m2 4a4 4 0 0 1 2 4v2' },
  { to: '/pagos', label: 'Gestion de Pagos', icon: 'M3 6h18v12H3zM3 10h18M7 15h3' }
] : [
  { to: '/servicios', label: 'Catálogo de Servicios', icon: 'M12 21s7-4.4 7-11a7 7 0 1 0-14 0c0 6.6 7 11 7 11zm0-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z' },
  { to: '/sobre-nosotros', label: 'Sobre nosotros', icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 8v5m0-9h.01' },
  { to: '/reservas', label: 'Mis Reservas', icon: 'M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13H4V6a1 1 0 0 1 1-1z' },
  { to: '/perfil', label: 'Mi Perfil', icon: 'M20 21a8 8 0 0 0-16 0m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' }
])
function logout() { localStorage.removeItem('token'); localStorage.removeItem('user'); router.replace({ name: 'login' }) }
</script>
<style scoped>
.sidebar{position:relative;height:100vh;width:256px;padding:25px 16px;background:linear-gradient(180deg,#111827,#0f172a);border-right:1px solid #273449;display:flex;flex-direction:column;gap:22px}.brand{display:flex;align-items:center;gap:10px;padding:0 9px;font-size:13px;font-weight:750;letter-spacing:-.02em}.mark{width:10px;height:10px;border-radius:4px;background:#818cf8;box-shadow:0 0 0 5px #312e8140}.identity{display:grid;gap:4px;padding:13px 12px;border:1px solid #273449;border-radius:12px;background:#ffffff04}.identity small{color:#94a3b8;text-transform:capitalize}.nav{display:grid;align-content:start;gap:5px;flex:1}.nav a{display:flex;align-items:center;gap:12px;min-height:42px;padding:9px 11px;color:#a8b3c7;text-decoration:none;border:1px solid transparent;border-radius:10px;font-size:12px;transition:background .16s,color .16s,border-color .16s}.nav a svg{width:17px;height:17px;flex:0 0 auto;fill:none;stroke:currentColor;stroke-width:1.55;stroke-linecap:round;stroke-linejoin:round}.nav a:first-child svg path{fill:none}.nav a:hover,.nav a.router-link-active{background:#312e8140;border-color:#818cf826;color:#c7d2fe}.logout{width:100%;border:1px solid #374151;background:transparent;color:#cbd5e1;border-radius:9px;padding:10px 11px;text-align:left;font-size:12px;cursor:pointer}.logout:hover{background:#1f2937}
@media(max-width:720px){.sidebar{height:auto;width:100%;padding:12px 14px;gap:10px;border-right:0;border-bottom:1px solid #273449}.brand{padding:0 3px}.identity{display:none}.nav{display:flex;overflow-x:auto;gap:4px}.nav a{white-space:nowrap;flex:0 0 auto;min-height:36px;padding:8px}.nav a svg{width:15px;height:15px}.logout{width:auto;align-self:flex-end;padding:7px 10px}}
.logout{display:flex;align-items:center;gap:10px}.logout svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}.logout:hover{border-color:#64748b}
</style>
