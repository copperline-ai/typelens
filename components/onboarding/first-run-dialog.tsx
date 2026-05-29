"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Database, Loader2, AlertCircle } from "lucide-react";
import {
  useConnectionStore,
  selectActiveProfile,
  selectStatus,
  selectProfiles,
} from "@/lib/stores/connection";
import { getOnboardingState, markOnboardingStep } from "@/lib/stores/onboarding";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FormData {
  name: string;
  host: string;
  port: string;
  protocol: "http" | "https";
  apiKey: string;
}

export function FirstRunOnboardingDialog() {
  const router = useRouter();
  const profiles = useConnectionStore(selectProfiles);
  const activeProfile = useConnectionStore(selectActiveProfile);
  const connectionStatus = useConnectionStore(selectStatus);

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    host: "localhost",
    port: "8108",
    protocol: "http",
    apiKey: "",
  });

  useEffect(() => {
    const onboarding = getOnboardingState();
    const hasProfile = profiles.length > 0 || activeProfile !== null;

    if (hasProfile) {
      markOnboardingStep("connectTypesense", true);
      setIsOpen(false);
      setLoading(false);
      return;
    }

    if (!onboarding.steps.connectTypesense) {
      setIsOpen(true);
    }
    setLoading(false);
  }, [profiles, activeProfile]);

  useEffect(() => {
    if (activeProfile) {
      markOnboardingStep("connectTypesense", true);
      setIsOpen(false);
    }
  }, [activeProfile]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    useConnectionStore.getState().actions.addProfile({
      name: formData.name,
      host: formData.host,
      port: parseInt(formData.port, 10),
      protocol: formData.protocol,
      apiKey: formData.apiKey,
    });
  }

  useEffect(() => {
    if (!saving) return;

    if (connectionStatus === "connecting") return;

    if (connectionStatus === "connected") {
      markOnboardingStep("connectTypesense", true);
      router.push("/collections");
      return;
    }

    if (connectionStatus === "error") {
      setError("Could not connect to Typesense. Check your host, port, and API key.");
      setSaving(false);
    }
  }, [connectionStatus, saving, router]);

  if (loading) return null;
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && isOpen && setIsOpen(open)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Connect your Typesense</DialogTitle>
          <DialogDescription>
            Enter your Typesense server details to get started.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="conn-name">Connection Name</Label>
            <Input
              id="conn-name"
              placeholder="My Typesense"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="conn-host">Host</Label>
              <Input
                id="conn-host"
                placeholder="localhost"
                value={formData.host}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="conn-port">Port</Label>
              <Input
                id="conn-port"
                placeholder="8108"
                type="number"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="conn-protocol">Protocol</Label>
            <Select
              value={formData.protocol}
              onValueChange={(v: "http" | "https") =>
                setFormData({ ...formData, protocol: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="http">HTTP</SelectItem>
                <SelectItem value="https">HTTPS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="conn-apiKey">API Key</Label>
            <Input
              id="conn-apiKey"
              type="password"
              placeholder="xyz"
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground">
              Your Typesense admin API key. Find it in your Typesense server config.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            {(saving || connectionStatus === "connecting") && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Testing connection...</span>
              </div>
            )}
            {!saving && connectionStatus !== "connecting" && (
              <Button type="submit" disabled={saving}>
                <Database className="mr-2 h-4 w-4" />
                {saving ? "Connecting..." : "Connect"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}