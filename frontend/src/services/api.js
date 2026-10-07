import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:5000/api', // Ajustado a tu puerto 5000
  headers: {
    'Content-Type': 'application/json'
  }
})

// 1. Interceptor de Petición: Adjunta el token JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 2. Interceptor de Respuesta: Redirige al login si el token expiró o es inválido
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/'
    }
    return Promise.reject(error)
  }
)

export default api