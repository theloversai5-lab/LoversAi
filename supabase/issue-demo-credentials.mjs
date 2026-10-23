import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const envText = await readFile(new URL('../frontend/.env.local', import.meta.url), 'utf8');
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/))
    .filter(Boolean)
    .map(([, key, value]) => [key, value.replace(/^(['"])(.*)\1$/, '$2')]),
);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Supabase service configuration is missing.');

const usersResponse = await fetch(`${url.replace(/\/$/, '')}/auth/v1/admin/users?page=1&per_page=1000`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
const usersBody = await usersResponse.json();
if (!usersResponse.ok) throw new Error(`Could not list Auth users (${usersResponse.status}).`);

const accounts = [
  { role: 'couple', name: 'Maya & Arjun', email: 'demo+maya.and.arjun@example.com' },
  { role: 'planner', name: 'Meera Shah', email: 'demo+meera.shah@example.com' },
  { role: 'vendor', name: 'Riya Sen', email: 'demo+riya.sen@example.com' },
];
const results = [];
for (const account of accounts) {
  const user = usersBody.users?.find((item) => item.email?.toLowerCase() === account.email.toLowerCase());
  if (!user) throw new Error(`Missing Auth record for ${account.role}. Run seed-auth-users.mjs first.`);

  const password = `${randomBytes(18).toString('base64url')}Aa7!`;
  const updateResponse = await fetch(`${url.replace(/\/$/, '')}/auth/v1/admin/users/${user.id}`, {
    method: 'PUT',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password, email_confirm: true }),
  });
  const updateBody = await updateResponse.json().catch(() => null);
  if (!updateResponse.ok) throw new Error(`Could not set ${account.role} password (${updateResponse.status}).`);
  results.push({ role: account.role, name: account.name, email: account.email, password });
}

console.log(JSON.stringify(results, null, 2));
