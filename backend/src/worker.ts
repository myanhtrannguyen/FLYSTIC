type Role = "student" | "admin";
type PointDestination = "fundraising" | "rewards";
type Session = { sub: string; role: Role; stationId?: string | null; exp: number };
type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  password_salt: string;
  role: Role;
  name: string;
  student_id: string | null;
  faculty: string | null;
  station_id: string | null;
  points: number;
  total_kg: number;
};
type TransactionRow = {
  id: string;
  station_id: string;
  admin_id: string;
  student_id: string | null;
  items_json: string;
  total_quantity: number;
  weight_kg: number;
  points: number;
  status: "pending" | "confirmed" | "expired" | "cancelled";
  created_at: number;
  expires_at: number;
  confirmed_at: number | null;
};
type TransactionViewRow = TransactionRow & {
  station_name: string;
  student_name: string | null;
  student_faculty: string | null;
};
type StationRow = {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  capacity_kg: number;
  filled_kg: number;
};
type TransferRow = {
  id: string;
  station_id: string;
  station_name: string;
  admin_id: string;
  weight_kg: number;
  created_at: number;
};
type DemoCampaignMetric = { label: string; kg: number };
type DemoCampaignSummary = {
  registeredStudents: number;
  participantCount: number;
  transactionCount: number;
  totalKg: number;
  totalPoints: number;
  fundraisingPoints: number;
  fundraisingPercent: number;
  byType: DemoCampaignMetric[];
  byQuality: DemoCampaignMetric[];
};
type AuthThrottleRow = {
  failure_count: number;
  window_started_at: number;
  locked_until: number;
};
type ItemInput = { plasticType: string; quantity: number; cleanliness: string };

const TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PASSWORD_ITERATIONS = 16_384;
const LEGACY_PASSWORD_ITERATIONS = 310_000;
const AUTH_FAILURE_WINDOW_MS = 15 * 60_000;
const AUTH_MAX_FAILURES = 5;
const AUTH_LOCK_MS = 15 * 60_000;
const POINT_BASE: Record<string, number> = { PET: 10, HDPE: 10, PP: 8, LDPE: 2, PS: 1 };
const CLEAN_MULTIPLIER: Record<string, number> = { CLEAN: 1.5, NORMAL: 1, DIRTY: 0.5 };

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function headers(request: Request, env: Env) {
  const requestOrigin = request.headers.get("origin");
  const allowedOrigins = env.ALLOWED_ORIGIN.split(",").map((origin) => origin.trim());
  const origin =
    requestOrigin && allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0];
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-headers": "authorization, content-type",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "content-type": "application/json; charset=utf-8",
    vary: "origin",
  };
}

function json(request: Request, env: Env, body: unknown, status = 200) {
  return Response.json(body, { status, headers: headers(request, env) });
}

function requireString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) throw new HttpError(400, `${field} is required`);
  return value.trim();
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function body(request: Request) {
  try {
    const result = (await request.json()) as unknown;
    if (!result || typeof result !== "object" || Array.isArray(result)) {
      throw new HttpError(400, "JSON object expected");
    }
    return result as Record<string, unknown>;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "Invalid JSON body");
  }
}

function bytesToBase64Url(bytes: Uint8Array) {
  let text = "";
  bytes.forEach((byte) => {
    text += String.fromCharCode(byte);
  });
  return btoa(text).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlToBytes(value: string) {
  const padded = value
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const text = atob(padded);
  return Uint8Array.from(text, (character) => character.charCodeAt(0));
}

async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(bytes));
}

async function timingSafeDigestEqual(first: string, second: string) {
  const encoder = new TextEncoder();
  const [firstHash, secondHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(first)),
    crypto.subtle.digest("SHA-256", encoder.encode(second)),
  ]);
  return crypto.subtle.timingSafeEqual(firstHash, secondHash);
}

async function pepperPassword(password: string, pepper: string) {
  const pepperKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", pepperKey, new TextEncoder().encode(password));
}

async function passwordHash(
  password: string,
  salt: Uint8Array,
  iterations: number,
  pepper?: string,
) {
  const material = pepper
    ? await pepperPassword(password, pepper)
    : new TextEncoder().encode(password);
  const passwordKey = await crypto.subtle.importKey("raw", material, "PBKDF2", false, [
    "deriveBits",
  ]);
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    passwordKey,
    256,
  );
  return bytesToBase64Url(new Uint8Array(derived));
}

async function passwordRecord(
  password: string,
  pepper: string,
  salt = crypto.getRandomValues(new Uint8Array(16)),
) {
  const hash = await passwordHash(password, salt, PASSWORD_ITERATIONS, pepper);
  return { hash: `v2$${PASSWORD_ITERATIONS}$${hash}`, salt: bytesToBase64Url(salt) };
}

async function verifyPassword(password: string, storedHash: string, salt: string, pepper: string) {
  const saltBytes = base64UrlToBytes(salt);
  const versionedHash = /^v2\$(\d+)\$([A-Za-z0-9_-]+)$/.exec(storedHash);
  if (versionedHash && Number(versionedHash[1]) === PASSWORD_ITERATIONS) {
    const hash = await passwordHash(password, saltBytes, PASSWORD_ITERATIONS, pepper);
    return timingSafeDigestEqual(hash, versionedHash[2]);
  }

  // There are no production users before the Free-plan migration. This fallback only preserves
  // compatibility for an interrupted earlier deployment; its cost is too high for Free Workers.
  const legacyHash = await passwordHash(password, saltBytes, LEGACY_PASSWORD_ITERATIONS);
  return timingSafeDigestEqual(legacyHash, storedHash);
}

async function enforceAuthRateLimit(env: Env, action: "login" | "register", email: string) {
  const identityKey = await digest(`${action}:${email}`);
  const [globalAttempt, identityAttempt] = await Promise.all([
    env.AUTH_GLOBAL_LIMIT.limit({ key: action }),
    env.AUTH_IDENTITY_LIMIT.limit({ key: identityKey }),
  ]);
  if (!globalAttempt.success || !identityAttempt.success) {
    throw new HttpError(429, "Too many attempts. Please wait one minute and try again");
  }
}

async function loginThrottle(env: Env, email: string) {
  const throttleKey = await digest(`login:${email}`);
  const throttle = await env.DB.prepare(
    "SELECT failure_count, window_started_at, locked_until FROM auth_throttles WHERE throttle_key = ?",
  )
    .bind(throttleKey)
    .first<AuthThrottleRow>();
  if (throttle && throttle.locked_until > Date.now()) {
    const retryMinutes = Math.max(1, Math.ceil((throttle.locked_until - Date.now()) / 60_000));
    throw new HttpError(429, `Too many failed attempts. Try again in ${retryMinutes} minute(s)`);
  }
  return throttleKey;
}

async function recordLoginFailure(env: Env, throttleKey: string) {
  const now = Date.now();
  const windowExpiredAt = now - AUTH_FAILURE_WINDOW_MS;
  await env.DB.prepare(
    `INSERT INTO auth_throttles (throttle_key, failure_count, window_started_at, locked_until, updated_at)
     VALUES (?, 1, ?, 0, ?)
     ON CONFLICT(throttle_key) DO UPDATE SET
       failure_count = CASE
         WHEN auth_throttles.window_started_at <= ? THEN 1
         ELSE auth_throttles.failure_count + 1
       END,
       window_started_at = CASE
         WHEN auth_throttles.window_started_at <= ? THEN excluded.window_started_at
         ELSE auth_throttles.window_started_at
       END,
       locked_until = CASE
         WHEN auth_throttles.window_started_at <= ? THEN 0
         WHEN auth_throttles.failure_count + 1 >= ? THEN ?
         ELSE auth_throttles.locked_until
       END,
       updated_at = excluded.updated_at`,
  )
    .bind(
      throttleKey,
      now,
      now,
      windowExpiredAt,
      windowExpiredAt,
      windowExpiredAt,
      AUTH_MAX_FAILURES,
      now + AUTH_LOCK_MS,
    )
    .run();
}

async function clearLoginThrottle(env: Env, throttleKey: string) {
  await env.DB.prepare("DELETE FROM auth_throttles WHERE throttle_key = ?").bind(throttleKey).run();
}

async function signSession(session: Session, secret: string) {
  const payload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(session)));
  const signature = await digest(`${payload}.${secret}`);
  return `${payload}.${signature}`;
}

async function readSession(request: Request, env: Env): Promise<Session> {
  const value = request.headers.get("authorization");
  if (!value?.startsWith("Bearer ")) throw new HttpError(401, "Authentication required");
  const [payload, signature] = value.slice(7).split(".");
  if (
    !payload ||
    !signature ||
    !(await timingSafeDigestEqual(signature, await digest(`${payload}.${env.AUTH_SECRET}`)))
  ) {
    throw new HttpError(401, "Invalid session");
  }
  try {
    const session = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload))) as Session;
    if (!session.sub || !session.role || session.exp < Date.now()) throw new Error();
    return session;
  } catch {
    throw new HttpError(401, "Invalid session");
  }
}

async function currentUser(request: Request, env: Env) {
  const session = await readSession(request, env);
  const user = await env.DB.prepare(
    "SELECT id, email, password_hash, password_salt, role, name, student_id, faculty, station_id, points, total_kg FROM users WHERE id = ?",
  )
    .bind(session.sub)
    .first<UserRow>();
  if (!user) throw new HttpError(401, "Session user no longer exists");
  return { session, user };
}

async function publicUser(env: Env, user: UserRow) {
  const allocation = await env.DB.prepare(
    `SELECT COALESCE(SUM(CAST(json_extract(metadata_json, '$.points') AS INTEGER)), 0) AS fund_points
     FROM audit_events
     WHERE actor_id = ?
       AND action = 'points_allocated'
       AND json_extract(metadata_json, '$.destination') = 'fundraising'`,
  )
    .bind(user.id)
    .first<{ fund_points: number }>();
  const fundPoints = Math.max(0, allocation?.fund_points ?? 0);
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    studentId: user.student_id,
    faculty: user.faculty,
    stationId: user.station_id,
    points: user.points,
    rewardPoints: Math.max(0, user.points - fundPoints),
    fundPoints,
    totalKg: user.total_kg,
  };
}

function randomId() {
  return crypto.randomUUID();
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (byte) => TOKEN_ALPHABET[byte % TOKEN_ALPHABET.length]).join("");
}

function calculate(items: ItemInput[]) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 5) {
    throw new HttpError(400, "A transaction needs 1–5 plastic lines");
  }
  const normalized = items.map((item) => {
    if (!POINT_BASE[item.plasticType] || !CLEAN_MULTIPLIER[item.cleanliness]) {
      throw new HttpError(400, "Unsupported plastic type or cleanliness");
    }
    const quantity = Math.round(item.quantity * 100) / 100;
    if (
      !Number.isFinite(item.quantity) ||
      item.quantity < 0.01 ||
      item.quantity > 200 ||
      Math.abs(item.quantity - quantity) > Number.EPSILON
    ) {
      throw new HttpError(400, "Weight must be a number from 0.01 to 200 kg with up to 2 decimals");
    }
    return {
      plasticType: item.plasticType,
      cleanliness: item.cleanliness,
      quantity,
      points: Math.round(
        quantity * POINT_BASE[item.plasticType] * CLEAN_MULTIPLIER[item.cleanliness],
      ),
    };
  });
  const totalQuantity = +normalized.reduce((sum, item) => sum + item.quantity, 0).toFixed(2);
  return {
    items: normalized,
    points: normalized.reduce((sum, item) => sum + item.points, 0),
    totalQuantity,
    weightKg: totalQuantity,
  };
}

async function stationData(env: Env) {
  const result = await env.DB.prepare(
    `SELECT
      s.id, s.name, s.address, s.latitude, s.longitude, s.capacity_kg,
      COALESCE((SELECT SUM(t.weight_kg) FROM transactions t WHERE t.station_id = s.id AND t.status = 'confirmed'), 0)
      - COALESCE((SELECT SUM(r.weight_kg) FROM station_transfers r WHERE r.station_id = s.id), 0) AS filled_kg
    FROM stations s
    WHERE s.is_active = 1
    ORDER BY s.name`,
  ).all<StationRow>();
  return result.results.map((station) => ({
    id: station.id,
    name: station.name,
    address: station.address,
    latitude: station.latitude,
    longitude: station.longitude,
    capacityKg: station.capacity_kg,
    filledKg: +Math.max(0, station.filled_kg).toFixed(2),
    fillPercent: Math.min(
      100,
      Math.round((Math.max(0, station.filled_kg) / station.capacity_kg) * 100),
    ),
  }));
}

async function stations(request: Request, env: Env) {
  return json(request, env, await stationData(env));
}

function effectiveStatus(transaction: TransactionRow) {
  return transaction.status === "pending" && Date.now() > transaction.expires_at
    ? "expired"
    : transaction.status;
}

function transactionView(transaction: TransactionViewRow, token?: string, includeStudent = true) {
  return {
    id: transaction.id,
    ...(token ? { token } : {}),
    userId: includeStudent ? transaction.student_id : null,
    userName: includeStudent ? transaction.student_name : null,
    userFaculty: includeStudent ? transaction.student_faculty : null,
    adminId: transaction.admin_id,
    stationId: transaction.station_id,
    collectionPoint: transaction.station_name,
    items: JSON.parse(transaction.items_json),
    totalQuantity: transaction.total_quantity,
    weightKg: transaction.weight_kg,
    points: transaction.points,
    status: effectiveStatus(transaction),
    createdAt: transaction.created_at,
    expiresAt: transaction.expires_at,
    confirmedAt: transaction.confirmed_at,
  };
}

async function transactionData(env: Env, user: UserRow) {
  const scope =
    user.role === "admin"
      ? { clause: "t.station_id = ?", value: user.station_id }
      : { clause: "t.student_id = ?", value: user.id };
  if (!scope.value) return [];
  const rows = await env.DB.prepare(
    `SELECT t.id, t.station_id, t.admin_id, t.student_id, t.items_json, t.total_quantity,
      t.weight_kg, t.points, t.status, t.created_at, t.expires_at, t.confirmed_at,
      s.name AS station_name, u.name AS student_name, u.faculty AS student_faculty
     FROM transactions t
     JOIN stations s ON s.id = t.station_id
     LEFT JOIN users u ON u.id = t.student_id
     WHERE ${scope.clause}
     ORDER BY t.created_at DESC
     LIMIT 250`,
  )
    .bind(scope.value)
    .all<TransactionViewRow>();
  return rows.results.map((transaction) => transactionView(transaction));
}

async function transferData(env: Env, user: UserRow) {
  if (user.role !== "admin" || !user.station_id) return [];
  const rows = await env.DB.prepare(
    `SELECT r.id, r.station_id, s.name AS station_name, r.admin_id, r.weight_kg, r.created_at
     FROM station_transfers r
     JOIN stations s ON s.id = r.station_id
     WHERE r.station_id = ?
     ORDER BY r.created_at DESC
     LIMIT 100`,
  )
    .bind(user.station_id)
    .all<TransferRow>();
  return rows.results.map((transfer) => ({
    id: transfer.id,
    stationId: transfer.station_id,
    collectionPoint: transfer.station_name,
    weightKg: transfer.weight_kg,
    adminId: transfer.admin_id,
    createdAt: transfer.created_at,
  }));
}

async function leaderboardData(env: Env, period: "week" | "all") {
  const from =
    period === "week"
      ? (() => {
          const date = new Date();
          const day = date.getDay() || 7;
          date.setDate(date.getDate() - day + 1);
          date.setHours(0, 0, 0, 0);
          return date.getTime();
        })()
      : 0;
  const rows = await env.DB.prepare(
    `SELECT u.id AS user_id, u.name, COALESCE(u.faculty, 'Khác') AS faculty,
      COALESCE(SUM(t.points), 0) AS points, COALESCE(SUM(t.weight_kg), 0) AS kg
     FROM users u
     JOIN transactions t ON t.student_id = u.id
     WHERE t.status = 'confirmed' AND t.confirmed_at >= ?
     GROUP BY u.id, u.name, u.faculty
     ORDER BY points DESC, kg DESC
     LIMIT 100`,
  )
    .bind(from)
    .all<{ user_id: string; name: string; faculty: string; points: number; kg: number }>();
  return rows.results.map((row) => ({
    userId: row.user_id,
    name: row.name,
    faculty: row.faculty,
    points: row.points,
    kg: +row.kg.toFixed(2),
  }));
}

async function demoCampaignData(env: Env): Promise<DemoCampaignSummary> {
  const [students, totals, participants, allocation, typeRows, qualityRows] = await env.DB.batch([
    env.DB.prepare("SELECT COUNT(*) AS count FROM users WHERE id LIKE 'demo-student-%'"),
    env.DB.prepare(
      `SELECT COUNT(*) AS transaction_count, COALESCE(SUM(weight_kg), 0) AS total_kg,
        COALESCE(SUM(points), 0) AS total_points
       FROM transactions WHERE id LIKE 'demo-2026-%' AND status = 'confirmed'`,
    ),
    env.DB.prepare(
      `SELECT COUNT(DISTINCT student_id) AS count
       FROM transactions WHERE id LIKE 'demo-2026-%' AND status = 'confirmed'`,
    ),
    env.DB.prepare(
      `SELECT COALESCE(SUM(CAST(json_extract(a.metadata_json, '$.points') AS INTEGER)), 0) AS points
       FROM audit_events a
       JOIN transactions t ON t.id = a.entity_id
       WHERE t.id LIKE 'demo-2026-%'
         AND a.action = 'points_allocated'
         AND json_extract(a.metadata_json, '$.destination') = 'fundraising'`,
    ),
    env.DB.prepare(
      `SELECT json_extract(item.value, '$.plasticType') AS label,
        COALESCE(SUM(CAST(json_extract(item.value, '$.quantity') AS REAL)), 0) AS kg
       FROM transactions t, json_each(t.items_json) AS item
       WHERE t.id LIKE 'demo-2026-%' AND t.status = 'confirmed'
       GROUP BY label
       ORDER BY CASE label WHEN 'PET' THEN 1 WHEN 'PP' THEN 2 WHEN 'PS' THEN 3 WHEN 'HDPE' THEN 4 WHEN 'LDPE' THEN 5 ELSE 6 END`,
    ),
    env.DB.prepare(
      `SELECT json_extract(item.value, '$.cleanliness') AS label,
        COALESCE(SUM(CAST(json_extract(item.value, '$.quantity') AS REAL)), 0) AS kg
       FROM transactions t, json_each(t.items_json) AS item
       WHERE t.id LIKE 'demo-2026-%' AND t.status = 'confirmed'
       GROUP BY label
       ORDER BY CASE label WHEN 'CLEAN' THEN 1 WHEN 'NORMAL' THEN 2 WHEN 'DIRTY' THEN 3 ELSE 4 END`,
    ),
  ]);
  const studentCount = (students.results[0] as { count: number } | undefined)?.count ?? 0;
  const summary = totals.results[0] as
    { transaction_count: number; total_kg: number; total_points: number } | undefined;
  const participantCount = (participants.results[0] as { count: number } | undefined)?.count ?? 0;
  const fundraisingPoints = (allocation.results[0] as { points: number } | undefined)?.points ?? 0;
  const totalPoints = summary?.total_points ?? 0;
  const metrics = (result: D1Result<DemoCampaignMetric>) =>
    result.results.map((row) => ({ label: row.label, kg: +row.kg.toFixed(2) }));
  return {
    registeredStudents: studentCount,
    participantCount,
    transactionCount: summary?.transaction_count ?? 0,
    totalKg: +(summary?.total_kg ?? 0).toFixed(2),
    totalPoints,
    fundraisingPoints,
    fundraisingPercent: totalPoints ? Math.round((fundraisingPoints / totalPoints) * 100) : 0,
    byType: metrics(typeRows as D1Result<DemoCampaignMetric>),
    byQuality: metrics(qualityRows as D1Result<DemoCampaignMetric>),
  };
}

async function handleApi(request: Request, env: Env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/v1/, "") || "/";

  if (request.method === "GET" && path === "/health") return json(request, env, { ok: true });
  if (request.method === "GET" && path === "/stations") return stations(request, env);
  if (request.method === "GET" && path === "/leaderboard") {
    const period = url.searchParams.get("period") === "week" ? "week" : "all";
    return json(request, env, { period, rows: await leaderboardData(env, period) });
  }

  if (request.method === "POST" && path === "/auth/register") {
    const input = await body(request);
    const email = requireString(input.email, "email").toLowerCase();
    const name = requireString(input.name, "name");
    const password = requireString(input.password, "password");
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
      throw new HttpError(400, "Use a valid email and a password of at least 8 characters");
    }
    await enforceAuthRateLimit(env, "register", email);
    const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?")
      .bind(email)
      .first();
    if (existing) throw new HttpError(409, "Email already registered");
    const wantsAdmin = input.role === "admin";
    const role: Role = wantsAdmin ? "admin" : "student";
    const stationId = wantsAdmin ? requireString(input.stationId, "stationId") : null;
    if (wantsAdmin) {
      if (
        !env.ADMIN_INVITE_CODE ||
        typeof input.inviteCode !== "string" ||
        !(await timingSafeDigestEqual(input.inviteCode, env.ADMIN_INVITE_CODE))
      ) {
        throw new HttpError(403, "A valid admin invite is required");
      }
      const station = await env.DB.prepare("SELECT id FROM stations WHERE id = ? AND is_active = 1")
        .bind(stationId)
        .first();
      if (!station) throw new HttpError(400, "Station is not active");
    }
    const passwordData = await passwordRecord(password, env.PASSWORD_PEPPER);
    const now = Date.now();
    const user: UserRow = {
      id: randomId(),
      email,
      password_hash: passwordData.hash,
      password_salt: passwordData.salt,
      role,
      name,
      student_id: optionalString(input.studentId),
      faculty: optionalString(input.faculty),
      station_id: stationId,
      points: 0,
      total_kg: 0,
    };
    await env.DB.prepare(
      `INSERT INTO users (id, email, password_hash, password_salt, role, name, student_id, faculty, station_id, points, total_kg, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
    )
      .bind(
        user.id,
        user.email,
        user.password_hash,
        user.password_salt,
        user.role,
        user.name,
        user.student_id,
        user.faculty,
        user.station_id,
        now,
        now,
      )
      .run();
    const token = await signSession(
      { sub: user.id, role: user.role, stationId, exp: now + 7 * 86_400_000 },
      env.AUTH_SECRET,
    );
    return json(request, env, { token, user: await publicUser(env, user) }, 201);
  }

  if (request.method === "POST" && path === "/auth/login") {
    const input = await body(request);
    const email = requireString(input.email, "email").toLowerCase();
    const password = requireString(input.password, "password");
    await enforceAuthRateLimit(env, "login", email);
    const throttleKey = await loginThrottle(env, email);
    const user = await env.DB.prepare(
      "SELECT id, email, password_hash, password_salt, role, name, student_id, faculty, station_id, points, total_kg FROM users WHERE email = ?",
    )
      .bind(email)
      .first<UserRow>();
    if (
      !user ||
      !(await verifyPassword(password, user.password_hash, user.password_salt, env.PASSWORD_PEPPER))
    ) {
      await recordLoginFailure(env, throttleKey);
      throw new HttpError(401, "Email or password is incorrect");
    }
    await clearLoginThrottle(env, throttleKey);
    const token = await signSession(
      {
        sub: user.id,
        role: user.role,
        stationId: user.station_id,
        exp: Date.now() + 7 * 86_400_000,
      },
      env.AUTH_SECRET,
    );
    return json(request, env, { token, user: await publicUser(env, user) });
  }

  if (request.method === "GET" && path === "/me") {
    const { user } = await currentUser(request, env);
    return json(request, env, { user: await publicUser(env, user) });
  }

  if (request.method === "GET" && path === "/snapshot") {
    const { user } = await currentUser(request, env);
    const [profile, stations, transactions, collectionRuns, demoCampaign] = await Promise.all([
      publicUser(env, user),
      stationData(env),
      transactionData(env, user),
      transferData(env, user),
      user.role === "admin" ? demoCampaignData(env) : Promise.resolve(null),
    ]);
    return json(request, env, {
      user: profile,
      stations,
      transactions,
      collectionRuns,
      demoCampaign,
    });
  }

  if (request.method === "POST" && path === "/admin/transactions") {
    const { user } = await currentUser(request, env);
    if (user.role !== "admin" || !user.station_id)
      throw new HttpError(403, "Station admin access required");
    const input = await body(request);
    const calculated = calculate(input.items as ItemInput[]);
    const now = Date.now();
    const token = randomToken();
    const id = randomId();
    const expiresAt = now + 5 * 60_000;
    await env.DB.prepare(
      `INSERT INTO transactions (id, token_hash, station_id, admin_id, student_id, items_json, total_quantity, weight_kg, points, status, created_at, expires_at)
       VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, 'pending', ?, ?)`,
    )
      .bind(
        id,
        await digest(token),
        user.station_id,
        user.id,
        JSON.stringify(calculated.items),
        calculated.totalQuantity,
        calculated.weightKg,
        calculated.points,
        now,
        expiresAt,
      )
      .run();
    const station = await env.DB.prepare("SELECT name FROM stations WHERE id = ?")
      .bind(user.station_id)
      .first<{ name: string }>();
    return json(
      request,
      env,
      {
        id,
        token,
        userId: null,
        userName: null,
        userFaculty: null,
        adminId: user.id,
        stationId: user.station_id,
        collectionPoint: station?.name ?? user.station_id,
        ...calculated,
        status: "pending",
        createdAt: now,
        expiresAt,
        confirmedAt: null,
      },
      201,
    );
  }

  const cancelMatch = path.match(/^\/admin\/transactions\/([0-9a-f-]+)\/cancel$/);
  if (request.method === "POST" && cancelMatch) {
    const { user } = await currentUser(request, env);
    if (user.role !== "admin" || !user.station_id)
      throw new HttpError(403, "Station admin access required");
    const now = Date.now();
    const result = await env.DB.prepare(
      `UPDATE transactions SET status = 'cancelled', cancelled_at = ?
       WHERE id = ? AND admin_id = ? AND station_id = ? AND status = 'pending'`,
    )
      .bind(now, cancelMatch[1], user.id, user.station_id)
      .run();
    if (result.meta.changes !== 1) throw new HttpError(409, "Transaction cannot be cancelled");
    return json(request, env, { id: cancelMatch[1], cancelledAt: now });
  }

  const transactionMatch = path.match(/^\/transactions\/([A-Z0-9]+)(?:\/(confirm))?$/);
  if (transactionMatch) {
    const [, token, action] = transactionMatch;
    const { user } = await currentUser(request, env);
    const transaction = await env.DB.prepare(
      `SELECT t.id, t.station_id, t.admin_id, t.student_id, t.items_json, t.total_quantity,
        t.weight_kg, t.points, t.status, t.created_at, t.expires_at, t.confirmed_at,
        s.name AS station_name, u.name AS student_name, u.faculty AS student_faculty
       FROM transactions t
       JOIN stations s ON s.id = t.station_id
       LEFT JOIN users u ON u.id = t.student_id
       WHERE t.token_hash = ?`,
    )
      .bind(await digest(token))
      .first<TransactionViewRow>();
    if (!transaction) throw new HttpError(404, "QR transaction not found");
    const currentStatus = effectiveStatus(transaction);
    if (currentStatus === "expired" && transaction.status === "pending") {
      await env.DB.prepare(
        "UPDATE transactions SET status = 'expired' WHERE id = ? AND status = 'pending'",
      )
        .bind(transaction.id)
        .run();
    }
    if (request.method === "GET" && !action) {
      const canSeeStudent =
        transaction.student_id === user.id ||
        (user.role === "admin" && user.station_id === transaction.station_id);
      return json(request, env, transactionView(transaction, token, canSeeStudent));
    }
    if (request.method === "POST" && action === "confirm") {
      if (user.role !== "student") throw new HttpError(403, "Student access required");
      if (currentStatus !== "pending") throw new HttpError(409, `Transaction is ${currentStatus}`);
      const input = request.headers.get("content-type")?.includes("application/json")
        ? await body(request)
        : {};
      const destination = input.destination ?? "rewards";
      if (destination !== "fundraising" && destination !== "rewards") {
        throw new HttpError(400, "Choose fundraising or rewards for the points");
      }
      const now = Date.now();
      const results = await env.DB.batch([
        env.DB.prepare(
          "UPDATE transactions SET status = 'confirmed', student_id = ?, confirmed_at = ? WHERE id = ? AND status = 'pending' AND expires_at > ?",
        ).bind(user.id, now, transaction.id, now),
        env.DB.prepare(
          `UPDATE users SET points = points + ?, total_kg = total_kg + ?, updated_at = ?
           WHERE id = ?
             AND NOT EXISTS (SELECT 1 FROM point_ledger WHERE transaction_id = ?)
             AND EXISTS (
               SELECT 1 FROM transactions
               WHERE id = ? AND status = 'confirmed' AND student_id = ?
             )`,
        ).bind(
          transaction.points,
          transaction.weight_kg,
          now,
          user.id,
          transaction.id,
          transaction.id,
          user.id,
        ),
        env.DB.prepare(
          `INSERT INTO point_ledger (id, user_id, transaction_id, points, created_at)
           SELECT ?, ?, id, points, ? FROM transactions
           WHERE id = ? AND status = 'confirmed' AND student_id = ?`,
        ).bind(randomId(), user.id, now, transaction.id, user.id),
        env.DB.prepare(
          `INSERT INTO audit_events (id, actor_id, action, entity_type, entity_id, metadata_json, created_at)
           SELECT ?, ?, 'points_allocated', 'transaction', id, ?, ? FROM transactions
           WHERE id = ? AND status = 'confirmed' AND student_id = ?`,
        ).bind(
          randomId(),
          user.id,
          JSON.stringify({
            destination: destination as PointDestination,
            points: transaction.points,
          }),
          now,
          transaction.id,
          user.id,
        ),
      ]);
      if (results[0].meta.changes !== 1)
        throw new HttpError(409, "Transaction has already been used");
      return json(request, env, {
        id: transaction.id,
        points: transaction.points,
        weightKg: transaction.weight_kg,
        destination,
        confirmedAt: now,
      });
    }
  }

  if (request.method === "POST" && path.match(/^\/admin\/stations\/[^/]+\/transfers$/)) {
    const stationId = path.split("/")[3];
    const { user } = await currentUser(request, env);
    if (user.role !== "admin" || user.station_id !== stationId)
      throw new HttpError(403, "Station admin access required");
    const stock = await env.DB.prepare(
      `SELECT
        COALESCE((SELECT SUM(weight_kg) FROM transactions WHERE station_id = ? AND status = 'confirmed'), 0)
        - COALESCE((SELECT SUM(weight_kg) FROM station_transfers WHERE station_id = ?), 0) AS filled_kg`,
    )
      .bind(stationId, stationId)
      .first<{ filled_kg: number }>();
    const weightKg = +Math.max(0, stock?.filled_kg ?? 0).toFixed(2);
    if (!weightKg) throw new HttpError(409, "Station is empty");
    const input = await body(request);
    const now = Date.now();
    await env.DB.prepare(
      "INSERT INTO station_transfers (id, station_id, admin_id, weight_kg, created_at, note) VALUES (?, ?, ?, ?, ?, ?)",
    )
      .bind(randomId(), stationId, user.id, weightKg, now, optionalString(input.note))
      .run();
    return json(request, env, { stationId, weightKg, createdAt: now }, 201);
  }

  throw new HttpError(404, "Route not found");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers: headers(request, env) });
    try {
      return await handleApi(request, env);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      const message = error instanceof HttpError ? error.message : "Unexpected server error";
      const log = status >= 500 ? console.error : console.warn;
      log(
        JSON.stringify({
          message: "api request failed",
          status,
          path: new URL(request.url).pathname,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      return json(request, env, { error: message }, status);
    }
  },
} satisfies ExportedHandler<Env>;
