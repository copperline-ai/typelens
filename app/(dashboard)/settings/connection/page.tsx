"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import {
  type Profile,
  selectActions,
  selectActiveProfileId,
  selectProfiles,
  useConnectionStore,
} from "@/lib/stores/connection";
import { ProfileFormDialog } from "@/components/settings/connection-form";
import { ProfileCard } from "@/components/settings/profile-card";
import { Button } from "@/components/ui/button";

export default function ConnectionSettingsPage() {
  const profiles = useConnectionStore(selectProfiles);
  const activeProfileId = useConnectionStore(selectActiveProfileId);
  const { hydrateFromStorage } = useConnectionStore(selectActions);

  const [formOpen, setFormOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | undefined>(undefined);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  function handleEdit(profile: Profile) {
    setEditingProfile(profile);
    setFormOpen(true);
  }

  function handleAddOpen() {
    setEditingProfile(undefined);
    setFormOpen(true);
  }

  function handleFormClose(open: boolean) {
    setFormOpen(open);
    if (!open) setEditingProfile(undefined);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Connections</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add and manage your Typesense connections.
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={handleAddOpen}>
          <Plus className="h-4 w-4" />
          Add Connection
        </Button>
      </div>

      {profiles.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">No connections yet.</p>
          <Button variant="outline" className="mt-4" onClick={handleAddOpen}>
            Add your first connection
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              isActive={profile.id === activeProfileId}
              onEdit={() => handleEdit(profile)}
            />
          ))}
        </div>
      )}

      <ProfileFormDialog open={formOpen} onOpenChange={handleFormClose} profile={editingProfile} />
    </div>
  );
}
