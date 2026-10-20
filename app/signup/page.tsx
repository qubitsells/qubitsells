import type { Metadata } from "next";
import AuthPage from "@/components/account/AuthPage";
export const metadata: Metadata = { title: "Create your account — QubitSells", description: "Create a QubitSells account for personal use, work, or both. Couple Space is an optional, separate feature." };
export default function SignupPage() { return <AuthPage mode="signup" />; }
