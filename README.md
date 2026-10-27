# Proyecto-Git - Sistema de Gestión de Reservas (Centro de Servicios)

## Descripción
Aplicación web Full Stack para administrar usuarios, servicios y reservas en un centro de servicios especializado.

---

## Integrantes y Rotación de Roles

* **Aprendiz 1:** Helver Durán — *(Frontend / Backend / DevOps)*
* **Aprendiz 2:** Diego Fajardo — *(Backend / DevOps / Frontend)*
* **Aprendiz 3:** Andrea Silva — *(Integración - DevOps / Frontend / Backend)*

---

## Tecnologías Utilizadas

* **Frontend:** Vue.js + Quasar Framework (HTML5, CSS3, JavaScript / ES Modules)
* **Backend:** Node.js + Express.js
* **Base de Datos:** MongoDB
* **Control de Versiones & DevOps:** Git, GitHub, GitHub Projects, GitHub Actions (CI/CD)

---

## Arquitectura del Sistema
Estructura cliente-servidor mediante **API REST** desplegada sobre arquitectura por capas (Controladores, Rutas y Modelos).

---

## Historias de Usuario

* **HUS-01:** Login con JWT
* **HUS-02:** Registro validado con rol cliente por defecto
* **HUS-03:** Dashboard gerencial con métricas reales
* **HUS-04:** CRUD de usuarios para administración
* **HUS-05:** CRUD de servicios con desactivación lógica
* **HUS-06:** Agendamiento con validación de fecha futura
* **HUS-07:** Consulta y filtrado de reservas por estado
* **HUS-08:** Actualización de reservas con permisos por rol
* **HUS-09:** Cancelación de reservas con confirmación

---

## Estrategia de Gestión del Proyecto (GitHub Projects)

### Columnas del Tablero
1. `Backlog`
2. `Pendiente`
3. `En Desarrollo`
4. `Code Review`
5. `Pruebas`
6. `Finalizado`

### Campos Personalizados (Custom Fields)
* **Tipo de Tarea:** *(Desarrollo, Documentación, Bug, DevOps)*
* **Tiempo Estimado:** *(Horas)*
* **Complejidad:** *(Alta, Media, Baja)*
* **Sprint:** *(Sprint 1, Sprint 2, Sprint 3)*

## Ejecución local

Requisitos: Node.js y MongoDB local o una URI de MongoDB accesible.

1. Copia `backend/.env.example` como `backend/.env` y configura `MONGO_URI` y un `JWT_SECRET` aleatorio. Opcionalmente define `ADMIN_EMAIL` / `ADMIN_PASSWORD` demas cuentas como clientes.
2. En una terminal ejecuta `cd backend`, `npm install` y `npm run dev`.
3. En otra terminal ejecuta `cd frontend`, `npm install` y `npm run dev`. Si el API usa otra dirección, define `VITE_API_URL` en `frontend/.env`.

El registro público asigna el rol cliente excepto para la primera cuenta cuando aún no existe ningún usuario. El CRUD de usuarios y servicios y la gestión de estados de reservas requieren administrador. Los clientes pueden agendar, consultar, editar reservas pendientes y cancelarlas con confirmación. Al iniciar, la API precarga experiencias de aventura si aún no existen.
