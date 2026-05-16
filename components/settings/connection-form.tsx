"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { type Profile, selectActions, useConnectionStore } from "@/lib/stores/connection";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  host: z.string().min(1, "Host is required"),
  protocol: z.enum(["http", "https"]),
  apiKey: z.string().min(1, "API Key is required"),
});

type FormValues = z.infer<typeof schema>;

type TestState =
  | { status: "idle" }
  | { status: "testing" }
  | { status: "success"; latencyMs: number }
  | { status: "error"; error: string };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: Profile;
}

const defaultValues: FormValues = {
  name: "",
  host: "localhost",
  protocol: "http",
  apiKey: "",
};

function getPort(protocol: "http" | "https"): number {
  return protocol === "http" ? 80 : 443;
}

export function ProfileFormDialog({ open, onOpenChange, profile }: Props) {
  const { addProfile, updateProfile, testConnection } = useConnectionStore(selectActions);
  const isEdit = !!profile;
  const [testState, setTestState] = useState<TestState>({ status: "idle" });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        profile
          ? {
              name: profile.name,
              host: profile.host,
              protocol: profile.protocol,
              apiKey: profile.apiKey,
            }
          : defaultValues,
      );
      setTestState({ status: "idle" });
    }
  }, [open, profile, form]);

  async function handleTest() {
    const isValid = await form.trigger(["host", "protocol", "apiKey"]);
    if (!isValid) return;
    const values = form.getValues();
    setTestState({ status: "testing" });
    const result = await testConnection({
      id: "__test__",
      name: values.name,
      host: values.host,
      port: getPort(values.protocol),
      protocol: values.protocol,
      apiKey: values.apiKey,
    });
    if (result.ok) {
      setTestState({ status: "success", latencyMs: result.latencyMs });
    } else {
      setTestState({ status: "error", error: result.error });
    }
  }

  function onSubmit(data: FormValues) {
    const fullData = { ...data, port: getPort(data.protocol) };
    if (isEdit && profile) {
      updateProfile(profile.id, fullData);
    } else {
      addProfile(fullData);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Connection" : "Add Connection"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Typesense Server" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="protocol"
                render={({ field }) => (
                  <FormItem className="col-span-1">
                    <FormLabel>Protocol</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="http">http</SelectItem>
                        <SelectItem value="https">https</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="host"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Host</FormLabel>
                    <FormControl>
                      <Input placeholder="localhost" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Enter your Typesense API key" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {testState.status !== "idle" && (
              <div>
                {testState.status === "testing" && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Testing connection…
                  </div>
                )}
                {testState.status === "success" && (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Connected in {testState.latencyMs}ms
                  </div>
                )}
                {testState.status === "error" && (
                  <div className="flex items-start gap-2 text-sm text-destructive">
                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{testState.error}</span>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="flex-wrap justify-between gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleTest}
                disabled={testState.status === "testing"}
              >
                Test Connection
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit">{isEdit ? "Save Changes" : "Add Connection"}</Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
