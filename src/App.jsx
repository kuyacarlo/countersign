import { useCallback, useEffect, useMemo, useState } from "react";
import { base44, goGoogleLogin, goAuthHost, isExternalHost, APP_HOST } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, RefreshCw, X } from "lucide-react";

const Claim = base44.entities.Claim;

const TTL_MS = 48 * 60 * 60 * 1000;

function statusLabel(s) {
  return (
    {
      pending: "pending",
      signed: "signed",
      rejected: "rejected",
      expired: "expired",
    }[s] || s
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [claims, setClaims] = useState([]);
  const [body, setBody] = useState("");
  const [reviewer, setReviewer] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authOtp, setAuthOtp] = useState("");
  const [authMode, setAuthMode] = useState("signin"); // signin | signup | otp
  const [authBusy, setAuthBusy] = useState(false);
  const [authHint, setAuthHint] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const email = (user?.email || "").toLowerCase();

  const load = useCallback(async () => {
    setError("");
    try {
      const me = await base44.auth.me().catch(() => null);
      setUser(me);
      if (me) {
        // Service-role expire; also works as demo cron substitute until a Workflow is wired
        await base44.functions.invoke("expireUnsigned", {}).catch(() => null);
      }
      const list = await Claim.list("-created_date");
      setClaims(list || []);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (window.location.pathname === "/login") {
      window.location.replace("/");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const offs = [];
    try {
      if (Claim.subscribe) offs.push(Claim.subscribe(() => load()));
    } catch {
      /* optional */
    }
    return () => offs.forEach((fn) => typeof fn === "function" && fn());
  }, [load]);

  const visible = useMemo(() => {
    if (filter === "all") return claims;
    if (filter === "mine") {
      return claims.filter(
        (c) =>
          c.claimer_email === email || c.reviewer_email === email,
      );
    }
    if (filter === "inbox") {
      return claims.filter(
        (c) => c.status === "pending" && c.reviewer_email === email,
      );
    }
    return claims.filter((c) => c.status === filter);
  }, [claims, filter, email]);

  const authFail = (err) => {
    const msg = String(err?.message || err?.data?.message || err);
    if (/domain is not valid/i.test(msg)) {
      return `Base44 rejected this host for auth. Use ${APP_HOST} (Vercel/custom domains need a Builder plan).`;
    }
    return msg;
  };

  const loginPassword = async (e) => {
    e.preventDefault();
    setAuthBusy(true);
    setError("");
    setAuthHint("");
    try {
      await base44.auth.loginViaEmailPassword(
        authEmail.trim(),
        authPassword,
      );
      await load();
    } catch (err) {
      setError(authFail(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const createAccount = async (e) => {
    e.preventDefault();
    setAuthBusy(true);
    setError("");
    setAuthHint("");
    try {
      await base44.auth.register({
        email: authEmail.trim(),
        password: authPassword,
      });
      setAuthMode("otp");
      setAuthHint("Check your email for a 6-digit code.");
    } catch (err) {
      setError(authFail(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setAuthBusy(true);
    setError("");
    setAuthHint("");
    try {
      await base44.auth.verifyOtp({
        email: authEmail.trim(),
        otpCode: authOtp.trim(),
      });
      await base44.auth.loginViaEmailPassword(
        authEmail.trim(),
        authPassword,
      );
      setAuthMode("signin");
      setAuthOtp("");
      await load();
    } catch (err) {
      setError(authFail(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const resendOtp = async () => {
    setAuthBusy(true);
    setError("");
    try {
      await base44.auth.resendOtp(authEmail.trim());
      setAuthHint("New code sent — check your inbox.");
    } catch (err) {
      setError(authFail(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const postClaim = async (e) => {
    e.preventDefault();
    if (!email || !body.trim() || !reviewer.trim()) return;
    const to = reviewer.trim().toLowerCase();
    if (to === email) {
      setError("Name someone else to countersign.");
      return;
    }
    await Claim.create({
      body: body.trim(),
      claimer_email: email,
      reviewer_email: to,
      status: "pending",
      note: "",
      expires_at: new Date(Date.now() + TTL_MS).toISOString(),
    });
    setBody("");
    setReviewer("");
    await load();
  };

  const sign = async (claim) => {
    if (claim.reviewer_email !== email || claim.status !== "pending") return;
    await Claim.update(claim.id, { status: "signed", note: "" });
    await load();
  };

  const reject = async (claim) => {
    if (claim.reviewer_email !== email || claim.status !== "pending") return;
    await Claim.update(claim.id, {
      status: "rejected",
      note: "Rejected by reviewer",
    });
    await load();
  };

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#0d0c0b] px-6 text-[#f0ede6]">
        <h1 className="font-mono text-2xl tracking-tight">
          countersign<span className="text-[#4a4844]">.</span>
        </h1>
        <p className="max-w-sm text-center text-sm text-[#888480]">
          A claim is gray until a named person countersigns. Reject or expire —
          it stays fake.
        </p>
        {isExternalHost() && (
          <div className="w-full max-w-xs space-y-2 rounded-lg border border-[#3a3732] bg-[#141312] p-3 text-center text-xs text-[#888480]">
            <p>
              You&apos;re on an external host. Base44 auth is reliable on{" "}
              <span className="text-[#c4a882]">*.base44.app</span> (custom
              domains need Builder).
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={goAuthHost}
            >
              Open Base44 host
            </Button>
          </div>
        )}
        {authMode !== "otp" && (
          <div className="flex w-full max-w-xs gap-2">
            <button
              type="button"
              onClick={() => {
                setAuthMode("signin");
                setError("");
                setAuthHint("");
              }}
              className={`flex-1 rounded-md border px-2 py-1.5 font-mono text-[0.72rem] ${
                authMode === "signin"
                  ? "border-[#c4a882] text-[#c4a882]"
                  : "border-[#252320] text-[#888480]"
              }`}
            >
              sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("signup");
                setError("");
                setAuthHint("");
              }}
              className={`flex-1 rounded-md border px-2 py-1.5 font-mono text-[0.72rem] ${
                authMode === "signup"
                  ? "border-[#c4a882] text-[#c4a882]"
                  : "border-[#252320] text-[#888480]"
              }`}
            >
              create account
            </button>
          </div>
        )}

        {authMode === "otp" ? (
          <form onSubmit={verifyOtp} className="w-full max-w-xs space-y-2">
            <p className="text-center text-xs text-[#888480]">
              Code sent to <span className="text-[#c4a882]">{authEmail}</span>
            </p>
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              placeholder="6-digit code"
              value={authOtp}
              onChange={(e) => setAuthOtp(e.target.value)}
            />
            <Button type="submit" disabled={authBusy} className="w-full">
              {authBusy ? "Verifying…" : "Verify & sign in"}
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={authBusy}
                onClick={resendOtp}
                className="flex-1"
              >
                Resend code
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={authBusy}
                onClick={() => {
                  setAuthMode("signup");
                  setAuthOtp("");
                  setError("");
                  setAuthHint("");
                }}
                className="flex-1"
              >
                Back
              </Button>
            </div>
          </form>
        ) : (
          <form
            onSubmit={authMode === "signup" ? createAccount : loginPassword}
            className="w-full max-w-xs space-y-2"
          >
            <Input
              type="email"
              required
              autoComplete="email"
              placeholder="email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
            />
            <Input
              type="password"
              required
              autoComplete={
                authMode === "signup" ? "new-password" : "current-password"
              }
              placeholder="password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
            />
            <Button type="submit" disabled={authBusy} className="w-full">
              {authBusy
                ? authMode === "signup"
                  ? "Creating…"
                  : "Signing in…"
                : authMode === "signup"
                  ? "Create account"
                  : "Sign in with email"}
            </Button>
          </form>
        )}

        {authMode !== "otp" && (
          <Button
            type="button"
            variant="outline"
            onClick={goGoogleLogin}
            className="w-full max-w-xs"
          >
            Continue with Google
          </Button>
        )}
        {authHint && (
          <p className="max-w-xs text-center text-sm text-[#c4a882]">
            {authHint}
          </p>
        )}
        {error && (
          <p className="max-w-xs text-center text-sm text-red-300">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0c0b] text-[#f0ede6]">
      <header className="border-b border-[#252320] px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div>
            <h1 className="font-mono text-lg tracking-tight">
              countersign<span className="text-[#4a4844]">.</span>
            </h1>
            <p className="text-xs text-[#888480]">{email}</p>
          </div>
          <Button variant="ghost" onClick={load} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-8 px-6 py-8">
        {error && (
          <p className="rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}

        <form
          onSubmit={postClaim}
          className="space-y-2 rounded-xl border border-[#252320] bg-[#141312] p-4"
        >
          <h2 className="font-mono text-xs uppercase tracking-widest text-[#888480]">
            New claim
          </h2>
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="I shipped X / paid Y / fixed Z"
            required
          />
          <Input
            type="email"
            value={reviewer}
            onChange={(e) => setReviewer(e.target.value)}
            placeholder="reviewer email (must countersign)"
            required
          />
          <Button type="submit" className="w-full">
            Post — stays gray until they sign
          </Button>
          <p className="text-[11px] text-[#888480]">
            Pending claims expire after 48 hours.
          </p>
        </form>

        <div className="flex flex-wrap gap-2">
          {[
            ["all", "all"],
            ["inbox", "my inbox"],
            ["mine", "involves me"],
            ["pending", "pending"],
            ["signed", "signed"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`rounded-md border px-2.5 py-1 font-mono text-[0.72rem] ${
                filter === id
                  ? "border-[#c4a882] text-[#c4a882]"
                  : "border-[#252320] text-[#888480]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-[#888480]">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-[#888480]">Nothing here yet.</p>
        ) : (
          <ul className="divide-y divide-[#252320] border-y border-[#252320]">
            {visible.map((c) => {
              const pendingForMe =
                c.status === "pending" && c.reviewer_email === email;
              const tone =
                c.status === "signed"
                  ? "border-l-[#6b9e6b]"
                  : c.status === "pending"
                    ? "border-l-[#4a4844]"
                    : "border-l-[#5c3a3a]";
              return (
                <li
                  key={c.id}
                  className={`border-l-2 py-4 pl-4 ${tone} ${
                    c.status === "pending" ? "opacity-80" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p
                      className={`text-[0.95rem] ${
                        c.status === "signed"
                          ? "text-[#f0ede6]"
                          : "text-[#888480]"
                      }`}
                    >
                      {c.body}
                    </p>
                    <span className="font-mono text-[0.68rem] text-[#888480]">
                      {statusLabel(c.status)}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-[0.68rem] text-[#5c5854]">
                    {c.claimer_email} → {c.reviewer_email}
                    {c.expires_at && c.status === "pending"
                      ? ` · expires ${new Date(c.expires_at).toLocaleString()}`
                      : ""}
                  </p>
                  {c.note && (
                    <p className="mt-1 text-xs text-[#888480]">{c.note}</p>
                  )}
                  {pendingForMe && (
                    <div className="mt-3 flex gap-2">
                      <Button
                        type="button"
                        onClick={() => sign(c)}
                        className="!bg-[#6b9e6b] !text-[#0d0c0b] hover:!bg-[#7aaf7a]"
                      >
                        <Check className="h-4 w-4" />
                        Countersign
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => reject(c)}
                      >
                        <X className="h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
