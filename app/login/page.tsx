import type { Metadata } from "next";
import AuthPage from "@/components/account/AuthPage";
export const metadata: Metadata = { title: "Sign in — QubitSells", description: "Sign in to your QubitSells account to manage your profile, templates, and creations." };
export default function LoginPage() { return <AuthPage mode="login" />; }
