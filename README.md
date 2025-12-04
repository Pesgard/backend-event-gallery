# Event Gallery Backend

Backend API para la aplicación Event Gallery, construido con NestJS, Prisma ORM y AWS S3.

## 🛠️ Tech Stack

- **Framework**: NestJS 11
- **ORM**: Prisma 7
- **Database**: PostgreSQL
- **Storage**: AWS S3
- **Auth**: JWT (Bearer Token)
- **Validación**: class-validator
- **Image Processing**: Sharp

## 📋 Requisitos Previos

- Node.js >= 18
- pnpm (recomendado) o npm
- PostgreSQL
- Cuenta AWS con bucket S3 configurado

## 🚀 Instalación

1. **Clonar e instalar dependencias**:
```bash
cd backend-event-gallery
pnpm install
```

2. **Configurar variables de entorno**:
```bash
cp env.example .env
```

Edita `.env` con tus valores:
```env
# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/event_gallery?schema=public"

# JWT
JWT_SECRET=tu-secreto-super-seguro-cambiar-en-produccion
JWT_EXPIRES_IN=7d

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=tu-access-key
AWS_SECRET_ACCESS_KEY=tu-secret-key
AWS_S3_BUCKET=nombre-de-tu-bucket
```

3. **Generar cliente Prisma y migraciones**:
```bash
# Generar cliente Prisma
npx prisma generate

# Crear migración inicial
npx prisma migrate dev --name init
```

4. **Iniciar el servidor**:
```bash
# Desarrollo
pnpm start:dev

# Producción
pnpm build
pnpm start:prod
```

## 📚 API Endpoints

El servidor corre en `http://localhost:3000/api`

### Autenticación
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Registrar usuario | ❌ |
| POST | `/auth/login` | Iniciar sesión | ❌ |
| POST | `/auth/logout` | Cerrar sesión | ✅ |
| GET | `/auth/me` | Usuario actual | ✅ |
| GET | `/auth/validate-session` | Validar sesión | ✅ |

### Eventos
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/events` | Listar eventos | Opcional |
| POST | `/events` | Crear evento | ✅ |
| GET | `/events/:id` | Obtener evento | Opcional |
| PATCH | `/events/:id` | Actualizar evento | ✅ |
| DELETE | `/events/:id` | Eliminar evento | ✅ |
| POST | `/events/:id/join` | Unirse a evento | ✅ |
| POST | `/events/join-by-code` | Unirse por código | ✅ |
| DELETE | `/events/:id/leave` | Salir de evento | ✅ |
| GET | `/events/:id/participants` | Participantes | Opcional |
| GET | `/events/:id/statistics` | Estadísticas | Opcional |
| POST | `/events/validate-invite` | Validar código | ✅ |

### Imágenes
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/images` | Listar imágenes | Opcional |
| POST | `/images` | Subir imagen | ✅ |
| GET | `/images/:id` | Obtener imagen | Opcional |
| PATCH | `/images/:id` | Actualizar imagen | ✅ |
| DELETE | `/images/:id` | Eliminar imagen | ✅ |
| POST | `/images/:id/like` | Dar like | ✅ |
| DELETE | `/images/:id/unlike` | Quitar like | ✅ |
| GET | `/images/:id/likes` | Ver likes | Opcional |
| POST | `/images/bulk-delete` | Eliminar múltiples | ✅ |
| GET | `/images/:imageId/comments` | Comentarios | Opcional |

### Comentarios
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/comments` | Listar comentarios | Opcional |
| POST | `/comments` | Crear comentario | ✅ |
| GET | `/comments/:id` | Obtener comentario | Opcional |
| PATCH | `/comments/:id` | Actualizar | ✅ |
| DELETE | `/comments/:id` | Eliminar | ✅ |

### Usuarios
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/users/:id` | Perfil público | Opcional |
| PATCH | `/users/:id` | Actualizar perfil | ✅ |
| DELETE | `/users/:id` | Eliminar cuenta | ✅ |
| GET | `/users/:id/statistics` | Estadísticas | Opcional |
| GET | `/users/:id/events` | Eventos del usuario | Opcional |
| GET | `/users/:id/images` | Imágenes del usuario | Opcional |
| GET | `/users/:id/liked-images` | Imágenes gustadas | Opcional |

### Galería
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/gallery/featured` | Imágenes destacadas | ❌ |
| GET | `/gallery/recent` | Imágenes recientes | ❌ |
| GET | `/gallery/popular` | Imágenes populares | ❌ |
| GET | `/gallery/stats` | Estadísticas generales | ❌ |

### Búsqueda
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/search?q=query` | Buscar todo | Opcional |

### Health Check
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/health` | Estado del servidor | ❌ |
| GET | `/health/db` | Estado de la BD | ❌ |

### Upload (Presigned URLs)
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/upload/presigned-url` | Obtener URL para subir | ✅ |

## 🔐 Autenticación

La API usa Bearer Token (JWT). Para endpoints protegidos, incluye el header:

```
Authorization: Bearer <tu-jwt-token>
```

## 📁 Estructura del Proyecto

```
src/
├── auth/           # Autenticación y JWT
├── common/         # Decoradores, DTOs, filtros, interceptores
├── comments/       # Módulo de comentarios
├── database/       # Configuración de Prisma
├── events/         # Módulo de eventos
├── gallery/        # Módulo de galería pública
├── health/         # Health checks
├── images/         # Módulo de imágenes
├── search/         # Módulo de búsqueda
├── upload/         # Módulo de S3/uploads
├── users/          # Módulo de usuarios
├── app.module.ts   # Módulo principal
└── main.ts         # Entry point
```

## 🗄️ Esquema de Base de Datos

- **Users**: Usuarios de la plataforma
- **Events**: Eventos creados por usuarios
- **EventParticipants**: Relación usuarios-eventos
- **Images**: Imágenes subidas a eventos
- **ImageLikes**: Likes en imágenes
- **Comments**: Comentarios en imágenes

## 📝 Scripts Disponibles

```bash
pnpm start:dev    # Desarrollo con hot-reload
pnpm build        # Compilar para producción
pnpm start:prod   # Ejecutar en producción
pnpm lint         # Ejecutar ESLint
pnpm test         # Ejecutar tests
```

## 🔧 Configuración de AWS S3

1. Crear un bucket S3
2. Configurar CORS en el bucket:
```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["http://localhost:5173", "tu-dominio.com"],
        "ExposeHeaders": []
    }
]
```
3. Crear un usuario IAM con permisos S3
4. Usar las credenciales en el archivo `.env`

## 🌐 Integración con Frontend

El frontend (SPA) debe configurar `VITE_API_BASE_URL` para apuntar al backend:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

## 📄 Licencia

Este proyecto es privado.
