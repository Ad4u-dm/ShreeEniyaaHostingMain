"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Client-side redirect to login so the page can be exported statically
export default function RootPage() {
    const router = useRouter();

    useEffect(() => {
        router.push('/login');
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <p>Redirecting to <a href="/login" className="text-blue-600 underline">Login</a>…</p>
        </div>
    );
}
