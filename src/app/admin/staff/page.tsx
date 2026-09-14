"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { PageHeader } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { Select, Field } from "@/components/ui/field";
import { Panel, Alert, Badge, Modal, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/format";
import { UserPlus } from "lucide-react";

const ROLES = [
  {
    value: "admin" as const,
    label: "Admin",
    detail: "Everything, including staff access and shop settings.",
  },
  {
    value: "manager" as const,
    label: "Manager",
    detail: "Orders, payments, inventory, customers and the register.",
  },
  {
    value: "cashier" as const,
    label: "Cashier",
    detail: "The walk-in register only. No dashboard, no customer data.",
  },
];

export default function StaffPage() {
  const staff = useQuery(api.staff.list);
  const setRole = useMutation(api.staff.setRole);
  const revoke = useMutation(api.staff.revokeAccess);
  const { notify } = useToast();

  const [editing, setEditing] = useState<any | null>(null);
  const [role, setRoleValue] = useState<"admin" | "manager" | "cashier">("manager");
  const [busy, setBusy] = useState(false);

  const pending = staff?.filter((member) => !member.role || !member.active) ?? [];

  return (
    <>
      <PageHeader
        title="Staff"
        description="Who can sign in, and what they are allowed to touch."
      />

      <div className="space-y-5 p-4 sm:p-6">
        <Alert tone="info" title="How people get access">
          Staff create their own account at the sign-in page using their work email. New accounts
          arrive here with no role and no access until you grant one.
        </Alert>

        {pending.length > 0 && (
          <Panel className="border-brass/40">
            <div className="border-b border-rule bg-brass-soft px-4 py-3">
              <h2 className="flex items-center gap-2 text-[15px] font-medium text-ink">
                <UserPlus className="h-4 w-4 text-brass-deep" aria-hidden />
                {pending.length} {pending.length === 1 ? "account is" : "accounts are"} waiting for a role
              </h2>
            </div>
            <ul>
              {pending.map((member) => (
                <li key={member._id} className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-4 py-3 last:border-0">
                  <div>
                    <p className="text-[14.5px] text-ink">{member.name}</p>
                    <p className="text-[13px] text-muted">{member.email}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditing(member);
                      setRoleValue("cashier");
                    }}
                  >
                    Give them a role
                  </Button>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <Panel className="overflow-hidden">
          {staff === undefined ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <div className="scroll-x">
              <table className="w-full min-w-[620px] text-[14px]">
                <thead>
                  <tr className="border-b border-rule bg-surface text-left text-[12.5px] text-muted">
                    <th className="px-4 py-2.5 font-medium">Name</th>
                    <th className="px-3 py-2.5 font-medium">Email</th>
                    <th className="px-3 py-2.5 font-medium">Role</th>
                    <th className="px-3 py-2.5 font-medium">Joined</th>
                    <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((member) => (
                    <tr key={member._id} className="border-b border-rule last:border-0">
                      <td className="px-4 py-3 text-ink">{member.name}</td>
                      <td className="px-3 py-3 text-muted">{member.email}</td>
                      <td className="px-3 py-3">
                        {member.role && member.active ? (
                          <Badge tone={member.role === "admin" ? "ink" : "neutral"}>
                            <span className="capitalize">{member.role}</span>
                          </Badge>
                        ) : (
                          <Badge tone="warn">No access</Badge>
                        )}
                      </td>
                      <td className="px-3 py-3 text-muted">{formatDate(member.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setEditing(member);
                              setRoleValue(member.role ?? "cashier");
                            }}
                          >
                            Change role
                          </Button>
                          {member.active && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-flag"
                              onClick={async () => {
                                if (!confirm(`Remove ${member.name}'s access? They stay signed up but cannot open anything.`)) return;
                                try {
                                  await revoke({ userId: member._id as Id<"users"> });
                                  notify(`${member.name} can no longer sign in.`, "info");
                                } catch (err) {
                                  notify(err instanceof Error ? err.message : "That did not work.", "bad");
                                }
                              }}
                            >
                              Revoke
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`Role for ${editing?.name ?? ""}`}
        description="Roles take effect the next time they load a page."
      >
        <div className="space-y-4">
          <Field label="What should they be able to do?" required>
            <div className="space-y-2">
              {ROLES.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setRoleValue(option.value)}
                  className={`w-full rounded-[var(--radius-sheet)] border px-4 py-3 text-left transition ${
                    role === option.value
                      ? "border-ink bg-surface ring-1 ring-ink"
                      : "border-rule hover:border-rule-strong"
                  }`}
                >
                  <span className="block text-[14.5px] font-medium text-ink">{option.label}</span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-muted">{option.detail}</span>
                </button>
              ))}
            </div>
          </Field>

          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              fullWidth
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await setRole({ userId: editing._id as Id<"users">, role, active: true });
                  notify(`${editing.name} is now a ${role}.`, "good");
                  setEditing(null);
                } catch (err) {
                  notify(err instanceof Error ? err.message : "That did not save.", "bad");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Grant access
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
