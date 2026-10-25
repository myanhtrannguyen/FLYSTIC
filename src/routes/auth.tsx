import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useYoha, useTranslation, type Role, type StudentOrganization } from "@/lib/yoha-store";
import { PlasticPatternBackdrop } from "@/components/YohaLanding";

const HUST_SCHOOLS = [
  "Trường Công nghệ Thông tin và Truyền thông",
  "Trường Cơ khí",
  "Trường Hoá và Khoa học Sự sống",
  "Trường Điện - Điện tử",
  "Trường Kinh tế",
  "Trường Vật liệu",
  "Khoa Toán Tin",
  "Khoa Khoa học và Công nghệ Giáo dục",
  "Khoa Vật lý Kỹ thuật",
  "Khoa Ngoại ngữ",
];

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "FLYSTIC — Auth" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { signIn, isRemote } = useYoha();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [role, setRole] = useState<Role>("student");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [organization, setOrganization] = useState<StudentOrganization | "">("");
  const [school, setSchool] = useState("");
  const [studentId, setStudentId] = useState("");
  const [organizationDetail, setOrganizationDetail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRegister = mode === "register";
  const isStudentRegistration = mode === "register" && role === "student";
  const passwordMismatch = isRegister && confirmPassword.length > 0 && password !== confirmPassword;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (
      !email ||
      !password ||
      (isRegister &&
        (!name ||
          password !== confirmPassword ||
          (isRemote && role === "admin" && !inviteCode) ||
          (role === "student" &&
            (!birthDate ||
              !organization ||
              (organization === "hust" && (!school || !studentId)) ||
              (organization === "other" && !organizationDetail)))))
    )
      return;
    setIsSubmitting(true);
    try {
      const user = await signIn({
        email,
        password,
        mode,
        role,
        registration: {
          name,
          birthDate,
          organization: organization || undefined,
          school,
          studentId,
          organizationDetail,
        },
        inviteCode,
      });
      navigate({ to: user.role === "admin" ? "/admin" : "/app", replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("authServerError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-plastic-pattern">
      <PlasticPatternBackdrop />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          {t("backHome")}
        </Link>

        <div className="rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-pop)]">
          <div className="mb-6 flex items-center gap-2">
            <div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground font-bold">
              F
            </div>
            <span className="text-2xl font-bold">FLYSTIC</span>
          </div>

          <h1 className="text-2xl font-bold">
            {mode === "login" ? t("authLogin") : t("authRegister")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login" ? t("authWelcomeBack") : t("authStartGreen")}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-secondary p-1">
            <button
              type="button"
              onClick={() => setRole("student")}
              className={`rounded-xl py-2.5 text-sm font-semibold transition ${role === "student" ? "bg-card shadow text-foreground" : "text-muted-foreground"}`}
            >
              {t("authStudentRole")}
            </button>
            <button
              type="button"
              onClick={() => setRole("admin")}
              className={`rounded-xl py-2.5 text-sm font-semibold transition ${role === "admin" ? "bg-card shadow text-foreground" : "text-muted-foreground"}`}
            >
              {t("authAdminRole")}
            </button>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "register" && (
              <Field label={t("authFullName")}>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Nguyễn Văn A"
                  className="w-full rounded-xl bg-secondary px-4 py-3 ring-1 ring-border focus:outline-none focus:ring-primary"
                />
              </Field>
            )}
            {isStudentRegistration && (
              <>
                <Field label={t("authBirthDate")}>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    required
                    className="w-full rounded-xl bg-secondary px-4 py-3 ring-1 ring-border focus:outline-none focus:ring-primary"
                  />
                </Field>
                <Field label={t("authOrganization")}>
                  <select
                    value={organization}
                    onChange={(e) => {
                      setOrganization(e.target.value as StudentOrganization | "");
                      setSchool("");
                      setStudentId("");
                      setOrganizationDetail("");
                    }}
                    required
                    className="w-full rounded-xl bg-secondary px-4 py-3 ring-1 ring-border focus:outline-none focus:ring-primary"
                  >
                    <option value="" disabled>
                      {t("authOrganizationPlaceholder")}
                    </option>
                    <option value="hust">{t("authOrganizationHust")}</option>
                    <option value="other">{t("authOrganizationOther")}</option>
                  </select>
                </Field>
                {organization === "hust" && (
                  <>
                    <Field label={t("authSchool")}>
                      <select
                        value={school}
                        onChange={(e) => setSchool(e.target.value)}
                        required
                        className="w-full rounded-xl bg-secondary px-4 py-3 ring-1 ring-border focus:outline-none focus:ring-primary"
                      >
                        <option value="" disabled>
                          {t("authSchoolPlaceholder")}
                        </option>
                        {HUST_SCHOOLS.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </Field>
                    {school && (
                      <Field label={t("authStudentId")}>
                        <input
                          value={studentId}
                          onChange={(e) => setStudentId(e.target.value)}
                          required
                          placeholder={t("authStudentIdPlaceholder")}
                          className="w-full rounded-xl bg-secondary px-4 py-3 ring-1 ring-border focus:outline-none focus:ring-primary"
                        />
                      </Field>
                    )}
                  </>
                )}
                {organization === "other" && (
                  <Field label={t("authOrganizationDetail")}>
                    <input
                      value={organizationDetail}
                      onChange={(e) => setOrganizationDetail(e.target.value)}
                      required
                      placeholder={t("authOrganizationDetailPlaceholder")}
                      className="w-full rounded-xl bg-secondary px-4 py-3 ring-1 ring-border focus:outline-none focus:ring-primary"
                    />
                  </Field>
                )}
              </>
            )}
            <Field label={role === "admin" ? t("authAdminEmail") : t("authStudentEmail")}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={
                  role === "admin"
                    ? t("authEmailPlaceholderAdmin")
                    : t("authEmailPlaceholderStudent")
                }
                className="w-full rounded-xl bg-secondary px-4 py-3 ring-1 ring-border focus:outline-none focus:ring-primary"
              />
            </Field>
            {isRegister ? (
              <>
                <Field label={t("authPassword")}>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder={t("authPasswordPlaceholder")}
                    className="w-full rounded-xl bg-secondary px-4 py-3 ring-1 ring-border focus:outline-none focus:ring-primary"
                  />
                </Field>
                {role === "admin" && isRemote && (
                  <Field label={t("authAdminInviteCode")}>
                    <input
                      type="password"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      required
                      className="w-full rounded-xl bg-secondary px-4 py-3 ring-1 ring-border focus:outline-none focus:ring-primary"
                    />
                  </Field>
                )}
                <Field label={t("authConfirmPassword")}>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    aria-invalid={passwordMismatch}
                    placeholder={t("authPasswordPlaceholder")}
                    className="w-full rounded-xl bg-secondary px-4 py-3 ring-1 ring-border focus:outline-none focus:ring-primary aria-[invalid=true]:ring-coral"
                  />
                  {passwordMismatch && (
                    <p className="mt-1.5 text-xs font-medium text-coral">
                      {t("authPasswordMismatch")}
                    </p>
                  )}
                </Field>
              </>
            ) : (
              <Field label={t("authPassword")}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder={t("authPasswordPlaceholder")}
                  className="w-full rounded-xl bg-secondary px-4 py-3 ring-1 ring-border focus:outline-none focus:ring-primary"
                />
              </Field>
            )}

            {error && (
              <p className="rounded-xl bg-coral/15 p-3 text-sm font-medium text-coral">{error}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || passwordMismatch}
              className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-pop)] transition hover:-translate-y-0.5"
            >
              {isSubmitting
                ? t("authSubmitting")
                : mode === "login"
                  ? t("authLogin")
                  : t("authRegister")}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? t("authNoAccount") : t("authHaveAccount")}
            <button
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="font-semibold text-primary hover:underline"
            >
              {mode === "login" ? t("authSignUpNow") : t("authSignInNow")}
            </button>
          </p>
        </div>

        {!isRemote && (
          <p className="mt-6 text-center text-xs text-muted-foreground">{t("authDemoNote")}</p>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
