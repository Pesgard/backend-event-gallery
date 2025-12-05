# 🚀 Configuración de Deploy Automático a AWS EC2 (Ubuntu)

## 📋 Pre-requisitos en cada EC2 (Ubuntu)

### Instalación de Docker

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
sudo apt install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu

# IMPORTANTE: Cerrar sesión SSH y volver a conectar
exit
```

### Verificar instalación

```bash
docker --version
docker ps  # No debe dar error de permisos
```

### Crear directorio y archivo .env

```bash
mkdir -p ~/app

cat > ~/app/.env << 'EOF'
DATABASE_URL="postgresql://postgres:TU_PASSWORD@database-1.cf2mi8uwgdh7.us-west-1.rds.amazonaws.com:5432/postgres?schema=public"
JWT_SECRET=tu-jwt-secret-super-seguro
NODE_ENV=production
PORT=3000
FRONTEND_URL=http://tu-frontend.com
AWS_REGION=us-west-1
AWS_ACCESS_KEY_ID=tu-access-key
AWS_SECRET_ACCESS_KEY=tu-secret-key
AWS_S3_BUCKET=tu-bucket-name
EOF
```

---

## 🔐 Secrets de GitHub

Ve a tu repositorio → **Settings** → **Secrets and variables** → **Actions**

| Secret | Descripción | Ejemplo |
|--------|-------------|---------|
| `DATABASE_URL` | URL de conexión a RDS | `postgresql://postgres:pass@host:5432/db` |
| `EC2_HOST_1` | IP pública de EC2 #1 | `54.123.45.67` |
| `EC2_HOST_2` | IP pública de EC2 #2 | `54.123.45.68` |
| `EC2_USER` | Usuario SSH | `ubuntu` |
| `EC2_SSH_KEY` | Contenido del archivo .pem | `-----BEGIN RSA PRIVATE KEY-----...` |

---

## 📁 Flujo del Deploy

```
push a main
       ↓
┌──────────────────┐
│  Run Migrations  │  ← Aplica cambios de BD
└────────┬─────────┘
         │
   ┌─────┴─────┐
   ↓           ↓
┌─────┐     ┌─────┐
│EC2 1│     │EC2 2│  ← Deploy en paralelo
└──┬──┘     └──┬──┘
   └─────┬─────┘
         ↓
┌──────────────────┐
│  Health Check    │
└──────────────────┘
```

---

## 🌱 Ejecutar Seed (Solo primera vez)

El seed se ejecuta **manualmente una sola vez** desde una EC2:

```bash
# Conectar a EC2
ssh -i tu-llave.pem ubuntu@IP_EC2

# Instalar Node.js y pnpm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
npm install -g pnpm

# Clonar repo y ejecutar seed
git clone https://github.com/TU_USUARIO/backend-event-gallery.git
cd backend-event-gallery
cp ~/app/.env .env
pnpm install
pnpm prisma generate
pnpm db:seed
```

---

## ⚠️ Security Groups

Asegúrate de que tus Security Groups permitan:

### EC2 Security Group:
| Type | Port | Source |
|------|------|--------|
| SSH | 22 | Tu IP / GitHub Actions |
| Custom TCP | 3000 | 0.0.0.0/0 (o tu Load Balancer) |

### RDS Security Group:
| Type | Port | Source |
|------|------|--------|
| PostgreSQL | 5432 | Security Group de las EC2 |

---

## 🔄 Ejecución Manual

1. Ve a **Actions** en tu repositorio
2. Selecciona **Deploy to EC2**
3. Click en **Run workflow**

---

## 🐛 Troubleshooting

### Error: "Permission denied" al ejecutar docker
```bash
sudo usermod -aG docker ubuntu
# Cerrar y volver a conectar por SSH
```

### Error: "Cannot connect to RDS"
- Verifica el Security Group de RDS
- Asegúrate que las EC2 estén en el mismo VPC

### Ver logs del contenedor
```bash
docker logs backend-event-gallery
docker logs -f backend-event-gallery  # En tiempo real
```

### Reiniciar contenedor
```bash
docker restart backend-event-gallery
```

### Ver contenedores corriendo
```bash
docker ps
```
