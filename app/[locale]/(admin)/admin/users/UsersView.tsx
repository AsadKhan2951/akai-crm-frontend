"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui-kit";
import { changeAdminUserRole, createAdminInvite, linkInvitedUser, setAdminUserActive } from "../actions";

type Row = Record<string, unknown>;
type CustomerOption = { id: string; business_name: string; area_code: string | null };
const field = "mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3";

export function UsersView({ users, roles, invites, customers, canCreate, canUpdate, canDeactivate }: { users: Row[]; roles: Row[]; invites: Row[]; customers: CustomerOption[]; canCreate: boolean; canUpdate: boolean; canDeactivate: boolean }) {
  const t = useTranslations("admin");
  const tu = useTranslations("userOnboarding");
  const [showForm, setShowForm] = useState(false);
  const [roleId, setRoleId] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [search, setSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const selectedRole = roles.find((role) => String(role.id) === roleId);
  const portal = String(selectedRole?.portal_access ?? "");
  const filtered = users.filter((user) => `${String(user.full_name)} ${String(user.email)}`.toLowerCase().includes(search.toLowerCase()));
  const pendingInvites = invites.filter((invite) => invite.status === "PENDING" || invite.status === "SENT");
  const customerMatches = customers.filter((c) => !customerSearch || `${c.business_name} ${c.area_code ?? ""}`.toLowerCase().includes(customerSearch.toLowerCase())).slice(0, 200);

  const statusText = (status: string) => (status === "LINKED" ? tu("linkedNow") : status === "ALREADY_ACTIVE" ? tu("alreadyActive") : tu("waitingForLogin"));

  function submitInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setMessage(null);
    startTransition(() => {
      void createAdminInvite(data)
        .then((result) => { setMessage({ ok: true, text: statusText(result.status) }); form.reset(); setRoleId(""); setShowForm(false); })
        .catch((error: unknown) => setMessage({ ok: false, text: error instanceof Error ? error.message : t("error") }));
    });
  }
  function linkNow(email: string) {
    const form = new FormData(); form.set("email", email);
    startTransition(() => { void linkInvitedUser(form).then((result) => setMessage({ ok: true, text: statusText(result.status) })).catch((error: unknown) => setMessage({ ok: false, text: error instanceof Error ? error.message : t("error") })); });
  }
  function changeRole(user: Row, nextRoleId: string) {
    const form = new FormData(); form.set("userId", String(user.id)); form.set("roleId", nextRoleId); form.set("permissionKeys", JSON.stringify([]));
    startTransition(() => { void changeAdminUserRole(form).then(() => setMessage({ ok: true, text: t("saved") })).catch((error: unknown) => setMessage({ ok: false, text: error instanceof Error ? error.message : t("error") })); });
  }
  function toggle(user: Row) {
    const form = new FormData(); form.set("userId", String(user.id)); form.set("active", String(!user.is_active));
    startTransition(() => { void setAdminUserActive(form).then(() => setMessage({ ok: true, text: t("saved") })).catch((error: unknown) => setMessage({ ok: false, text: error instanceof Error ? error.message : t("error") })); });
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("usersTitle")} description={t("usersDescription")} actions={canCreate ? <Button type="button" variant="destructive" onClick={() => setShowForm((value) => !value)}>{t("createUser")}</Button> : undefined} />
      {message ? <p role="status" className={`rounded-md border bg-white p-3 text-sm font-medium ${message.ok ? "border-slate-300 text-primary" : "border-[#b42318] text-[#b42318]"}`}>{message.text}</p> : null}

      {showForm && canCreate ? (
        <form onSubmit={submitInvite} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-primary">{t("createUser")}</h2>
          <ol className="list-decimal space-y-1 ps-5 text-sm text-muted-foreground">
            <li>{tu("step1")}</li>
            <li>{tu("step2")}</li>
            <li>{tu("step3")}</li>
          </ol>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm font-medium text-primary">{t("email")}<input name="email" type="email" required className={field} /></label>
            <label className="text-sm font-medium text-primary">{t("fullName")}<input name="fullName" required className={field} /></label>
            <label className="text-sm font-medium text-primary">{t("phone")}<input name="phone" inputMode="tel" placeholder="0300-1234567" className={field} /></label>
            <label className="text-sm font-medium text-primary">{t("preferredLocale")}<select name="preferredLocale" className={field}><option value="en">English</option><option value="ur">اردو</option></select></label>
            <label className="text-sm font-medium text-primary md:col-span-2">{t("role")}
              <select name="roleId" required value={roleId} onChange={(event) => setRoleId(event.target.value)} className={field}>
                <option value="">{tu("chooseRole")}</option>
                {roles.map((role) => <option key={String(role.id)} value={String(role.id)}>{String(role.name)} · {String(role.portal_access)}</option>)}
              </select>
            </label>
            {portal === "VENDOR" ? (
              <div className="space-y-2 rounded-md border border-slate-200 bg-[#f1f0ec] p-3 md:col-span-2">
                <label className="text-sm font-medium text-primary">{tu("findShop")}<input value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} className={field} /></label>
                <label className="text-sm font-medium text-primary">{tu("customerAccount")}
                  <select name="customerId" required className={field}>
                    <option value="">{tu("chooseShop")}</option>
                    {customerMatches.map((c) => <option key={c.id} value={c.id}>{c.business_name}{c.area_code ? ` · ${c.area_code}` : ""}</option>)}
                  </select>
                </label>
                {customers.length === 0 ? <p className="text-sm text-[#b42318]">{tu("noCustomersYet")}</p> : null}
              </div>
            ) : null}
            {portal === "SALES" ? <label className="text-sm font-medium text-primary">{tu("agentCode")}<input name="agentCode" placeholder="HARIS" className={field} /><span className="mt-1 block text-sm font-normal text-muted-foreground">{tu("agentCodeHint")}</span></label> : null}
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="destructive" disabled={pending}>{t("createUser")}</Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>{t("cancel")}</Button>
          </div>
        </form>
      ) : null}

      {pendingInvites.length ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-primary">{tu("pendingTitle")}</h2>
          <p className="text-sm text-muted-foreground">{tu("pendingHint")}</p>
          {pendingInvites.map((invite) => (
            <div key={String(invite.id)} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm">
              <div>
                <p className="font-semibold text-primary">{String(invite.full_name)} · <bdi>{String(invite.email)}</bdi></p>
                <p className="text-muted-foreground">{String((invite.role as Row | null)?.name ?? "")}</p>
              </div>
              {canCreate ? <Button type="button" variant="outline" disabled={pending} onClick={() => linkNow(String(invite.email))}>{tu("linkNow")}</Button> : null}
            </div>
          ))}
        </section>
      ) : null}

      <label className="block text-sm font-medium text-primary">{t("search")}<input value={search} onChange={(event) => setSearch(event.target.value)} className={field} /></label>
      {filtered.length ? (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50"><tr><th className="p-3 text-start">{t("fullName")}</th><th className="p-3 text-start">{t("email")}</th><th className="p-3 text-start">{t("role")}</th><th className="p-3 text-start">{t("lastLogin")}</th><th className="p-3 text-start">{t("status")}</th><th className="p-3 text-start">{t("actions")}</th></tr></thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={String(user.id)} className="border-t border-slate-200">
                  <td className="p-3 font-semibold text-primary">{String(user.full_name)}</td>
                  <td className="p-3"><bdi>{String(user.email)}</bdi></td>
                  <td className="p-3">{canUpdate ? <select defaultValue={String(user.role_id)} onChange={(event) => changeRole(user, event.target.value)} className="min-h-11 rounded-md border border-slate-300 px-2">{roles.map((role) => <option key={String(role.id)} value={String(role.id)}>{String(role.name)}</option>)}</select> : String((user.role as Row | null)?.name ?? user.role_id)}</td>
                  <td className="p-3"><bdi>{user.last_login_at ? new Date(String(user.last_login_at)).toLocaleString("en-PK", { timeZone: "Asia/Karachi" }) : "—"}</bdi></td>
                  <td className="p-3">{user.is_active ? t("active") : t("inactive")}</td>
                  <td className="p-3"><div className="flex flex-wrap gap-2"><Button asChild variant="outline" size="sm"><Link href={`/admin/users/${String(user.id)}` as never}>{t("effectivePermissions")}</Link></Button>{canDeactivate ? <Button type="button" variant="outline" size="sm" onClick={() => toggle(user)}>{user.is_active ? tu("deactivate") : tu("activate")}</Button> : null}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState title={tu("noUsers")} />}
    </div>
  );
}
