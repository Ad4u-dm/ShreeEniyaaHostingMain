import { redirect } from "next/navigation";

// Redirect to login page for Shree Eniyaa Chitfunds
export default function RootPage() {
    redirect("/login");
}
