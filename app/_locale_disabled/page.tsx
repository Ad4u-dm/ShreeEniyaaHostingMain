import { redirect } from "next/navigation";

// Redirect to ChitFund Management System login
export default function Home() {
    redirect("/login");
}
