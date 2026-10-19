"use client";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import TimeCapsuleStudio from "./TimeCapsuleStudio";
export default function CapsuleWorkspace() {
  const {user,loading}=useAuth();
  if(loading)return <p className="text-center py-12">Opening your private space...</p>;
  if(!user)return <div className="text-center py-12 space-y-4"><p>Sign in to save and view your private memories.</p><Link className="btn-love-primary inline-block px-6 py-3 rounded-xl" href="/login?redirect=/time-capsule">Sign in</Link></div>;
  // An identity change destroys all in-memory notes, recordings and selected capsules immediately.
  return <TimeCapsuleStudio key={user.id}/>;
}
