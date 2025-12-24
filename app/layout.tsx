import { ReactNode } from "react";
import "@/app/globals.css";
import { Toaster } from "@/components/ui/toaster";
import { outfit } from "@/lib/fonts";
import { FetchInitializer } from "@/components/FetchInitializer";

type Props = {
    children: ReactNode;
};

// Root layout with proper HTML structure for Shree Eniyaa Chitfunds
export default function RootLayout({ children }: Props) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link rel="icon" type="image/png" sizes="16x16" href="/icon-16.png" />
                <link rel="icon" type="image/png" sizes="32x32" href="/icon-32.png" />
                <link rel="icon" type="image/png" sizes="64x64" href="/icon-64.png" />
                <link rel="shortcut icon" href="/icon-32.png" type="image/png" />
                <link rel="apple-touch-icon" sizes="128x128" href="/icon-128.png" />
                <link rel="apple-touch-icon" sizes="256x256" href="/icon-256.png" />
                <link rel="apple-touch-icon" sizes="512x512" href="/icon.png" />
            </head>
            <body
                className={`${outfit.className} min-h-screen bg-background font-sans antialiased`}
                suppressHydrationWarning
            >
                <FetchInitializer />
                {children}
                <Toaster />
            </body>
        </html>
    );
}
