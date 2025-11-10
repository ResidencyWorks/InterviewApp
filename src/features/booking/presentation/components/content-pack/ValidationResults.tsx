/**
 * ValidationResults Component
 *
 * Displays detailed validation results including errors, warnings,
 * and suggestions for content pack validation.
 */

"use client";

import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ValidationError {
	path: string;
	message: string;
	code: string;
	severity: "error" | "warning";
}

interface ValidationWarning {
	path: string;
	message: string;
	code: string;
	suggestion?: string;
}

interface ValidationResult {
	isValid: boolean;
	errors: ValidationError[];
	warnings: ValidationWarning[];
}

interface ValidationResultsProps {
	result: ValidationResult;
	onClose?: () => void;
	className?: string;
}

export function ValidationResults({
	result,
	onClose,
	className = "",
}: ValidationResultsProps) {
	const { isValid, errors, warnings } = result;
	const totalIssues = errors.length + warnings.length;

	const _getSeverityIcon = (severity: "error" | "warning") => {
		return severity === "error" ? (
			<AlertCircle className="h-4 w-4 text-red-500" />
		) : (
			<AlertTriangle className="h-4 w-4 text-yellow-500" />
		);
	};

	const _getSeverityColor = (severity: "error" | "warning") => {
		return severity === "error" ? "destructive" : "default";
	};

	const formatPath = (path: string) => {
		// Convert JSON path to more readable format
		return path
			.replace(/\./g, " → ")
			.replace(/\[(\d+)\]/g, "[$1]")
			.replace(/^root → /, "");
	};

	return (
		<Card className={className}>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						{isValid ? (
							<CheckCircle className="h-5 w-5 text-green-500" />
						) : (
							<AlertCircle className="h-5 w-5 text-red-500" />
						)}
						<CardTitle>Validation Results</CardTitle>
					</div>
					{onClose && (
						<Button variant="ghost" size="sm" onClick={onClose}>
							<X className="h-4 w-4" />
						</Button>
					)}
				</div>
				<CardDescription>
					{isValid
						? "Content pack validation passed successfully"
						: `Found ${totalIssues} issue${totalIssues === 1 ? "" : "s"} that need to be addressed`}
				</CardDescription>
			</CardHeader>
			<CardContent>
				{isValid ? (
					<Alert>
						<CheckCircle className="h-4 w-4" />
						<AlertDescription>
							Your content pack is valid and ready to be activated. No errors or
							warnings were found.
						</AlertDescription>
					</Alert>
				) : (
					<div className="space-y-4">
						{/* Summary */}
						<div className="flex gap-2">
							{errors.length > 0 && (
								<Badge variant="destructive">
									{errors.length} Error{errors.length === 1 ? "" : "s"}
								</Badge>
							)}
							{warnings.length > 0 && (
								<Badge variant="secondary">
									{warnings.length} Warning{warnings.length === 1 ? "" : "s"}
								</Badge>
							)}
						</div>

						{/* Errors */}
						{errors.length > 0 && (
							<div className="space-y-2">
								<h4 className="font-medium text-red-700 flex items-center gap-2">
									<AlertCircle className="h-4 w-4" />
									Errors ({errors.length})
								</h4>
								<ScrollArea className="h-64">
									<div className="space-y-2">
										{errors.map((error, index) => (
											<Alert
												key={`error-${error.path}-${index}`}
												variant="destructive"
											>
												<AlertCircle className="h-4 w-4" />
												<AlertDescription>
													<div className="space-y-1">
														<div className="font-medium">
															{formatPath(error.path)}
														</div>
														<div>{error.message}</div>
														<div className="text-xs text-red-600">
															Code: {error.code}
														</div>
													</div>
												</AlertDescription>
											</Alert>
										))}
									</div>
								</ScrollArea>
							</div>
						)}

						{/* Warnings */}
						{warnings.length > 0 && (
							<div className="space-y-2">
								<h4 className="font-medium text-yellow-700 flex items-center gap-2">
									<AlertTriangle className="h-4 w-4" />
									Warnings ({warnings.length})
								</h4>
								<ScrollArea className="h-64">
									<div className="space-y-2">
										{warnings.map((warning, index) => (
											<Alert
												key={`warning-${warning.path}-${index}`}
												variant="default"
											>
												<AlertTriangle className="h-4 w-4" />
												<AlertDescription>
													<div className="space-y-1">
														<div className="font-medium">
															{formatPath(warning.path)}
														</div>
														<div>{warning.message}</div>
														{warning.suggestion && (
															<div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
																<div className="flex items-start gap-1">
																	<Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
																	<span className="text-xs">
																		<strong>Suggestion:</strong>{" "}
																		{warning.suggestion}
																	</span>
																</div>
															</div>
														)}
														<div className="text-xs text-gray-600">
															Code: {warning.code}
														</div>
													</div>
												</AlertDescription>
											</Alert>
										))}
									</div>
								</ScrollArea>
							</div>
						)}

						{/* Help Text */}
						<Alert>
							<Info className="h-4 w-4" />
							<AlertDescription>
								<div className="space-y-1">
									<div className="font-medium">How to fix these issues:</div>
									<ul className="text-sm space-y-1 ml-4">
										<li>
											• Fix all errors before the content pack can be activated
										</li>
										<li>• Warnings are optional but recommended to address</li>
										<li>
											• Check the JSON path to locate the issue in your file
										</li>
										<li>
											• Use the error codes to understand the validation rules
										</li>
									</ul>
								</div>
							</AlertDescription>
						</Alert>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
