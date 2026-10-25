import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  getTransactionStatus,
  localeToNumberFormat,
  useTranslation,
  useYoha,
} from "@/lib/yoha-store";

export const Route = createFileRoute("/app/leaderboard")({
  component: LeaderboardPage,
});

type StudentRow = {
  userId: string;
  name: string;
  faculty: string;
  points: number;
  kg: number;
};

function startOfCurrentWeek() {
  const date = new Date();
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function LeaderboardPage() {
  const { state, isRemote, getLeaderboard } = useYoha();
  const { t } = useTranslation();
  const user = state.user!;
  const [tab, setTab] = useState<"week" | "all" | "faculty">("week");
  const [remoteRows, setRemoteRows] = useState<StudentRow[]>(state.leaderboard);

  useEffect(() => {
    if (!isRemote) return;
    void getLeaderboard(tab === "week" ? "week" : "all")
      .then((rows) => setRemoteRows(rows))
      .catch(() => setRemoteRows([]));
  }, [getLeaderboard, isRemote, tab]);

  const confirmed = useMemo(
    () =>
      state.transactions.filter(
        (transaction) =>
          getTransactionStatus(transaction) === "confirmed" && transaction.userId !== null,
      ),
    [state.transactions],
  );
  const rows = useMemo(() => {
    if (isRemote) {
      const leaderboard = new Map(remoteRows.map((row) => [row.userId, row]));
      if (!leaderboard.has(user.id)) {
        leaderboard.set(user.id, {
          userId: user.id,
          name: user.name,
          faculty: user.faculty ?? "Khác",
          points: tab === "week" ? 0 : state.points,
          kg: tab === "week" ? 0 : state.totalKg,
        });
      }
      return [...leaderboard.values()].sort((a, b) => b.points - a.points || b.kg - a.kg);
    }
    const from = tab === "week" ? startOfCurrentWeek() : 0;
    const leaderboard = new Map<string, StudentRow>();

    confirmed
      .filter((transaction) => (transaction.confirmedAt ?? transaction.createdAt) >= from)
      .forEach((transaction) => {
        const current = leaderboard.get(transaction.userId!);
        leaderboard.set(transaction.userId!, {
          userId: transaction.userId!,
          name: transaction.userName ?? "Sinh viên FLYSTIC",
          faculty: transaction.userFaculty ?? "Khác",
          points: (current?.points ?? 0) + transaction.points,
          kg: +(current?.kg ?? 0) + transaction.weightKg,
        });
      });

    if (!leaderboard.has(user.id)) {
      leaderboard.set(user.id, {
        userId: user.id,
        name: user.name,
        faculty: user.faculty ?? "Khác",
        points: tab === "week" ? 0 : state.points,
        kg: tab === "week" ? 0 : state.totalKg,
      });
    }

    return [...leaderboard.values()]
      .map((row) => ({ ...row, kg: +row.kg.toFixed(2) }))
      .sort((a, b) => b.points - a.points || b.kg - a.kg);
  }, [confirmed, isRemote, remoteRows, state.points, state.totalKg, tab, user]);
  const facultyRows = useMemo(() => {
    const faculties = new Map<string, { name: string; points: number; members: Set<string> }>();
    rows.forEach((row) => {
      const current = faculties.get(row.faculty) ?? {
        name: row.faculty,
        points: 0,
        members: new Set<string>(),
      };
      current.points += row.points;
      current.members.add(row.userId);
      faculties.set(row.faculty, current);
    });
    return [...faculties.values()].sort((a, b) => b.points - a.points);
  }, [rows]);

  const myRank = rows.findIndex((row) => row.userId === user.id) + 1;
  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <div className="mx-auto max-w-md px-5 pt-8 animate-fade-in">
      <Link to="/app" className="text-sm font-semibold text-muted-foreground">
        {t("backHome")}
      </Link>
      <h1 className="mt-2 text-2xl font-bold">🏆 {t("studentLeaderboard")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("leaderboardDescription")}</p>

      <div className="mt-4 inline-flex rounded-full bg-secondary p-1 text-xs font-semibold">
        {[
          { k: "week", l: t("leaderboardWeek") },
          { k: "all", l: t("leaderboardAll") },
          { k: "faculty", l: t("leaderboardFaculty") },
        ].map((item) => (
          <button
            key={item.k}
            onClick={() => setTab(item.k as typeof tab)}
            className={`rounded-full px-4 py-1.5 transition ${tab === item.k ? "bg-foreground text-background" : "text-muted-foreground"}`}
          >
            {item.l}
          </button>
        ))}
      </div>

      {tab !== "faculty" ? (
        <>
          {rows.length > 0 && (
            <section className="mt-6 grid grid-cols-3 items-end gap-2">
              {[1, 0, 2].map((index, position) => {
                const row = top3[index];
                if (!row) return <div key={position} />;
                const height = index === 0 ? "h-32" : index === 1 ? "h-24" : "h-20";
                const tone =
                  index === 0
                    ? "bg-sunshine text-foreground"
                    : index === 1
                      ? "bg-leaf/40 text-foreground"
                      : "bg-coral/40 text-foreground";
                const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉";

                return (
                  <div key={row.userId} className="flex flex-col items-center">
                    <div className="text-2xl">{medal}</div>
                    <div className="grid size-14 place-items-center rounded-full bg-card text-2xl ring-2 ring-primary/30">
                      {row.userId === user.id ? "🧑" : "♻️"}
                    </div>
                    <p className="mt-1 truncate text-[11px] font-bold">
                      {row.name.split(" ").slice(-2).join(" ")}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {row.points.toLocaleString(localeToNumberFormat(state.locale))}đ
                    </p>
                    <div
                      className={`mt-1 grid w-full place-items-center rounded-t-xl ${height} ${tone} font-black text-lg`}
                    >
                      {index + 1}
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          <section className="mt-6 rounded-2xl border-2 border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-full bg-primary font-bold text-primary-foreground">
                #{myRank}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">{t("leaderboardYourRank")}</p>
                <p className="text-xs text-muted-foreground">
                  {tab === "week"
                    ? `${rows.find((row) => row.userId === user.id)?.points.toLocaleString(localeToNumberFormat(state.locale)) ?? 0} ${t("studentPoints")}`
                    : `${state.points.toLocaleString(localeToNumberFormat(state.locale))} ${t("studentPoints")} · ${state.totalKg.toFixed(1)} kg`}
                </p>
              </div>
              <span className="text-2xl">🌟</span>
            </div>
          </section>

          <ul className="mt-4 space-y-2">
            {rest.map((row, index) => {
              const rank = index + 4;
              const isMe = row.userId === user.id;
              return (
                <li
                  key={row.userId}
                  className={`flex items-center gap-3 rounded-2xl border p-3 ${isMe ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}
                >
                  <span className="w-6 text-center text-sm font-bold text-muted-foreground">
                    {rank}
                  </span>
                  <span className="grid size-9 place-items-center rounded-full bg-secondary text-lg">
                    {isMe ? "🧑" : "♻️"}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{row.name}</p>
                    <p className="text-[11px] text-muted-foreground">{row.faculty}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary">
                      {row.points.toLocaleString(localeToNumberFormat(state.locale))}đ
                    </p>
                    <p className="text-[10px] text-muted-foreground">{row.kg.toFixed(1)} kg</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <ul className="mt-6 space-y-2">
          {facultyRows.map((faculty, index) => (
            <li
              key={faculty.name}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <span
                className={`grid size-10 place-items-center rounded-full font-bold ${index === 0 ? "bg-sunshine" : index === 1 ? "bg-leaf/40" : index === 2 ? "bg-coral/40" : "bg-secondary text-muted-foreground"}`}
              >
                {index + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold">{faculty.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {faculty.members.size} {t("leaderboardMembers")}
                </p>
              </div>
              <p className="text-sm font-bold text-primary">
                {faculty.points.toLocaleString(localeToNumberFormat(state.locale))}đ
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 rounded-3xl bg-gradient-to-br from-primary/15 to-leaf/10 p-5 ring-1 ring-primary/20">
        <p className="text-sm font-bold">💡 {t("leaderboardTipsTitle")}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
          <li>{t("leaderboardTipCleanDry")}</li>
          <li>{t("leaderboardTipPrioritize")}</li>
          <li>{t("leaderboardTipInviteFriends")}</li>
        </ul>
      </div>
      <div className="h-8" />
    </div>
  );
}
