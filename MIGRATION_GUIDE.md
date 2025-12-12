# Database Migration Guide

## Development Database Setup

We've configured a **separate development database** to safely test changes without affecting production data.

### Database Configuration

- **Production DB**: Protected (NEVER modified by migration)
- **Development DB**: Active in `.env` for testing

### How to Migrate Production Data to Development

Run the migration script to copy all data from production to development:

```bash
npm run migrate:dev
```

### What the Migration Does

1. ✅ Connects to production (READ ONLY)
2. ✅ Copies all collections: users, plans, enrollments, invoices, payments
3. ✅ Copies indexes for performance
4. ✅ Shows progress and summary
5. ✅ Closes connections safely

### Safety Features

- Production database is READ ONLY - No modifications possible
- Dev database is completely separate
- Confirmation prompt before starting
- Clear progress indicators

### Important Notes

⚠️ DO NOT commit .env file to git
⚠️ DO NOT use production credentials in development
✅ ALWAYS use the dev database for testing
