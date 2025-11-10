import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export default function DrillPage() {
	const drills = [
		{
			completed: true,
			description:
				"Master the basics of JavaScript including variables, functions, and control structures.",
			difficulty: "Beginner",
			duration: "30 min",
			id: 1,
			score: 92,
			title: "JavaScript Fundamentals",
		},
		{
			completed: false,
			description:
				"Learn advanced React patterns including HOCs, render props, and custom hooks.",
			difficulty: "Intermediate",
			duration: "45 min",
			id: 2,
			score: null,
			title: "React Patterns",
		},
		{
			completed: false,
			description:
				"Design scalable systems and understand distributed architecture principles.",
			difficulty: "Advanced",
			duration: "60 min",
			id: 3,
			score: null,
			title: "System Design",
		},
		{
			completed: true,
			description:
				"Practice with arrays, linked lists, trees, and common algorithms.",
			difficulty: "Intermediate",
			duration: "40 min",
			id: 4,
			score: 87,
			title: "Data Structures & Algorithms",
		},
	];

	const getDifficultyColor = (difficulty: string) => {
		switch (difficulty) {
			case "Beginner":
				return "bg-green-100 text-green-800";
			case "Intermediate":
				return "bg-yellow-100 text-yellow-800";
			case "Advanced":
				return "bg-red-100 text-red-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 p-6">
			<div className="max-w-6xl mx-auto space-y-6">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">
							Interview Drills
						</h1>
						<p className="text-gray-600">
							Practice with our comprehensive collection of interview questions.
						</p>
					</div>
					<Button asChild>
						<Link href="/dashboard">Back to Dashboard</Link>
					</Button>
				</div>

				{/* Drills Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{drills.map((drill) => (
						<Card key={drill.id} className="hover:shadow-lg transition-shadow">
							<CardHeader>
								<div className="flex items-start justify-between">
									<div>
										<CardTitle className="text-lg">{drill.title}</CardTitle>
										<CardDescription className="mt-2">
											{drill.description}
										</CardDescription>
									</div>
									<Badge className={getDifficultyColor(drill.difficulty)}>
										{drill.difficulty}
									</Badge>
								</div>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex items-center justify-between text-sm text-gray-600">
									<span>Duration: {drill.duration}</span>
									{drill.completed && drill.score && (
										<span className="font-medium text-green-600">
											Score: {drill.score}%
										</span>
									)}
								</div>

								<div className="flex space-x-2">
									{drill.completed ? (
										<Button variant="outline" className="flex-1" asChild>
											<Link href={`/drill/${drill.id}`}>Review</Link>
										</Button>
									) : (
										<Button className="flex-1" asChild>
											<Link href={`/drill/${drill.id}`}>Start Drill</Link>
										</Button>
									)}
									<Button variant="outline" size="sm">
										Preview
									</Button>
								</div>
							</CardContent>
						</Card>
					))}
				</div>

				{/* Progress Summary */}
				<Card>
					<CardHeader>
						<CardTitle>Your Progress</CardTitle>
						<CardDescription>
							Track your learning journey and see how you're improving
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div className="text-center">
								<div className="text-2xl font-bold text-blue-600">2</div>
								<div className="text-sm text-gray-600">Completed</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-yellow-600">2</div>
								<div className="text-sm text-gray-600">In Progress</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-green-600">89%</div>
								<div className="text-sm text-gray-600">Average Score</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
