import React from 'react';
import { requireAuthenticatedUser } from '@/lib/supabase/server';
import { SettingsClient } from '@/components/settings/SettingsClient';

export default async function SettingsPage() {
  const { user } = await requireAuthenticatedUser();
  return <SettingsClient userEmail={user.email ?? ''} />;
}
