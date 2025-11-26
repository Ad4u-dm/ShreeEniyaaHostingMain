"use client";

import Error from "next/error";

// Render the default Next.js 404 page when a route
// is requested that doesn't match the middleware and
// therefore doesn't have a locale associated with it.

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center">
            <Error statusCode={404} />
        </div>
    );
}
