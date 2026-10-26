<template>
  <div class="auth-shell">
    <section class="auth-panel">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true"></span>
        <span class="brand-name">San Gil Aventura</span>
      </div>

      <div class="auth-card">
        <header class="auth-card__header">
          <h1>{{ title }}</h1>
          <p>{{ subtitle }}</p>
        </header>

        <slot />
      </div>

      <p class="auth-panel__footnote">{{ footnote }}</p>
    </section>

    <aside class="auth-aside">
      <div class="auth-aside__grid" aria-hidden="true"></div>
      <div class="auth-aside__content">
        <h2>{{ asideTitle }}</h2>
        <p>{{ asideText }}</p>
        <ul class="auth-aside__list">
          <li v-for="item in asideList" :key="item">{{ item }}</li>
        </ul>
      </div>
    </aside>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  footnote: { type: String, default: '' },
  asideTitle: { type: String, default: '' },
  asideText: { type: String, default: '' },
  asideList: { type: Array, default: () => [] }
})
</script>

<style scoped>
.auth-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 0.85fr);
}

.auth-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 32px;
  gap: 32px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  max-width: 380px;
}

.brand-mark {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: var(--accent);
  box-shadow: 0 0 0 4px var(--accent-soft);
}

.brand-name {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.auth-card {
  width: 100%;
  max-width: 380px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.auth-card__header h1 {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 8px;
}

.auth-card__header p {
  font-size: 14px;
}

.auth-panel__footnote {
  max-width: 380px;
  width: 100%;
  font-size: 13px;
  text-align: center;
}

.auth-aside {
  position: relative;
  isolation: isolate;
  background: #10131a url('https://images.unsplash.com/photo-1530866495561-507c9faab2ed?auto=format&fit=crop&w=1800&q=90') center/cover no-repeat;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
  border-left: 1px solid var(--border);
}

.auth-aside::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset: 0;
  background: linear-gradient(180deg, #07111a30 0%, #07111aa8 48%, #07111af5 100%), linear-gradient(90deg, #07111a35, transparent 85%);
}

.auth-aside__grid {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(var(--border) 1px, transparent 1px),
    linear-gradient(90deg, var(--border) 1px, transparent 1px);
  background-size: 42px 42px;
  opacity: 0.35;
  mask-image: radial-gradient(circle at 30% 30%, black, transparent 75%);
}

.auth-aside__content {
  position: relative;
  padding: 56px;
  max-width: 420px;
}

.auth-aside__content h2 {
  color: var(--text);
  max-width: 480px;
  font-size: clamp(28px, 3vw, 42px);
  line-height: 1.08;
  letter-spacing: -.04em;
  margin-bottom: 12px;
}

.auth-aside__content p {
  max-width: 420px;
  font-size: 14px;
  line-height: 1.7;
  margin-bottom: 20px;
}

.auth-aside__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.auth-aside__list li {
  font-size: 13px;
  color: var(--text-muted);
  padding-left: 18px;
  position: relative;
}

.auth-aside__list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 7px;
  width: 6px;
  height: 6px;
  border-radius: 2px;
  background: var(--accent);
}

@media (max-width: 860px) {
  .auth-shell {
    grid-template-columns: 1fr;
  }
  .auth-aside {
    display: none;
  }
}
</style>
