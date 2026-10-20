"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AuthRedirect() {
  const router = useRouter();
  useEffect(() => {
    const redirect = () => router.replace("/login");
    window.addEventListener("operia:unauthorized", redirect);
    return () => window.removeEventListener("operia:unauthorized", redirect);
  }, [router]);
  return null;
}
