# Product and Frontend Architecture

This document preserves the product direction and frontend architecture decisions for the Check-In Board SaaS. Use it as the continuation source if the implementation context is lost.

## Product Summary

Check-In Board is a SaaS for operational management of short-term rental apartments and hospitality properties. The main user is a host, co-host, or property manager who operates apartments, imports reservations through iCal, manages tasks, and follows daily operations through a clean dashboard.

The backend is being built in Java with Spring Boot. The frontend uses Next.js App Router and must consume real backend endpoints whenever they exist.

The visual direction is inspired by Prohost.ai: modern, clean, premium, neutral colors, strong spacing, and a professional SaaS feel. Do not copy brand, text, or product functionality. Do not mention or add AI features.

## Core Business Concepts

### Organization

An organization represents the SaaS account or operating company. Users, owners, apartments, reservations, integrations, and tasks belong to the organization boundary.

### Platform User

The platform user logs in and operates the SaaS. This can be the property manager, host, co-host, or operating company employee. The platform user does not have to be the legal owner of every apartment.

### Owner

Owner is the business entity that owns one or more apartments. This replaces the ambiguous word "client" as the main product concept.

An owner can be:

- `internal`: the platform user or operating company owns the apartments.
- `client`: a third-party client owns the apartments and the platform user manages them.

This means the platform user can manage their own Airbnb apartments without special rules. They simply create an owner such as "My Own Properties" or "Guilherme Properties" with type `internal`.

### Apartment

An apartment is the operational property being managed. Every apartment belongs to one owner. Apartments can have iCal integration or operate manually.

Important apartment fields:

- name;
- internal nickname or code;
- timezone;
- owner;
- optional iCal URL;
- optional iCal provider, such as Airbnb or Booking;
- integration status.

### iCal Source

iCal is optional. If filled during apartment creation or editing, the frontend should create or update the apartment iCal source. If left blank, the apartment must still work manually.

Current backend has iCal sources as a separate resource from apartment creation. The frontend can present this as one flow while internally calling both apartment and iCal endpoints.

### Reservation

Reservations come from iCal sync or future manual entry. Airbnb all-day reservations must be interpreted in the apartment timezone, not as UTC-midnight business dates.

### Task

Tasks are operational actions connected to an apartment and optionally to a reservation. Mobile will later focus on fast field actions such as purchases, checklist updates, and operational confirmations.

## Desired Backend Model

```txt
Organization 1:N Users
Organization 1:N Owners
Owner 1:N Apartments
Apartment 1:N IcalSources
Apartment 1:N Reservations
Apartment 1:N Tasks
```

Suggested entities:

```txt
User
Organization
Owner
Apartment
IcalSource
Reservation
Task
```

Owner should include at least:

```txt
id
organizationId
name
type: internal | client
contactName
email
phone
notes
createdAt
updatedAt
```

Apartment should eventually include:

```txt
id
organizationId
ownerId
name
nickname
timezone
address fields if needed
deletedAt
createdAt
updatedAt
```

## Frontend Route Architecture

The frontend should use Next.js App Router route groups:

```txt
src/
  app/
    (auth)/
      layout.tsx
      dashboard/
        page.tsx
      apartamentos/
        page.tsx
      clientes/
        page.tsx
      reservas/
        page.tsx
      calendario/
        page.tsx
      configuracoes/
        page.tsx
    login/
      page.tsx
    page.tsx
    globals.css
```

Authenticated layout:

- fixed sidebar;
- top header;
- main content region;
- redirects or login fallback when no local session exists;
- sidebar links: Dashboard, Meus apartamentos, Clientes, Reservas, Calendário, Configurações.

Header rule:

- show apartment selector only on `/dashboard`;
- selector options: `Todos os apartamentos` and each apartment from `GET /apartments`;
- for other routes, keep the header clean and route-specific.

## Dashboard Rules

Route: `/dashboard`

The dashboard is strictly operational and visual. It must not contain apartment creation, iCal setup, or owner management.

It should contain:

- apartment selector in the authenticated header;
- KPI cards for check-ins, check-outs, in-house guests, and upcoming reservations;
- reservation/occupancy chart using Recharts or similar;
- operations board split by check-ins, check-outs, in-house, and upcoming;
- loading, error, and empty states;
- no mocked data when backend data exists.

Current backend endpoint:

```txt
GET /apartments/{apartmentId}/operations-board?date=YYYY-MM-DD&days=7
```

For `Todos os apartamentos`, there are two valid approaches:

1. Initial frontend approach: fetch `GET /apartments`, call the board endpoint for each apartment, and aggregate totals/sections in the frontend.
2. Ideal backend approach: add an aggregate endpoint later.

Suggested aggregate endpoints:

```txt
GET /operations-board?date=YYYY-MM-DD&days=7
GET /operations-board?apartmentId={id}&date=YYYY-MM-DD&days=7
```

## Apartments Management Rules

Route: `/apartamentos`

This page is for CRUD and configuration, not daily operations.

It should support:

- list apartments;
- create apartment;
- edit apartment;
- delete apartment;
- filter by owner;
- show owner clearly;
- show iCal status;
- optional iCal URL in create/edit form.

Use real list endpoint:

```txt
GET /apartments
```

If the current endpoint is not rich enough, plan a dedicated management endpoint:

```txt
GET /apartments/management
```

Suggested response shape:

```json
{
  "apartments": [
    {
      "id": "uuid",
      "name": "Apto 204",
      "nickname": "Centro 204",
      "timezone": "America/Sao_Paulo",
      "owner": {
        "id": "uuid",
        "name": "Guilherme Properties",
        "type": "internal"
      },
      "ical": {
        "enabled": true,
        "provider": "airbnb",
        "lastSuccessAt": "2026-05-22T12:00:00Z",
        "lastFailureAt": null
      }
    }
  ]
}
```

Apartment form fields:

- name;
- nickname/internal code;
- timezone;
- owner selector;
- quick create owner;
- optional iCal URL;
- optional provider;
- integration status after save.

## Owners Page Rules

Route: `/clientes`

The route can be called "Clientes" in the sidebar for user clarity, but the domain concept should be Owner/Proprietario.

It should support:

- list owners;
- create owner;
- edit owner;
- delete owner when safe;
- show owner type: Own/Internal or Client;
- show apartment count;
- future financial summary by owner.

Backend for owners still needs to be implemented.

Suggested endpoints:

```txt
GET /owners
POST /owners
GET /owners/{ownerId}
PUT /owners/{ownerId}
DELETE /owners/{ownerId}
```

## Styling Direction

Use Tailwind CSS fully. Remove the old handcrafted CSS approach from the web app. Shared design system tokens can still inform Tailwind theme values, but component styling should be Tailwind utility classes.

Preferred UI style:

- neutral surfaces;
- white and soft gray backgrounds;
- subtle borders;
- restrained green/blue accents;
- generous spacing;
- dense but calm SaaS information layout;
- no marketing hero page inside the authenticated app;
- no AI references.

Component style should follow shadcn/ui patterns:

- cards;
- tables;
- dialogs;
- dropdowns;
- forms;
- badges;
- tabs;
- buttons;
- skeleton/loading states.

## Suggested Frontend Structure

```txt
src/
  app/
    (auth)/
    login/
    globals.css
  components/
    layout/
    ui/
    charts/
    forms/
    data-table/
  features/
    auth/
    dashboard/
    apartments/
    owners/
    reservations/
    calendar/
    settings/
  lib/
    api/
    session/
    formatters/
    constants/
```

## Implementation Priorities

1. Configure Tailwind CSS and remove old CSS dependency.
2. Create authenticated route layout with sidebar and header.
3. Move dashboard to `/dashboard`, consuming real board data.
4. Add apartment selector with support for one apartment or all apartments.
5. Create `/apartamentos` with real `GET /apartments` list.
6. Prepare apartment create/edit UI with owner and optional iCal fields.
7. Create `/clientes` page structure for owners, initially prepared for future backend.
8. Add backend Owner model and Apartment -> Owner relationship.
9. Add management endpoint if `GET /apartments` is not enough.
10. Add charts using real or derived reservation data.

## Current Important Constraint

Do not mock data where real endpoints already exist. Mock only isolated future-only sections, and make those placeholders easy to remove.
