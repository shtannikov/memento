"use client";

import { useEffect, useState } from "react";

import { loadAdminUsers, resetAdminLimits } from "@admin/client/api";
import { initializeAdminTelegram } from "@admin/client/telegram";
import type { AdminUserAppRow } from "./admin.types";
import styles from "./admin.module.css";
import { ResetLimitsDialog } from "./reset-limits-dialog";
import { UsersTable } from "./users-table";

export function AdminPage() {
  const [initData, setInitData] = useState<string | null>(null);
  const [rows, setRows] = useState<AdminUserAppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [resetRow, setResetRow] = useState<AdminUserAppRow | null>(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    let active = true;
    queueMicrotask(async () => {
      try {
        const data = initializeAdminTelegram();
        const users = await loadAdminUsers(data);
        if (!active) return;
        setInitData(data);
        setRows(users);
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Couldn’t open the admin app.");
      } finally {
        if (active) setLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  async function confirmReset() {
    if (!initData || !resetRow) return;
    setResetting(true);
    setError(null);
    try {
      await resetAdminLimits(initData, resetRow.telegramUserId, resetRow.appId);
      const users = await loadAdminUsers(initData);
      setRows(users);
      setResetRow(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn’t reset the limits.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div><p>Memento</p><h1>Admin</h1></div>
        {!loading && !error && <span>{rows.length} app users</span>}
      </header>
      {error && <div className={styles.error} role="alert">{error}</div>}
      {loading ? (
        <div className={styles.loading} role="status">Loading users…</div>
      ) : !error || rows.length > 0 ? (
        <UsersTable
          rows={rows}
          expandedKey={expandedKey}
          onToggle={(key) => setExpandedKey((current) => current === key ? null : key)}
          onReset={setResetRow}
        />
      ) : null}
      {resetRow && (
        <ResetLimitsDialog
          row={resetRow}
          pending={resetting}
          onCancel={() => !resetting && setResetRow(null)}
          onConfirm={() => void confirmReset()}
        />
      )}
    </main>
  );
}
