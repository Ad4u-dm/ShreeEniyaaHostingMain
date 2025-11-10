// Next
import Link from "next/link";
import Image from "next/image";

// Assets
import Logo from "@/public/assets/img/invoice-management-logo.svg";

// Components
import { ThemeSwitcher } from "@/app/components";

const BaseNavbar = () => {
    return (
        <header className="sticky top-0 z-[99] w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <nav className="container flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4">
                <div className="flex items-center space-x-2 sm:space-x-4">
                    <Link href={"/"} className="flex items-center space-x-2 transition-transform hover:scale-105">
                        <Image
                            src={Logo}
                            alt="Invoice Management Logo"
                            width={140}
                            height={32}
                            loading="eager"
                            style={{ height: "auto" }}
                            className="drop-shadow-sm w-auto h-8 sm:h-10"
                        />
                    </Link>
                </div>

                <div className="flex items-center space-x-2 sm:space-x-4">
                    <ThemeSwitcher />
                </div>
            </nav>
        </header>
    );
};

export default BaseNavbar;
