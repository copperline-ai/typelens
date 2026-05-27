"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import {
  type Profile,
  selectActions,
  selectActiveProfileId,
  selectIsDemo,
  selectProfiles,
  useConnectionStore,
} from "@/lib/stores/connection";
import { ProfileFormDialog } from "@/components/settings/connection-form";
import { ProfileCard } from "@/components/settings/profile-card";
import { Button } from "@/components/ui/button";

export default function ConnectionSettingsPage() {
  const profiles = useConnectionStore(selectProfiles);
  const activeProfileId = useConnectionStore(selectActiveProfileId);
  const isDemo = useConnectionStore(selectIsDemo);
  const { hydrateFromStorage } = useConnectionStore(selectActions);

  const [formOpen, setFormOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | undefined>(undefined);
  const [profileToCopy, setProfileToCopy] = useState<Profile | null>(null);

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

  function handleCopy(profile: Profile) {
    setEditingProfile(undefined);
    setProfileToCopy(profile);
    setFormOpen(true);
  }

  function handleFormClose(open: boolean) {
    setFormOpen(open);
    if (!open) {
      setEditingProfile(undefined);
      setProfileToCopy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Connections</h1>
        </div>
        {!isDemo && (
          <Button size="icon" onClick={handleAddOpen} title="Add Connection">
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {profiles.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">No connections yet.</p>
          {!isDemo && (
            <Button variant="outline" className="mt-4" onClick={handleAddOpen}>
              Add your first connection
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              isActive={profile.id === activeProfileId}
              onEdit={() => handleEdit(profile)}
              onCopy={handleCopy}
            />
          ))}
        </div>
      )}

      <ProfileFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        profile={editingProfile}
        initialValues={
          profileToCopy
            ? {
                name: `${profileToCopy.name} (copy)`,
                host: profileToCopy.host,
                port: profileToCopy.port,
                protocol: profileToCopy.protocol,
                apiKey: profileToCopy.apiKey,
              }
            : undefined
        }
      />
    </div>
  );
}
