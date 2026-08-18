<div align="center">

<img src="public/brand/logo-horizontal.svg" alt="ASAR" height="72" />

# ASAR

### Двуязычная платформа взаимопомощи для Казахстана

**Люди помогают людям — безопасно, локально и прозрачно.**

[English](README.md) · [Қазақша](README_KZ.md)

</div>

![ASAR](public/og-asar-community.png)

## О проекте

**ASAR** — full-stack социальная платформа, которая помогает соединять людей, которым нужна
**неэкстренная помощь**, с волонтёрами, готовыми помочь рядом.

Пользователь создаёт запрос, волонтёры откликаются, автор выбирает участника, после чего
чувствительные контактные данные и точная информация о месте становятся доступны только активным
участникам. После выполнения помощь подтверждается, а система формирует отзыв и репутационный сигнал.

Платформа рассчитана на аудиторию по всему Казахстану и включает **русскую и казахскую локализацию**,
систему доверия, модерацию, приватные пользовательские сценарии, responsive web-интерфейс и
production-oriented backend на Supabase/PostgreSQL.

> ASAR не является экстренной службой.

## Основной пользовательский сценарий

```text
Создание запроса
      ↓
Отклик волонтёра
      ↓
Выбор участника
      ↓
Открытие приватных данных участникам
      ↓
Выполнение помощи
      ↓
Подтверждение результата
      ↓
Отзыв + обновление репутации
```

## Основной функционал

- создание, поиск и просмотр запросов о помощи;
- отклики волонтёров и выбор исполнителя;
- приватный assignment-контекст для контактов и точного адреса;
- отмена, withdrawal, reopen и reassignment сценарии;
- отзывы, достижения, счётчики и trust/reputation механики;
- жалобы, споры и moderation workflow;
- admin panel с пользователями, верификацией, аудитом и аналитикой;
- уведомления и transactional email outbox;
- экспорт данных и удаление/анонимизация аккаунта;
- RU/KK локализация;
- responsive web UI и основы web-app/PWA;
- health endpoint, cron-задачи, CI и эксплуатационная документация.

## Архитектура

Критические операции не доверяются напрямую клиенту. PostgreSQL/Supabase выступает как
авторитетная граница для workflow, приватности, репутации и admin-авторизации.

```text
Next.js / React / TypeScript
           ↓
Server routes + validation
           ↓
Supabase Auth / PostgreSQL
           ↓
RLS + RPC + Storage + migrations
```

Подробнее: [`docs/architecture.md`](docs/architecture.md) и [`docs/security.md`](docs/security.md).

## Стек

| Слой | Технологии |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript |
| UI | Tailwind CSS 4, собственные design tokens |
| Backend | Next.js server routes, Supabase |
| Database | PostgreSQL, Drizzle ORM, SQL migrations |
| Auth | Supabase Auth / SSR |
| Security | RLS, trusted RPC, MFA для защищённых admin-операций |
| Storage | Supabase Storage |
| i18n | Русский / Қазақша |
| Deployment | Vinext, Vite, Cloudflare-compatible runtime |
| Tests | Node tests, RLS security suite, Playwright |
| CI | GitHub Actions |

## Масштаб кодовой базы

В текущем snapshot:

- **29** страниц приложения;
- **30** API route handlers;
- **42** React-компонента;
- **8** SQL migrations;
- unit/contract, RLS и E2E тесты;
- RU/KK словари;
- документация по security, database, deployment, testing и recovery.

## Безопасность и приватность

- service-role credentials используются только server-side;
- public данные запроса отделены от private assignment context;
- actor определяется через authenticated session, а не через ID из клиентского payload;
- критические state transitions защищены database functions/RPC;
- RLS ограничивает доступ к данным;
- административные операции имеют дополнительные требования авторизации;
- upload flow проверяет доступ и входные данные;
- приложение не возвращает пользователю raw SQL/PostgreSQL errors.

## Локальный запуск

Требования: Node.js 22.13+, pnpm 11.9.0, Supabase CLI и Docker-compatible runtime.

```bash
corepack enable
corepack prepare pnpm@11.9.0 --activate
cp .env.example .env.local
pnpm install --frozen-lockfile
supabase start
supabase db reset
pnpm dev
```

`.env.local`, service-role keys, API secrets, `node_modules` и build output нельзя коммитить.

## Тестирование

```bash
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm test:rls
pnpm build
pnpm test:e2e
```

При подготовке публичной GitHub-версии static/contract suite прошёл **7/7 тестов**.
Runtime RLS/E2E требует отдельного настроенного local/staging Supabase окружения.

## Статус проекта

**ASAR 1.0 — release candidate / активная pre-production разработка.**

Основной веб-продукт и ключевая архитектура реализованы. Перед полноценным production launch должны
быть закрыты runtime security/E2E, staging migrations, инфраструктура, юридическая проверка и
финальный mobile/accessibility QA.

Подробно: [`PRODUCTION_READINESS.md`](PRODUCTION_READINESS.md).

## Что демонстрирует проект

- разработку полноценного full-stack продукта;
- сложную бизнес-логику и state machine;
- authentication/authorization;
- PostgreSQL и RLS;
- privacy-sensitive архитектуру;
- admin/moderation системы;
- двуязычный интерфейс;
- аналитические и notification механики;
- testing/CI/deployment подход.

## Лицензия

Open-source лицензия по умолчанию не предоставляется. Репозиторий является snapshot проекта/портфолио,
если владелец проекта отдельно не добавит лицензию.
