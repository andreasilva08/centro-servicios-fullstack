<template>
  <div class="dashboard">
    <aside class="sidebar">
      <div class="sidebar__brand">
        <span class="brand-mark" aria-hidden="true"></span>
        <span>Sistema Sprint 1</span>
      </div>

      <nav class="sidebar__nav">
        <a class="sidebar__link sidebar__link--active" href="#">Resumen</a>
        <a class="sidebar__link" href="#">Usuarios</a>
        <a class="sidebar__link" href="#">Actividad</a>
        <a class="sidebar__link" href="#">Configuración</a>
      </nav>

      <router-link to="/" class="sidebar__logout">Cerrar sesión</router-link>
    </aside>

    <main class="content">
      <header class="content__header">
        <div>
          <h1>Resumen del sistema</h1>
          <p>Vista general de la actividad y los datos agregados.</p>
        </div>
      </header>

      <section class="stats-grid">
        <article v-for="stat in stats" :key="stat.label" class="stat-card">
          <span class="stat-card__label">{{ stat.label }}</span>
          <span class="stat-card__value">{{ stat.value }}</span>
          <span
            class="stat-card__delta"
            :class="stat.trend === 'down' ? 'stat-card__delta--down' : ''"
          >
            {{ stat.delta }}
          </span>
        </article>
      </section>

      <section class="panel">
        <header class="panel__header">
          <h2>Actividad reciente</h2>
        </header>
        <ul class="activity-list">
          <li v-for="item in activity" :key="item.id" class="activity-item">
            <span class="activity-item__dot" aria-hidden="true"></span>
            <div>
              <p class="activity-item__title">{{ item.title }}</p>
              <p class="activity-item__meta">{{ item.meta }}</p>
            </div>
          </li>
        </ul>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// TODO (integración backend): reemplazar por datos reales de
// GET /api/dashboard/summary (HUS-03, Aprendiz 2 - Backend)
const stats = ref([
  { label: 'Usuarios totales', value: '128', delta: '+12 esta semana', trend: 'up' },
  { label: 'Sesiones activas', value: '34', delta: '+5 hoy', trend: 'up' },
  { label: 'Registros pendientes', value: '6', delta: '-2 desde ayer', trend: 'down' },
  { label: 'Issues del sprint', value: '3', delta: 'HUS-01, HUS-02, HUS-03', trend: 'up' }
])

const activity = ref([
  { id: 1, title: 'Nuevo usuario registrado', meta: 'Hace 12 minutos' },
  { id: 2, title: 'Inicio de sesión exitoso', meta: 'Hace 40 minutos' },
  { id: 3, title: 'Pull Request enviado a frontend', meta: 'Hace 2 horas' },
  { id: 4, title: 'Issue movido a Code Review', meta: 'Hace 3 horas' }
])
</script>

<style scoped>
.dashboard {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 240px 1fr;
}

.sidebar {
  background: var(--surface);
  border-right: 1px solid var(--border);
  padding: 28px 20px;
  display: flex;
  flex-direction: column;
  gap: 36px;
}

.sidebar__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 14px;
}

.brand-mark {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: var(--accent);
  box-shadow: 0 0 0 4px var(--accent-soft);
}

.sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.sidebar__link {
  color: var(--text-muted);
  text-decoration: none;
  font-size: 14px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
}

.sidebar__link:hover {
  background: var(--surface-raised);
  color: var(--text);
}

.sidebar__link--active {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 500;
}

.sidebar__logout {
  color: var(--text-muted);
  text-decoration: none;
  font-size: 13px;
}

.sidebar__logout:hover {
  color: var(--error);
}

.content {
  padding: 40px 48px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.content__header h1 {
  font-size: 26px;
  margin-bottom: 6px;
}

.content__header p {
  font-size: 14px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-card__label {
  font-size: 13px;
  color: var(--text-muted);
}

.stat-card__value {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 600;
}

.stat-card__delta {
  font-size: 12.5px;
  color: var(--success);
}

.stat-card__delta--down {
  color: var(--error);
}

.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 24px;
}

.panel__header h2 {
  font-size: 16px;
  margin-bottom: 16px;
}

.activity-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.activity-item__dot {
  width: 7px;
  height: 7px;
  margin-top: 6px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
}

.activity-item__title {
  color: var(--text);
  font-size: 14px;
  margin-bottom: 2px;
}

.activity-item__meta {
  font-size: 12.5px;
}

@media (max-width: 720px) {
  .dashboard {
    grid-template-columns: 1fr;
  }
  .sidebar {
    display: none;
  }
  .content {
    padding: 28px 20px;
  }
}
</style>
