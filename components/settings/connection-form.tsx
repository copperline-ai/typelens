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
  DialogDescription,
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
  port: z.coerce
    .number({ invalid_type_error: "Port is required" })
    .int("Port must be a whole number")
    .min(1, "Must be 1–65535")
    .max(65535, "Must be 1–65535"),
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
  initialValues?: Partial<Omit<Profile, "id">>;
}

const defaultValues = {
  name: "",
  host: "localhost",
  protocol: "http" as const,
  port: "" as unknown as number,
  apiKey: "",
};

export function ProfileFormDialog({ open, onOpenChange, profile, initialValues }: Props) {
  const { addProfile, updateProfile, testConnection } = useConnectionStore(selectActions);
  const isEdit = !!profile;
  const isCopy = !profile && !!initialValues;
  const [testState, setTestState] = useState<TestState>({ status: "idle" });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as FormValues,
  });

  useEffect(() => {
    if (open) {
      if (profile) {
        form.reset({
          name: profile.name,
          host: profile.host,
          protocol: profile.protocol,
          port: profile.port,
          apiKey: profile.apiKey,
        });
      } else if (initialValues) {
        form.reset({
          ...defaultValues,
          ...initialValues,
        } as FormValues);
      } else {
        form.reset(defaultValues as FormValues);
      }
      setTestState({ status: "idle" });
    }
  }, [open, profile, initialValues, form]);

  async function handleTest() {
    const isValid = await form.trigger(["host", "protocol", "port", "apiKey"]);
    if (!isValid) return;
    const values = form.getValues();
    setTestState({ status: "testing" });
    const result = await testConnection({
      id: "__test__",
      name: values.name,
      host: values.host,
      port: values.port,
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
    if (isEdit && profile) {
      updateProfile(profile.id, data);
    } else {
      addProfile(data);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Connection" : isCopy ? "Copy Connection" : "Add Connection"}
          </DialogTitle>
          <DialogDescription>
            <a
              href="https://typesense.org/docs/30.2/api/authentication.html"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              How authentication works
            </a>
          </DialogDescription>
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
                    <Input placeholder="My Typesense Server" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <FormField
                control={form.control}
                name="protocol"
                render={({ field }) => (
                  <FormItem className="col-span-1">
                    <FormLabel>Protocol</FormLabel>
                    <Select
                      onValueChange={(value: "http" | "https") => {
                        field.onChange(value);
                        form.setValue("port", value === "https" ? 443 : ("" as unknown as number), {
                          shouldValidate: false,
                        });
                      }}
                      value={field.value}
                    >
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
                      <Input placeholder="localhost" autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="port"
                render={({ field }) => (
                  <FormItem className="col-span-1">
                    <FormLabel>Port</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="8108"
                        {...field}
                        value={field.value === ("" as unknown as number) ? "" : field.value}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? ("" as unknown as number)
                              : e.target.valueAsNumber,
                          )
                        }
                      />
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
                  <FormLabel>
                    API Key{" "}
                    <a
                      href="https://typesense.org/docs/30.2/api/api-keys.html#create-an-api-key"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-normal text-muted-foreground underline hover:text-foreground"
                    >
                      Learn more
                    </a>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter your Typesense API key"
                      autoComplete="new-password"
                      {...field}
                    />
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
                <Button type="submit">
                  {isEdit ? "Save Changes" : isCopy ? "Save Copy" : "Add Connection"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
