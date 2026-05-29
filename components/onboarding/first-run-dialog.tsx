"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Database,
  CheckCircle2,
  Circle,
  ArrowRight,
  Loader2,
  Server,
  Table2,
  Sparkles,
  X,
} from "lucide-react";
import {
  useConnectionStore,
  selectActiveProfile,
  selectStatus,
  selectProfiles,
  type Profile,
} from "@/lib/stores/connection";
import {
  useOnboardingStore,
  selectOnboardingState,
  type OnboardingStep,
} from "@/lib/stores/onboarding";
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
import { cn } from "@/lib/utils";

const STEPS: { key: OnboardingStep; title: string; description: string }[] = [
  {
    key: "welcome",
    title: "Welcome to TypeLens",
    description: "Let's get you set up with your first Typesense connection.",
  },
  {
    key: "add-connection",
    title: "Connect to Typesense",
    description: "Add your Typesense server details to get started.",
  },
  {
    key: "test-connection",
    title: "Test Connection",
    description: "Verifying your connection works.",
  },
  {
    key: "create-collection",
    title: "Create Collection",
    description: "Add sample data to search against.",
  },
];

interface StepIndicatorProps {
  step: OnboardingStep;
  currentStep: OnboardingStep;
  isPast: boolean;
  isCurrent: boolean;
}

function StepIndicator({ step, currentStep, isPast, isCurrent }: StepIndicatorProps) {
  const stepDef = STEPS.find((s) => s.key === step);
  if (!stepDef) return null;

  let Icon: React.ElementType = Circle;
  if (step === "welcome") Icon = Sparkles;
  else if (step === "add-connection") Icon = Server;
  else if (step === "test-connection") Icon = Loader2;
  else if (step === "create-collection") Icon = Table2;

  return (
    <div className={cn("flex items-center gap-2", isPast && "text-muted-foreground")}>
      {isCurrent ? (
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      ) : isPast ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
      <span className={cn("text-sm", isCurrent && "font-medium")}>{stepDef.title}</span>
    </div>
  );
}

interface ConnectionFormData {
  name: string;
  host: string;
  port: string;
  protocol: "http" | "https";
  apiKey: string;
}

function AddConnectionForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: ConnectionFormData) => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [formData, setFormData] = useState<ConnectionFormData>({
    name: "",
    host: "localhost",
    port: "8108",
    protocol: "http",
    apiKey: "",
  });
  const [saving, setSaving] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    onSubmit(formData);
  }

  return (
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
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Skip for now
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Connection"}
        </Button>
      </div>
    </form>
  );
}

function AddDemoConnection({
  onDemoStarted,
}: {
  onDemoStarted: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Try TypeLens with demo data to explore the features before connecting your own
        Typesense server.
      </p>
      <div className="flex gap-2">
        <Button
          onClick={() => {
            useConnectionStore.getState().actions.setDemo(true);
            useOnboardingStore.getState().setHasConnection(true);
            useOnboardingStore.getState().setConnectionVerified(true);
            onDemoStarted();
          }}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Try Demo Mode
        </Button>
        <Button variant="outline" asChild>
          <Link href="/settings/connection">Add My Own</Link>
        </Button>
      </div>
    </div>
  );
}

export function FirstRunOnboardingDialog() {
  const router = useRouter();
  const connectionStatus = useConnectionStore(selectStatus);
  const profiles = useConnectionStore(selectProfiles);
  const activeProfile = useConnectionStore(selectActiveProfile);

  const onboarding = useOnboardingStore(selectOnboardingState);
  const {
    advance,
    dismiss,
    setHasConnection,
    setConnectionVerified,
    setHasCollection,
  } = useOnboardingStore();

  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const isOpen =
    !onboarding.completedAt &&
    !onboarding.dismissedAt &&
    onboarding.currentStep !== "complete";

  const currentStepIndex = STEPS.findIndex(
    (s) => s.key === onboarding.currentStep
  );

  useEffect(() => {
    if (connectionStatus === "connected") {
      setConnectionVerified(true);
    }
  }, [connectionStatus, setConnectionVerified]);

  useEffect(() => {
    if (profiles.length > 0) {
      setHasConnection(true);
    }
  }, [profiles, setHasConnection]);

  function handleDismiss() {
    dismiss();
  }

  function handleConnectionSubmit(data: { name: string; host: string; port: string; protocol: "http" | "https"; apiKey: string }) {
    useConnectionStore.getState().actions.addProfile({
      name: data.name,
      host: data.host,
      port: parseInt(data.port, 10),
      protocol: data.protocol,
      apiKey: data.apiKey,
    });

    const newProfiles = useConnectionStore.getState().profiles;
    if (newProfiles.length > 0) {
      useConnectionStore.getState().actions.setActiveProfile(newProfiles[newProfiles.length - 1]!.id);
    }

    setShowConnectionForm(false);
  }

  function handleNext() {
    if (onboarding.currentStep === "add-connection") {
      if (profiles.length > 0 || useConnectionStore.getState().isDemo) {
        advance();
      }
    } else if (onboarding.currentStep === "test-connection") {
      if (connectionStatus === "connected") {
        advance();
      }
    } else if (onboarding.currentStep === "create-collection") {
      setHasCollection(true);
      advance();
    }
  }

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {STEPS.find((s) => s.key === onboarding.currentStep)?.title ??
              "Welcome"}
          </DialogTitle>
          <DialogDescription>
            {STEPS.find((s) => s.key === onboarding.currentStep)?.description}
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {STEPS.slice(0, -1).map((step, idx) => (
            <div
              key={step.key}
              className={cn(
                "flex items-center gap-1",
                idx < currentStepIndex && "text-green-500",
                idx === currentStepIndex && "text-primary font-medium"
              )}
            >
              {idx < currentStepIndex ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : idx === currentStepIndex ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Circle className="h-3 w-3" />
              )}
              <span className="hidden text-xs sm:inline">{step.title}</span>
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="py-2">
          {onboarding.currentStep === "welcome" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                TypeLens helps you search and manage your Typesense data with an
                intuitive interface.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Search across collections</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Manage schemas and documents</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Import and export data</span>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={advance}>Get Started</Button>
                <AddDemoConnection onDemoStarted={advance} />
              </div>
            </div>
          )}

          {onboarding.currentStep === "add-connection" && !showConnectionForm && (
            <div className="space-y-4">
              {profiles.length === 0 ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Connect to your Typesense server to start indexing and searching your data.
                  </p>
                  <Button onClick={() => setShowConnectionForm(true)}>
                    <Database className="mr-2 h-4 w-4" />
                    Add Connection
                  </Button>
                  <AddDemoConnection onDemoStarted={advance} />
                </>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    You have {profiles.length} existing{" "}
                    {profiles.length === 1 ? "connection" : "connections"}.
                  </p>
                  <Button onClick={advance}>
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {showConnectionForm && (
            <AddConnectionForm
              onSubmit={handleConnectionSubmit}
              onCancel={() => {
                if (profiles.length === 0) {
                  handleDismiss();
                } else {
                  setShowConnectionForm(false);
                }
              }}
            />
          )}

          {onboarding.currentStep === "test-connection" && (
            <div className="space-y-4">
              {connectionStatus === "connecting" && (
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Testing connection...</span>
                </div>
              )}
              {connectionStatus === "connected" && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Connection verified!</span>
                </div>
              )}
              {connectionStatus === "error" && (
                <div className="space-y-2">
                  <p className="text-sm text-destructive">
                    Could not connect to your Typesense server.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() =>
                      activeProfile &&
                      useConnectionStore.getState().actions.testConnection(
                        activeProfile
                      )
                    }
                  >
                    Retry Connection
                  </Button>
                </div>
              )}
              {connectionStatus === "connected" && (
                <Button onClick={handleNext}>
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {onboarding.currentStep === "create-collection" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Create your first collection to start indexing documents.
              </p>
              <div className="flex gap-2">
                <Button onClick={handleNext}>
                  <Table2 className="mr-2 h-4 w-4" />
                  Create Collection
                </Button>
                <Button variant="outline" onClick={handleNext}>
                  Skip
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer with dismiss option */}
        {onboarding.currentStep !== "welcome" && (
          <div className="flex justify-end pt-2 border-t">
            <Button variant="ghost" size="sm" onClick={handleDismiss}>
              Dismiss
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}