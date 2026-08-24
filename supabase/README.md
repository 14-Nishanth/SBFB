# SBFB backend

This folder contains the first database design for the private SBFB management system.

## Current stage

- Schema drafted for products, suppliers, customers, inward/outward, production, employees, attendance, salary, expenses, website leads and security audit events.
- Row Level Security is enabled by the schema.
- No company data should be entered yet.
- Authentication and role policies must be connected before production use.

## Security rule

Never put a Supabase service-role/secret key in `admin/index.html` or any public frontend file.

## Next implementation

1. Connect Supabase Auth.
2. Add owner/manager/staff authorization policies.
3. Add secure admin session handling.
4. Add audit logging for login success/failure and sensitive actions.
5. Add owner alert delivery through a free/available notification channel.
