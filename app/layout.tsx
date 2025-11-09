import { ReactNode } from "react";
import "@/app/globals.css";
import { Toaster } from "@/components/ui/toaster";
import { outfit } from "@/lib/fonts";

type Props = {
    children: ReactNode;
};

// Root layout with proper HTML structure for Shree Eniyaa Chitfunds
export default function RootLayout({ children }: Props) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body 
                className={`${outfit.className} min-h-screen bg-background font-sans antialiased`}
                suppressHydrationWarning
            >
                {children}
                <Toaster />
            </body>
        </html>
    );
}
