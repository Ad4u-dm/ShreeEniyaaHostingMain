"use client";

const BaseFooter = () => {
    return (
        <footer className="border-t border-border/50 bg-muted/30 backdrop-blur-sm mt-16">
            <div className="container py-8">
                <div className="flex flex-col items-center justify-center space-y-4 text-center">
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <span>Professional Invoice Generator</span>
                        <span className="text-primary">•</span>
                        <span>Built with Next.js & Tailwind CSS</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default BaseFooter;
