// Do not allow this prototype to replace the live RS2 application by accident.
if (process.env.VERCEL_ENV === 'production') {
  console.error('RS2 NEXT: production deployment is blocked. This branch is preview-only; legacy main must remain unchanged.');
  process.exit(1);
}
