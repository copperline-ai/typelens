import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import LoginForm from "./login-form";

export default function LoginPage() {
  const basicEnabled = !!(process.env.AUTH_USERNAME && process.env.AUTH_PASSWORD);
  const githubEnabled = !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Enter your credentials to access the dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense>
          <LoginForm basicEnabled={basicEnabled} githubEnabled={githubEnabled} />
        </Suspense>
      </CardContent>
    </Card>
  );
}
