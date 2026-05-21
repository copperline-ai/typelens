import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const basicEnabled = !!(process.env.AUTH_USERNAME && process.env.AUTH_PASSWORD);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Enter your credentials to access the dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense>
          <LoginForm basicEnabled={basicEnabled} />
        </Suspense>
      </CardContent>
    </Card>
  );
}
