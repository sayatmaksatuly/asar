<div align="center">

<img src="public/brand/logo-horizontal.svg" alt="ASAR" height="72" />

# ASAR

### Қазақстанға арналған екі тілді өзара көмек платформасы

**Адамдар адамдарға көмектеседі — қауіпсіз, жақын және ашық түрде.**

[English](README.md) · [Русский](README_RU.md)

</div>

![ASAR](public/og-asar-community.png)

## Жоба туралы

**ASAR** — шұғыл емес көмек қажет адамдарды көмектесуге дайын еріктілермен байланыстыратын
full-stack әлеуметтік платформа.

Пайдаланушы көмек сұранысын жариялайды, еріктілер жауап береді, сұраныс авторы қатысушыны таңдайды.
Осыдан кейін нақты мекенжай мен байланыс ақпараты тек белсенді қатысушыларға ашылады. Көмек
аяқталғаннан кейін нәтиже расталып, пікір мен репутациялық белгі қалыптасады.

Платформа Қазақстан бойынша масштабталуға бағытталған және **қазақша/орысша локализацияны**,
сенім мен модерация жүйесін, privacy-oriented деректер моделін, responsive web UI және
Supabase/PostgreSQL backend архитектурасын қамтиды.

> ASAR шұғыл көмек қызметі емес.

## Негізгі user flow

```text
Көмек сұранысын жасау
        ↓
Еріктінің жауабы
        ↓
Қатысушыны таңдау
        ↓
Private контекстің ашылуы
        ↓
Көмекті орындау
        ↓
Нәтижені растау
        ↓
Пікір + репутацияны жаңарту
```

## Негізгі мүмкіндіктер

- көмек сұраныстарын жариялау, іздеу және қарау;
- еріктілердің жауаптары және орындаушыны таңдау;
- нақты байланыс/мекенжай үшін private assignment context;
- cancel, withdrawal, reopen және reassignment сценарийлері;
- review, achievement, counter және trust/reputation механикалары;
- report/dispute және moderation workflow;
- users, verification, audit және analytics бар admin panel;
- in-app notifications және transactional email outbox;
- account data export және deletion/anonymisation;
- қазақша және орысша интерфейс;
- responsive web UI және web-app/PWA негіздері;
- health endpoint, cron jobs, CI және deployment құжаттамасы.

## Архитектура

Критикалық бизнес-логика клиентке тікелей сеніп тапсырылмайды. PostgreSQL/Supabase workflow,
privacy, reputation және admin authorization үшін негізгі authoritative boundary ретінде қолданылады.

```text
Next.js / React / TypeScript
           ↓
Server routes + validation
           ↓
Supabase Auth / PostgreSQL
           ↓
RLS + RPC + Storage + migrations
```

Толығырақ: [`docs/architecture.md`](docs/architecture.md) және [`docs/security.md`](docs/security.md).

## Tech stack

| Қабат | Технологиялар |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript |
| UI | Tailwind CSS 4, custom design tokens |
| Backend | Next.js server routes, Supabase |
| Database | PostgreSQL, Drizzle ORM, SQL migrations |
| Auth | Supabase Auth / SSR |
| Security | RLS, trusted RPC, MFA-gated admin operations |
| Storage | Supabase Storage |
| i18n | Қазақша / Русский |
| Deployment | Vinext, Vite, Cloudflare-compatible runtime |
| Tests | Node tests, RLS security suite, Playwright |
| CI | GitHub Actions |

## Репозиторий көлемі

Қазіргі snapshot ішінде:

- **29** application page;
- **30** API route handler;
- **42** React component;
- **8** SQL migration;
- unit/contract, RLS және E2E test suite;
- қазақша/орысша dictionaries;
- security, database, deployment, testing және recovery құжаттары бар.

## Қауіпсіздік және privacy

- service-role credentials тек server-side қолданылады;
- public request data private assignment context-тен бөлек сақталады;
- actor client payload-тен емес, authenticated session арқылы анықталады;
- critical state transition database function/RPC арқылы қорғалған;
- RLS деректерге қолжетімділікті шектейді;
- admin операцияларына қосымша authorization талаптары қойылған;
- upload flow access пен input validation тексереді;
- raw SQL/PostgreSQL error пайдаланушыға шығарылмайды.

## Локалды іске қосу

Талаптар: Node.js 22.13+, pnpm 11.9.0, Supabase CLI және Docker-compatible runtime.

```bash
corepack enable
corepack prepare pnpm@11.9.0 --activate
cp .env.example .env.local
pnpm install --frozen-lockfile
supabase start
supabase db reset
pnpm dev
```

`.env.local`, service-role keys, API secrets, `node_modules` және build output GitHub-қа салынбауы тиіс.

## Тестілеу

```bash
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm test:rls
pnpm build
pnpm test:e2e
```

GitHub нұсқасын дайындау кезінде static/contract test suite **7/7 PASS** көрсетті.
Runtime RLS/E2E үшін бапталған local/staging Supabase ортасы қажет.

## Жоба статусы

**ASAR 1.0 — release candidate / active pre-production жоба.**

Негізгі web өнім мен core архитектура іске асырылған. Толық production launch алдында runtime
security/E2E, staging migration, infrastructure configuration, legal review және соңғы
mobile/accessibility QA аяқталуы қажет.

Толығырақ: [`PRODUCTION_READINESS.md`](PRODUCTION_READINESS.md).

## Бұл жоба қандай тәжірибені көрсетеді

- full-stack product architecture;
- күрделі business workflow және state machine;
- authentication/authorization;
- PostgreSQL және Row Level Security;
- privacy-sensitive жүйелер;
- admin/moderation құралдары;
- bilingual product development;
- notifications және analytics;
- testing, CI және deployment тәсілдері.

## Лицензия

Әдепкі бойынша open-source лицензия берілмейді. Жоба иесі бөлек лицензия қоспаса,
репозиторий project/portfolio snapshot ретінде жарияланады.
