"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "../../components/ui/button";
import { Field, Input } from "../../components/ui/form-controls";
import { FormPageLayout } from "../../components/ui/form-page-layout";
import { MessageBanner } from "../../components/ui/message-banner";
import { readStoredSession } from "../../lib/session-storage";
import { changePassword } from "../auth/auth-api";

export function SecurityPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = readStoredSession();

    setMessage("");
    setSuccessMessage("");

    if (!session) {
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("A confirmação de senha não confere.");
      return;
    }

    setIsSaving(true);

    try {
      await changePassword(session.token, {
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccessMessage("Senha alterada com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao alterar senha.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <FormPageLayout
      backHref="/configuracoes"
      description="Atualize sua senha de acesso."
      title="Segurança"
    >
      <MessageBanner isError message={message} />
      <MessageBanner message={successMessage} />

      <form className="grid gap-4" onSubmit={submitPassword}>
        <Field label="Senha atual">
          <Input
            minLength={8}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
            type="password"
            value={currentPassword}
          />
        </Field>
        <Field label="Nova senha">
          <Input
            minLength={8}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            type="password"
            value={newPassword}
          />
        </Field>
        <Field label="Confirmar nova senha">
          <Input
            minLength={8}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            type="password"
            value={confirmPassword}
          />
        </Field>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            onClick={() => router.push("/configuracoes")}
            type="button"
            variant="secondary"
          >
            Cancelar
          </Button>
          <Button disabled={isSaving} type="submit">
            {isSaving ? "Salvando..." : "Alterar senha"}
          </Button>
        </div>
      </form>
    </FormPageLayout>
  );
}
