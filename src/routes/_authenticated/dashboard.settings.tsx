import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireRole } from "@/lib/require-role";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  beforeLoad: requireRole(["user"]),
  component: AccountSettings,
});

type Mosque = { id: string; name: string; city: string | null };

function AccountSettings() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [mosqueId, setMosqueId] = useState("");
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [loading, setLoading] = useState(true);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const [nameError, setNameError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const [{ data: userData }, { data: mosqueList }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("mosques").select("id, name, city").order("name"),
      ]);
      if (!active) return;
      setMosques((mosqueList as Mosque[]) ?? []);
      if (userData.user) {
        setUserId(userData.user.id);
        setEmail(userData.user.email ?? "");
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone, mosque_id, avatar_url")
          .eq("id", userData.user.id)
          .maybeSingle();
        if (!active) return;
        setFullName((profile?.full_name as string | null) ?? "");
        setPhone((profile?.phone as string | null) ?? "");
        setMosqueId((profile?.mosque_id as string | null) ?? "");
        setAvatarUrl((profile?.avatar_url as string | null) ?? null);

      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const pwChecks = useMemo(
    () => ({
      length: newPassword.length >= 8,
      lower: /[a-z]/.test(newPassword),
      upper: /[A-Z]/.test(newPassword),
      digit: /\d/.test(newPassword),
    }),
    [newPassword],
  );

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);
    setNameError(null);

    if (!fullName.trim()) {
      setNameError("Full name is required.");
      return;
    }
    if (!userId) return;

    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        mosque_id: mosqueId || null,
      })
      .eq("id", userId);
    setSavingProfile(false);

    if (error) {
      setProfileError(error.message);
      return;
    }
    setProfileSuccess(true);
    setTimeout(() => setProfileSuccess(false), 4000);
  }

  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (!pwChecks.length || !pwChecks.lower || !pwChecks.upper || !pwChecks.digit) {
      setPasswordError("New password doesn't meet the requirements.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match.");
      return;
    }

    setUpdatingPassword(true);
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (signInErr) {
      setUpdatingPassword(false);
      setPasswordError("Current password is incorrect.");
      return;
    }

    const { error: updateErr } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setUpdatingPassword(false);

    if (updateErr) {
      setPasswordError(updateErr.message);
      return;
    }
    setPasswordSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setTimeout(() => setPasswordSuccess(false), 4000);
  }

  const initials =
    (fullName || email || "U")
      .split(" ")
      .filter(Boolean)
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    setAvatarError(null);
    setAvatarSuccess(false);
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !userId) return;

    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setAvatarError("Please choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Image is too large. Maximum size is 2MB.");
      return;
    }

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${userId}/avatar.${ext}`;

    setUploading(true);
    const { error: uploadErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (uploadErr) {
      setUploading(false);
      setAvatarError(uploadErr.message);
      return;
    }

    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = `${pub.publicUrl}?v=${Date.now()}`;

    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", userId);
    setUploading(false);

    if (updateErr) {
      setAvatarError(updateErr.message);
      return;
    }

    setAvatarUrl(publicUrl);
    window.dispatchEvent(new CustomEvent("masail:avatar-updated", { detail: publicUrl }));
    setAvatarSuccess(true);
    setTimeout(() => setAvatarSuccess(false), 4000);
  }

  if (loading) {
    return (
      <div className="max-w-3xl">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="mt-8 h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold text-primary md:text-4xl">
          Account Settings
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your profile information and password.
        </p>
      </div>

      {/* Section 0: Profile Photo */}
      <div className="space-y-6 rounded-lg border border-border bg-card p-6 shadow-sm md:p-8">
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground">Profile Photo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            JPG, PNG or WebP. Maximum size 2MB.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={fullName || "Profile photo"}
              className="h-24 w-24 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-primary/10 font-heading text-2xl font-bold text-primary">
              {initials}
            </div>
          )}

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? "Uploading…" : "Upload Photo"}
            </button>
          </div>
        </div>

        {avatarError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{avatarError}</span>
            </div>
          </div>
        )}

        {avatarSuccess && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Profile photo updated</span>
            </div>
          </div>
        )}
      </div>


      {/* Section 1: Profile Information */}
      <form
        onSubmit={handleProfileSave}
        className="space-y-6 rounded-lg border border-border bg-card p-6 shadow-sm md:p-8"
      >
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground">
            Profile Information
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Update your personal details and mosque affiliation.
          </p>
        </div>

        <div>
          <label htmlFor="fullName" className="block text-sm font-semibold text-foreground">
            Full Name <span className="text-red-600">*</span>
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (nameError) setNameError(null);
            }}
            className={`mt-2 w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-primary/20 ${
              nameError ? "border-red-500" : "border-border focus:border-primary"
            }`}
          />
          {nameError && (
            <p className="mt-1.5 text-xs font-medium text-red-600">{nameError}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-foreground">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            disabled
            className="mt-2 w-full cursor-not-allowed rounded-lg border border-border bg-muted px-3.5 py-2.5 text-sm text-muted-foreground"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Email cannot be changed at this time.
          </p>
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-semibold text-foreground">
            Phone <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-2 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label htmlFor="mosque" className="block text-sm font-semibold text-foreground">
            Mosque
          </label>
          <select
            id="mosque"
            value={mosqueId}
            onChange={(e) => setMosqueId(e.target.value)}
            className="mt-2 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Select a mosque…</option>
            {mosques.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.city ? ` — ${m.city}` : ""}
              </option>
            ))}
          </select>
        </div>

        {profileError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{profileError}</span>
            </div>
          </div>
        )}

        {profileSuccess && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Profile updated successfully.</span>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={savingProfile}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingProfile ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>

      {/* Section 2: Change Password */}
      <form
        onSubmit={handlePasswordUpdate}
        className="space-y-6 rounded-lg border border-border bg-card p-6 shadow-sm md:p-8"
      >
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground">
            Change Password
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a strong password you don't use elsewhere.
          </p>
        </div>

        <div>
          <label htmlFor="currentPassword" className="block text-sm font-semibold text-foreground">
            Current Password <span className="text-red-600">*</span>
          </label>
          <input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="mt-2 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label htmlFor="newPassword" className="block text-sm font-semibold text-foreground">
            New Password <span className="text-red-600">*</span>
          </label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-2 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            <PwRule ok={pwChecks.length} label="At least 8 characters" active={newPassword.length > 0} />
            <PwRule ok={pwChecks.lower} label="One lowercase letter" active={newPassword.length > 0} />
            <PwRule ok={pwChecks.upper} label="One uppercase letter" active={newPassword.length > 0} />
            <PwRule ok={pwChecks.digit} label="One digit" active={newPassword.length > 0} />
          </ul>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-semibold text-foreground">
            Confirm New Password <span className="text-red-600">*</span>
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-2 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {confirmPassword.length > 0 && confirmPassword !== newPassword && (
            <p className="mt-1.5 text-xs font-medium text-red-600">
              Passwords don't match.
            </p>
          )}
        </div>

        {passwordError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          </div>
        )}

        {passwordSuccess && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Password updated successfully.</span>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={updatingPassword}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {updatingPassword ? "Updating…" : "Update Password"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PwRule({ ok, label, active }: { ok: boolean; label: string; active: boolean }) {
  const color = !active ? "text-muted-foreground" : ok ? "text-emerald-700" : "text-red-600";
  return (
    <li className={`flex items-center gap-1.5 ${color}`}>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </li>
  );
}
