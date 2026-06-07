# Вызов мастера

B2B маркетплейс ремонта ресторанного оборудования.

## Стек
- **Next.js 15** — фронтенд + API
- **Supabase** — база данных + авторизация (Email OTP)
- **Telegram Bot** — уведомления мастерам
- **Vercel** — деплой

## Структура

```
src/
  app/
    dashboard/          ← кабинет клиента
    request/new/        ← создание заявки
    request/[id]/       ← детали заявки
    master/dashboard/   ← кабинет мастера
    master/request/[id]/← заявка для мастера
    admin/dashboard/    ← панель администратора
    qr/[restaurantId]/  ← QR landing
    login/              ← авторизация
    api/                ← REST API
  components/shared/    ← переиспользуемые компоненты
  lib/                  ← supabase, auth, events, notify
  types/                ← TypeScript типы
supabase/migrations/    ← SQL схема
```

## Быстрый старт

### 1. Supabase
1. Создай проект на supabase.com
2. SQL Editor → вставь `supabase/migrations/001_schema.sql` → Run
3. Authentication → Providers → Email → включить
4. Скопируй Project URL, anon key, service_role key

### 2. Vercel
1. Импортируй репо
2. Добавь переменные окружения:

| Переменная | Значение |
|-----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | из Supabase Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | из Supabase Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | из Supabase Settings → API |
| `NEXT_PUBLIC_APP_URL` | https://your-app.vercel.app |
| `TELEGRAM_BOT_TOKEN` | от @BotFather (опционально) |
| `MONETIZATION_ENABLED` | false |

3. Deploy

### 3. Первый admin
После деплоя войди через email OTP, затем в Supabase:
Table Editor → profiles → найди свой ряд → измени role на `admin`

### 4. Создать ресторан и QR
В Supabase SQL Editor:
```sql
-- Замени YOUR_USER_ID на твой id из таблицы profiles
insert into organizations (owner_id, name) values ('YOUR_USER_ID', 'Моя компания');
insert into restaurants (organization_id, name, address)
select id, 'Ресторан №1', 'г. Алматы, ул. Абая 1' from organizations where owner_id = 'YOUR_USER_ID';
```
QR-ссылка: `https://your-app.vercel.app/qr/RESTAURANT_ID`

## Роли
| Роль | Доступ |
|------|--------|
| `client` | Создаёт заявки, выбирает мастера |
| `master` | Видит заявки, откликается, меняет статус |
| `admin` | Полный доступ + аналитика |
