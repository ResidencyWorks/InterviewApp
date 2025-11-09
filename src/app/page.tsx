import Link from "next/link";

/**
 * Home page component for the Interview Drills application
 * Provides navigation to main features
 */
export default function HomePage() {
	return (
		<div className="min-h-screen flex flex-col items-center justify-center p-8">
			<h1 className="text-4xl font-bold mb-8">Interview Drills</h1>
			<p className="text-lg text-gray-600 mb-8 text-center max-w-2xl">
				Practice your interview skills with AI-powered evaluation and feedback
			</p>
			<div className="flex gap-4">
				<Link
					href="/login"
					className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
				>
					Get Started
				</Link>
				<Link
					href="/drill"
					className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
				>
					Try Demo
				</Link>
			</div>
		</div>
	);
}
