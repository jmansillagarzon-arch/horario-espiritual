# Horario Espiritual — app independiente

Next.js + Supabase (Postgres + Auth). Multi-usuario real, con email y contraseña,
e historial sin límite de tiempo (la base de datos lo guarda todo).

## 1. Crear el proyecto en Supabase

1. Andá a https://supabase.com → **New project** (plan Free alcanza).
2. Elegí nombre, contraseña de base de datos (guárdala) y región (la más cercana).
3. Cuando el proyecto esté listo, andá a **SQL Editor → New query**.
4. Pegá **todo** el contenido de `supabase/schema.sql` (en este proyecto) y tocá **Run**.
   Esto crea las tablas, los permisos (RLS) y el trigger que arma el perfil al registrarse.
5. (Opcional pero recomendado para arrancar rápido) En **Authentication → Providers → Email**,
   desactivá "Confirm email" mientras probás, así no dependés de que llegue el correo de
   confirmación. Podés reactivarlo después para producción.
6. En **Project Settings → API** copiá:
   - `Project URL` → va en `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → va en `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. Probar en tu computadora (opcional)

```bash
cd horario-espiritual
cp .env.local.example .env.local
# editá .env.local y pegá tus dos valores de Supabase
npm install
npm run dev
```

Abrí http://localhost:3000 — deberías ver la pantalla de registro.

## 3. Subir a GitHub

```bash
cd horario-espiritual
git init
git add .
git commit -m "Horario Espiritual"
gh repo create horario-espiritual --private --source=. --push
```

(Si no tenés `gh` instalado, creá el repo manualmente en github.com y hacé
`git remote add origin <url>` + `git push -u origin main`.)

## 4. Desplegar en Vercel

1. Andá a https://vercel.com → **Add New → Project** → importá el repo `horario-espiritual`.
2. En **Environment Variables** agregá las mismas dos claves de `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Tocá **Deploy**. En un minuto te da una URL tipo `horario-espiritual.vercel.app`.

Esa URL ya es la app real, multi-usuario, con su propia base de datos. Cada persona entra,
crea su cuenta con su correo, elige el mismo **código de grupo** y su rol (Miembro o Guía).

## Cómo queda organizado el acceso

- Cada usuario ve y edita solo sus propios puntos y registros.
- Un usuario con rol **Guía** además puede ver (solo lectura) el avance de todos los que
  compartan su mismo código de grupo — puntos, cumplimiento semanal y nota del día.
- Esto está reforzado por Row Level Security directamente en la base de datos, no solo en
  la interfaz: aunque alguien manipule la app, la base de datos igual bloquea el acceso a
  datos que no le correspondan.

## Si más adelante querés agregar

- **Dominio propio**: en Vercel → Project → Settings → Domains.
- **Recuperar contraseña / cambiar email**: ya viene incluido en Supabase Auth, se puede
  habilitar la pantalla correspondiente después.
- **Notificaciones/recordatorios**: se podría agregar con Supabase Edge Functions + un cron,
  para avisar a quien no completó su Horario Espiritual del día.
