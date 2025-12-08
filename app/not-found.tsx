export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="text-center p-8">
                <h1 className="text-6xl font-bold text-slate-800 mb-4">404</h1>
                <h2 className="text-2xl font-semibold text-slate-700 mb-2">Page Not Found</h2>
                <p className="text-slate-600 mb-6">The page you are looking for does not exist.</p>
                <a
                    href="/"
                    className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Go Back Home
                </a>
            </div>
        </div>
    );
}
