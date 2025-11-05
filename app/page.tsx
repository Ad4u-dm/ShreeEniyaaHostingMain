import { redirect } from "next/navigation";

// Redirect to login page for ChitFund Management System
export default function RootPage() {
    redirect("/login");
}
