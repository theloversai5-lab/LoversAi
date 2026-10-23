import { readFile } from 'node:fs/promises';

const envText = await readFile(new URL('../frontend/.env.local', import.meta.url), 'utf8');
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/))
    .filter(Boolean)
    .map(([, key, value]) => [key, value.replace(/^(['"])(.*)\1$/, '$2')]),
);

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in frontend/.env.local.');
}

const demos = [
  ['couple-maya', 'couple', 'Maya & Arjun', 'maya.and.arjun'],
  ['couple-isha', 'couple', 'Isha & Rohan', 'isha.and.rohan'],
  ['couple-anaya', 'couple', 'Anaya & Kabir', 'anaya.and.kabir'],
  ['couple-tara', 'couple', 'Tara & Neel', 'tara.and.neel'],
  ['planner-meera', 'planner', 'Meera Shah', 'meera.shah'],
  ['planner-aarav', 'planner', 'Aarav Mehta', 'aarav.mehta'],
  ['planner-naina', 'planner', 'Naina Kapoor', 'naina.kapoor'],
  ['planner-zoya', 'planner', 'Zoya Khan', 'zoya.khan'],
  ['vendor-riya', 'vendor', 'Riya Sen', 'riya.sen'],
  ['vendor-kabir', 'vendor', 'Kabir Rao', 'kabir.rao'],
  ['vendor-tara', 'vendor', 'Tara Joseph', 'tara.joseph'],
  ['vendor-dev', 'vendor', 'Dev Malhotra', 'dev.malhotra'],
].map(([key, role, name, emailName]) => ({
  key,
  role,
  name,
  email: `demo+${emailName}@example.com`,
}));

async function admin(path, init = {}) {
  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/admin/${path}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Supabase Auth admin request failed (${response.status}): ${body?.msg || body?.message || body?.error || 'unknown error'}`);
  }
  return body;
}

const users = [];
const existing = await admin('users?page=1&per_page=1000');
const byEmail = new Map((existing.users ?? []).map((user) => [user.email?.toLowerCase(), user]));
for (const demo of demos) {
  const prior = byEmail.get(demo.email.toLowerCase());
  const metadata = {
    ...(prior?.user_metadata ?? {}),
    role: demo.role,
    full_name: demo.name,
    demo_seed_key: demo.key,
    is_demo: true,
  };
  const result = prior
    ? await admin(`users/${prior.id}`, {
        method: 'PUT',
        body: JSON.stringify({ email_confirm: true, user_metadata: metadata }),
      })
    : await admin('users', {
        method: 'POST',
        body: JSON.stringify({ email: demo.email, email_confirm: true, user_metadata: metadata }),
      });
  users.push({ key: demo.key, role: demo.role, id: result.user?.id ?? result.id ?? prior?.id });
}

if (users.some((user) => !user.id)) {
  throw new Error('Supabase created an incomplete Auth user response.');
}

console.log(JSON.stringify(users, null, 2));
