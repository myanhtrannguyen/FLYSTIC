import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const outputDirectory = resolve(scriptDirectory, "../seeds/june-july-2026-demo");
const studentCount = 1024;
const transactionCount = 220;
const totalKg = 49.82;
const categoryUnits = { PET: 2405, PP: 1210, PS: 725, HDPE: 405, LDPE: 237 };
const faculties = [
  "Trường Công nghệ Thông tin và Truyền thông",
  "Trường Cơ khí",
  "Trường Hóa và Khoa học Sự sống",
  "Trường Điện - Điện tử",
  "Trường Toán - Tin",
  "Trường Vật liệu",
  "Trường Kinh tế",
  "Trường Ngoại ngữ",
];
const familyNames = [
  "Nguyễn",
  "Trần",
  "Lê",
  "Phạm",
  "Hoàng",
  "Vũ",
  "Đặng",
  "Bùi",
  "Đỗ",
  "Hồ",
  "Dương",
  "Đinh",
];
const middleNames = [
  "Minh",
  "Thảo",
  "Khánh",
  "Quỳnh",
  "Gia",
  "Hải",
  "Bảo",
  "Thu",
  "Anh",
  "Phương",
  "Ngọc",
  "Tuệ",
];
const givenNames = [
  "Anh",
  "Bình",
  "Châu",
  "Duy",
  "Giang",
  "Hà",
  "Hân",
  "Huy",
  "Khoa",
  "Lam",
  "Linh",
  "Long",
  "Mai",
  "Minh",
  "My",
  "Nam",
  "Nga",
  "Nhi",
  "Phong",
  "Phúc",
  "Quân",
  "Sơn",
  "Thư",
  "Trang",
  "Vân",
];
const pointBase = { PET: 10, HDPE: 10, PP: 8, LDPE: 2, PS: 1 };
const qualityMultiplier = { CLEAN: 1.5, NORMAL: 1, DIRTY: 0.5 };

function sql(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const random = seededRandom(20260601);
const pick = (values) => values[Math.floor(random() * values.length)];

function shuffle(values) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [values[index], values[other]] = [values[other], values[index]];
  }
  return values;
}

function chunk(values, size) {
  return Array.from({ length: Math.ceil(values.length / size) }, (_, index) =>
    values.slice(index * size, (index + 1) * size),
  );
}

function statementFile(statements) {
  return [
    "-- FLYSTIC demo data only. Do not present as real operational records.",
    ...statements,
    "",
  ].join("\n");
}

function pointFor(quantity, plasticType, cleanliness) {
  return Math.round(quantity * pointBase[plasticType] * qualityMultiplier[cleanliness]);
}

function studentStatements() {
  return Array.from({ length: studentCount }, (_, index) => {
    const number = index + 1;
    const name = `${pick(familyNames)} ${pick(middleNames)} ${pick(givenNames)}`;
    const studentId = `2026${String(number).padStart(5, "0")}`;
    const salt = randomBytes(16).toString("base64url");
    const disabledHash = `v2$16384$${randomBytes(32).toString("base64url")}`;
    const now = Date.UTC(2026, 5, 1) + index * 500;
    return `(${sql(`demo-student-${String(number).padStart(4, "0")}`)}, ${sql(`demo.student.${String(number).padStart(4, "0")}@example.invalid`)}, ${sql(disabledHash)}, ${sql(salt)}, 'student', ${sql(name)}, ${sql(studentId)}, ${sql(faculties[index % faculties.length])}, NULL, 0, 0, ${now}, ${now})`;
  });
}

function studentInsertStatements(rows) {
  const columns =
    "(id, email, password_hash, password_salt, role, name, student_id, faculty, station_id, points, total_kg, created_at, updated_at)";
  return chunk(rows, 128).map(
    (batch) => `INSERT OR IGNORE INTO users ${columns} VALUES\n${batch.join(",\n")};`,
  );
}

function transactionWeights() {
  const totalUnits = Math.round(totalKg * 100);
  const weights = Array(transactionCount).fill(12);
  let remaining = totalUnits - weights.reduce((sum, weight) => sum + weight, 0);
  while (remaining > 0) {
    const index = Math.floor(random() * weights.length);
    const increment = Math.min(remaining, 1 + Math.floor(random() * 12));
    weights[index] += increment;
    remaining -= increment;
  }
  return shuffle(weights);
}

function allocateFundraising(pointsByTransaction) {
  const target = Math.round(pointsByTransaction.reduce((sum, points) => sum + points, 0) * 0.86);
  const reachable = new Map([[0, []]]);
  pointsByTransaction.forEach((points, index) => {
    for (const [total, chosen] of [...reachable.entries()]) {
      const next = total + points;
      if (next <= target && !reachable.has(next)) reachable.set(next, [...chosen, index]);
    }
  });
  const best = [...reachable.keys()].reduce((closest, value) =>
    Math.abs(value - target) < Math.abs(closest - target) ? value : closest,
  );
  return new Set(reachable.get(best));
}

function transactionStatements() {
  const units = [];
  Object.entries(categoryUnits).forEach(([plasticType, quantity]) => {
    for (let index = 0; index < quantity; index += 1) units.push(plasticType);
  });
  if (units.length !== Math.round(totalKg * 100)) throw new Error("Invalid demo weight allocation");
  shuffle(units);

  const weights = transactionWeights();
  const transactions = [];
  let cursor = 0;
  weights.forEach((weightUnits, index) => {
    const grouped = new Map();
    units.slice(cursor, cursor + weightUnits).forEach((plasticType) => {
      grouped.set(plasticType, (grouped.get(plasticType) ?? 0) + 1);
    });
    cursor += weightUnits;
    const cleanliness = random() < 0.31 ? "CLEAN" : random() < 0.83 ? "NORMAL" : "DIRTY";
    const items = [...grouped.entries()].map(([plasticType, quantity]) => {
      const amount = quantity / 100;
      return {
        plasticType,
        quantity: amount,
        cleanliness,
        points: pointFor(amount, plasticType, cleanliness),
      };
    });
    const points = items.reduce((sum, item) => sum + item.points, 0);
    const number = index + 1;
    const createdAt = Date.UTC(2026, 5, 1) + Math.floor(random() * 60 * 86_400_000);
    transactions.push({
      id: `demo-2026-${String(number).padStart(4, "0")}`,
      studentId: `demo-student-${String(((index * 37) % 284) + 1).padStart(4, "0")}`,
      items,
      points,
      weightKg: weightUnits / 100,
      createdAt,
    });
  });
  if (cursor !== units.length) throw new Error("Unallocated demo material");

  const fundraising = allocateFundraising(transactions.map((transaction) => transaction.points));
  const statements = transactions.flatMap((transaction, index) => {
    const allocation = fundraising.has(index) ? "fundraising" : "rewards";
    const tokenHash = `demo-token-hash-${String(index + 1).padStart(4, "0")}`;
    const ledgerId = `demo-ledger-${String(index + 1).padStart(4, "0")}`;
    const auditId = `demo-audit-${String(index + 1).padStart(4, "0")}`;
    const metadata = JSON.stringify({
      destination: allocation,
      points: transaction.points,
      source: "demo",
    });
    return [
      `INSERT OR IGNORE INTO transactions (id, token_hash, station_id, admin_id, student_id, items_json, total_quantity, weight_kg, points, status, created_at, expires_at, confirmed_at) VALUES (${sql(transaction.id)}, ${sql(tokenHash)}, 'innovation-center', (SELECT id FROM users WHERE role = 'admin' AND station_id = 'innovation-center' ORDER BY created_at LIMIT 1), ${sql(transaction.studentId)}, ${sql(JSON.stringify(transaction.items))}, ${transaction.weightKg}, ${transaction.weightKg}, ${transaction.points}, 'confirmed', ${transaction.createdAt}, ${transaction.createdAt + 300_000}, ${transaction.createdAt});`,
      `INSERT OR IGNORE INTO point_ledger (id, user_id, transaction_id, points, created_at) VALUES (${sql(ledgerId)}, ${sql(transaction.studentId)}, ${sql(transaction.id)}, ${transaction.points}, ${transaction.createdAt});`,
      `INSERT OR IGNORE INTO audit_events (id, actor_id, action, entity_type, entity_id, metadata_json, created_at) VALUES (${sql(auditId)}, ${sql(transaction.studentId)}, 'points_allocated', 'transaction', ${sql(transaction.id)}, ${sql(metadata)}, ${transaction.createdAt});`,
    ];
  });
  statements.push(
    `UPDATE users SET points = COALESCE((SELECT SUM(points) FROM point_ledger WHERE user_id = users.id AND transaction_id LIKE 'demo-2026-%'), 0), total_kg = COALESCE((SELECT SUM(weight_kg) FROM transactions WHERE student_id = users.id AND id LIKE 'demo-2026-%' AND status = 'confirmed'), 0), updated_at = ${Date.UTC(2026, 6, 31)} WHERE id LIKE 'demo-student-%';`,
  );
  const fundraisingPoints = transactions
    .filter((_, index) => fundraising.has(index))
    .reduce((sum, transaction) => sum + transaction.points, 0);
  const totalPoints = transactions.reduce((sum, transaction) => sum + transaction.points, 0);
  return { statements, summary: { transactions, totalPoints, fundraisingPoints } };
}

const students = studentInsertStatements(studentStatements());
const { statements: transactions, summary } = transactionStatements();
await mkdir(outputDirectory, { recursive: true });
for (const [index, rows] of chunk(students, 4).entries()) {
  await writeFile(resolve(outputDirectory, `01-students-${index + 1}.sql`), statementFile(rows));
}
await writeFile(resolve(outputDirectory, "02-transactions.sql"), statementFile(transactions));
await writeFile(
  resolve(outputDirectory, "README.md"),
  `# FLYSTIC June–July 2026 demo dataset\n\nThis seed is deliberately fictional and is only for product demonstration screenshots.\n\n- Registered student accounts: ${studentCount}\n- Confirmed transactions: ${transactionCount}\n- Total plastic collected: ${totalKg.toFixed(2)} kg\n- PET / PP / PS / HDPE / LDPE: 24.05 / 12.10 / 7.25 / 4.05 / 2.37 kg\n- Fundraising allocation: ${summary.fundraisingPoints} / ${summary.totalPoints} points (${((summary.fundraisingPoints / summary.totalPoints) * 100).toFixed(1)}%)\n- All generated emails use example.invalid; no real person is represented.\n`,
);
console.log(
  `Generated ${studentCount} demo students and ${transactionCount} transactions in ${outputDirectory}`,
);
