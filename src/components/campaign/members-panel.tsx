"use client";

import { useCallback, useState } from "react";
import { Button, ErrorNote, Input, MonoLabel, Panel } from "@/components/ui";
import { useAction } from "@/hooks/use-action";
import { usePoll } from "@/hooks/use-poll";
import type { MemberDto } from "@/lib/dto";
import { api } from "@/lib/http";
import { characterColor } from "@/lib/tone";

/**
 * La mesa: quién puede entrar en esta campaña.
 *
 * Invitar exige que la persona ya tenga cuenta. Crearla desde aquí sortearía la
 * lista blanca de altas y la dejaría con una contraseña que no conoce.
 */
export function MembersPanel({ campaignId, isOwner }: { campaignId: string; isOwner: boolean }) {
  const [email, setEmail] = useState("");
  const { pending, error, setError, run } = useAction();

  const fetcher = useCallback(
    () => api<MemberDto[]>(`/api/campaigns/${campaignId}/members`),
    [campaignId],
  );
  const { data: members, refresh } = usePoll(fetcher);

  const invite = () =>
    void run("invite", async () => {
      if (!email.trim()) {
        setError("Escribe el correo de quien quieres invitar.");
        return;
      }
      await api(`/api/campaigns/${campaignId}/members`, {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setEmail("");
      await refresh();
    });

  const remove = (member: MemberDto) =>
    void run(`remove-${member.userId}`, async () => {
      if (!confirm(`¿Sacar a ${member.name} de la mesa? Dejará de ver esta campaña.`)) return;
      await api(`/api/campaigns/${campaignId}/members/${member.userId}`, { method: "DELETE" });
      await refresh();
    });

  return (
    <Panel className="p-[18px]">
      <h2 className="mb-[10px]">
        <MonoLabel>Mesa</MonoLabel>
      </h2>

      <ul className="mb-[14px] flex flex-col gap-[7px]">
        {(members ?? []).map((member) => (
          <li
            key={member.userId}
            className="flex flex-wrap items-center gap-[10px] rounded-[7px] border border-line px-[11px] py-[8px]"
          >
            <span
              aria-hidden
              className="h-[7px] w-[7px] flex-none rounded-full"
              style={{ background: characterColor(member.userId) }}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px]">{member.name}</span>
              <span className="block truncate font-mono text-[11.5px] text-text3">
                {member.email}
              </span>
            </span>
            {member.isOwner ? (
              <span className="flex-none rounded-[20px] border border-line2 px-[9px] py-px font-mono text-[10.5px] tracking-[0.05em] uppercase text-text3">
                Dueño
              </span>
            ) : (
              isOwner && (
                <button
                  type="button"
                  onClick={() => remove(member)}
                  disabled={pending !== ""}
                  className="flex-none rounded-[6px] border border-line px-[9px] py-[5px] font-mono text-[11px] text-text3 transition hover:border-err hover:text-err disabled:opacity-45"
                >
                  Sacar
                </button>
              )
            )}
          </li>
        ))}
        {members?.length === 0 && (
          <li className="text-[13px] text-text3">Sólo tú, de momento.</li>
        )}
      </ul>

      <ErrorNote>{error}</ErrorNote>

      {isOwner ? (
        <div className="flex flex-wrap items-end gap-[10px]">
          <label className="min-w-0 flex-[1_1_220px]">
            <span className="mb-1 block text-[13px] text-text2">Invitar por correo</span>
            <Input
              type="email"
              value={email}
              placeholder="jugadora@ejemplo.com"
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") invite();
              }}
            />
          </label>
          <Button onClick={invite} disabled={pending !== ""}>
            Invitar
          </Button>
        </div>
      ) : (
        <p className="text-[12.5px] text-text3">
          Sólo el dueño de la campaña puede invitar o sacar gente de la mesa.
        </p>
      )}
    </Panel>
  );
}
