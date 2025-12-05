/**
 * ContentPackUpload Component
 *
 * Provides a drag-and-drop interface for uploading content pack JSON files
 * with validation, progress tracking, and error handling.
 */

"use client";

import { AlertCircle, CheckCircle, FileText, Upload } from "lucide-react";
import type React from "react";
import { useCallback, useRef, useState } from "react";
import { type FileRejection, useDropzone } from "react-dropzone";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { UploadProgress } from "./UploadProgress";
import { ValidationResults } from "./ValidationResults";

// UI-only validation types (subset of domain entity)
type UIValidationError = {
	path: string;
	message: string;
	code: string;
	severity: "error" | "warning";
};

type UIValidationWarning = {
	path: string;
	message: string;
	code: string;
	suggestion?: string;
};

type UIValidationResult = {
	isValid: boolean;
	errors: UIValidationError[];
	warnings: UIValidationWarning[];
};

interface UploadStatus {
	status: "idle" | "uploading" | "validating" | "completed" | "failed";
	progress: number;
	error?: string;
	uploadId?: string;
	contentPackId?: string;
}

// ValidationResult is now imported from domain entities

interface ContentPackUploadProps {
	onUploadComplete?: (contentPackId: string) => void;
	onUploadError?: (error: string) => void;
	maxFileSize?: number;
	className?: string;
}

export function ContentPackUpload({
	onUploadComplete,
	onUploadError,
	maxFileSize = 10 * 1024 * 1024, // 10MB
	className = "",
}: ContentPackUploadProps) {
	const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
		status: "idle",
		progress: 0,
	});
	const [validationResult, setValidationResult] =
		useState<UIValidationResult | null>(null);
	const [dragActive, setDragActive] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileUpload = useCallback(
		async (file: File) => {
			console.log("ContentPackUpload: Starting upload for file:", file.name);
			setUploadStatus({ status: "uploading", progress: 0 });
			setValidationResult(null);

			try {
				console.log("ContentPackUpload: Creating form data");
				// Create form data
				const formData = new FormData();
				formData.append("file", file);
				// Remove file extension for name (supports both .json and .xlsx/.xls)
				const nameWithoutExt = file.name.replace(/\.(json|xlsx|xls)$/i, "");
				formData.append("name", nameWithoutExt);
				formData.append("description", `Uploaded content pack: ${file.name}`);

				console.log("ContentPackUpload: Sending request to /api/content-packs");
				// Upload file
				const response = await fetch("/api/content-packs", {
					method: "POST",
					body: formData,
				});

				console.log("ContentPackUpload: Response status:", response.status);
				if (!response.ok) {
					console.log("ContentPackUpload: Response not ok, parsing error");
					let errorData: {
						error?: string;
						message?: string;
						details?: {
							errors?: UIValidationError[];
							warnings?: UIValidationWarning[];
						};
					} | null = null;
					try {
						errorData = await response.json();
						console.log("ContentPackUpload: Error data:", errorData);
					} catch (_e) {
						console.log("ContentPackUpload: Failed to parse error response");
						// ignore
					}

					// Surface backend validation errors
					if (
						response.status === 400 &&
						errorData?.error === "VALIDATION_FAILED" &&
						errorData?.details
					) {
						console.log("ContentPackUpload: Setting validation result");
						setValidationResult({
							isValid: false,
							errors: errorData.details.errors || [],
							warnings: errorData.details.warnings || [],
						});
						setUploadStatus({
							status: "failed",
							progress: 0,
							error: "Validation failed. See details below.",
						});
						return;
					}

					console.log("ContentPackUpload: Throwing error:", errorData?.message);
					throw new Error(errorData?.message || "Upload failed");
				}

				console.log("ContentPackUpload: Parsing successful response");
				const result = await response.json();
				console.log("ContentPackUpload: Response data:", result);
				console.log("ContentPackUpload: Result data structure:", {
					hasData: !!result.data,
					dataId: result.data?.id,
					dataStatus: result.data?.status,
					hasUploadId: !!result.uploadId,
				});

				console.log("ContentPackUpload: Setting upload status to completed");
				setUploadStatus({
					status: "completed",
					progress: 100,
					uploadId: result.uploadId,
					contentPackId: result.data.id,
				});
				console.log("ContentPackUpload: Upload status set, current state:", {
					status: "completed",
					progress: 100,
					uploadId: result.uploadId,
					contentPackId: result.data.id,
				});

				// If validation failed, show validation results
				if (result.data.status === "invalid" && result.validation) {
					console.log(
						"ContentPackUpload: Setting validation result for invalid pack",
					);
					setValidationResult(result.validation);
				}

				console.log("ContentPackUpload: Calling onUploadComplete");
				onUploadComplete?.(result.data.id);
			} catch (error) {
				console.error("ContentPackUpload: Upload error:", error);
				let errorMessage = "Upload failed";

				if (error instanceof Error) {
					errorMessage = error.message;
				} else if (typeof error === "string") {
					errorMessage = error;
				}

				// Provide more user-friendly error messages
				if (
					errorMessage.includes("Failed to fetch") ||
					errorMessage.includes("NetworkError")
				) {
					errorMessage =
						"Network error. Please check your connection and try again.";
				} else if (
					errorMessage.includes("Invalid Excel") ||
					errorMessage.includes("Missing required")
				) {
					errorMessage = `Invalid file format: ${errorMessage}`;
				}

				setUploadStatus({
					status: "failed",
					progress: 0,
					error: errorMessage,
				});
				onUploadError?.(errorMessage);
			}
		},
		[onUploadComplete, onUploadError],
	);

	const onDrop = useCallback(
		async (acceptedFiles: File[]) => {
			if (acceptedFiles.length === 0) return;

			const file = acceptedFiles[0];
			await handleFileUpload(file);
		},
		[handleFileUpload],
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			"application/json": [".json"],
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
				".xlsx",
			],
			"application/vnd.ms-excel": [".xls"],
		},
		maxFiles: 1,
		maxSize: maxFileSize,
		onDragEnter: () => setDragActive(true),
		onDragLeave: () => setDragActive(false),
		onDropAccepted: () => setDragActive(false),
		onDropRejected: (fileRejections: FileRejection[]) => {
			setDragActive(false);
			const rejection = fileRejections[0];
			const error = rejection.errors[0];
			let errorMessage = "File upload failed";

			switch (error.code) {
				case "file-too-large":
					errorMessage = `File is too large. Maximum size is ${Math.round(maxFileSize / 1024 / 1024)}MB`;
					break;
				case "file-invalid-type":
					errorMessage =
						"File must be a JSON (.json) or Excel (.xlsx, .xls) file";
					break;
				case "too-many-files":
					errorMessage = "Only one file can be uploaded at a time";
					break;
				default:
					errorMessage = error.message;
			}

			setUploadStatus({
				status: "failed",
				progress: 0,
				error: errorMessage,
			});
		},
	});

	const handleFileSelect = () => {
		fileInputRef.current?.click();
	};

	const handleFileInputChange = (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = event.target.files?.[0];
		if (file) {
			handleFileUpload(file);
		}
	};

	const resetUpload = () => {
		setUploadStatus({ status: "idle", progress: 0 });
		setValidationResult(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const getStatusIcon = () => {
		switch (uploadStatus.status) {
			case "uploading":
			case "validating":
				return (
					<Upload className="h-8 w-8 animate-pulse text-blue-600 dark:text-blue-400" />
				);
			case "completed":
				return (
					<CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
				);
			case "failed":
				return (
					<AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
				);
			default:
				return <FileText className="h-8 w-8 text-muted-foreground" />;
		}
	};

	const getStatusMessage = () => {
		console.log(
			"ContentPackUpload: getStatusMessage called, current status:",
			uploadStatus.status,
		);
		switch (uploadStatus.status) {
			case "uploading":
				return "Uploading content pack...";
			case "validating":
				return "Validating content pack...";
			case "completed":
				return "Content pack uploaded successfully!";
			case "failed":
				return "Upload failed";
			default:
				return "Drag and drop a JSON file here, or click to select";
		}
	};

	return (
		<div className={`space-y-4 ${className}`}>
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						{getStatusIcon()}
						Upload Content Pack
					</CardTitle>
					<CardDescription>
						Upload a JSON file containing your content pack configuration or an
						Excel file using the template below.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div
						{...getRootProps()}
						className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${
								isDragActive || dragActive
									? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/30"
									: "border-border hover:border-muted-foreground/50"
							}
              ${
								uploadStatus.status === "uploading" ||
								uploadStatus.status === "validating"
									? "pointer-events-none opacity-50"
									: ""
							}
            `}
					>
						<input {...getInputProps()} />
						<input
							ref={fileInputRef}
							type="file"
							accept=".json,.xlsx,.xls,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
							onChange={handleFileInputChange}
							className="hidden"
						/>

						<div className="space-y-4">
							<div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
								{getStatusIcon()}
							</div>

							<div>
								<p className="text-lg font-medium text-foreground">
									{getStatusMessage()}
								</p>
								<p className="text-sm text-muted-foreground mt-1">
									Maximum file size: {Math.round(maxFileSize / 1024 / 1024)}MB
								</p>
							</div>

							{uploadStatus.status === "idle" && (
								<Button variant="outline" onClick={handleFileSelect}>
									Select File
								</Button>
							)}
						</div>
					</div>

					<div className="mt-4 space-y-2 text-sm text-muted-foreground">
						<p>
							Supported formats: JSON (.json) or Excel (.xlsx). Download a blank
							template to fill in or grab a fully populated sample pack to see
							the expected structure.
						</p>
						<div className="flex flex-wrap gap-2">
							<Button variant="secondary" size="sm" asChild>
								<a href="/api/content-packs/template">
									Download Blank Template
								</a>
							</Button>
							<Button variant="outline" size="sm" asChild>
								<a href="/api/content-packs/sample">Download Sample Pack</a>
							</Button>
							<Button variant="outline" size="sm" asChild>
								<a href="/admin/content-packs?tab=list">
									View All Content Packs
								</a>
							</Button>
						</div>
					</div>

					{/* Upload Progress */}
					{(uploadStatus.status === "uploading" ||
						uploadStatus.status === "validating" ||
						uploadStatus.status === "failed") && (
						<div className="mt-4">
							<UploadProgress
								status={uploadStatus.status}
								progress={uploadStatus.progress}
								uploadId={uploadStatus.uploadId}
							/>
						</div>
					)}

					{/* Error Display */}
					{uploadStatus.status === "failed" && uploadStatus.error && (
						<Alert variant="destructive" className="mt-4">
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>{uploadStatus.error}</AlertDescription>
						</Alert>
					)}

					{/* Success Message */}
					{uploadStatus.status === "completed" && (
						<Alert className="mt-4">
							<CheckCircle className="h-4 w-4" />
							<AlertDescription>
								Content pack uploaded successfully! You can now activate it or
								upload another.
							</AlertDescription>
						</Alert>
					)}

					{/* Action Buttons */}
					{uploadStatus.status === "completed" ||
					uploadStatus.status === "failed" ? (
						<div className="mt-4 flex gap-2">
							<Button onClick={resetUpload} variant="outline">
								Upload Another
							</Button>
							{uploadStatus.status === "completed" &&
								uploadStatus.contentPackId && (
									<Button onClick={() => window.location.reload()}>
										View Content Packs
									</Button>
								)}
						</div>
					) : null}
				</CardContent>
			</Card>

			{/* Validation Results */}
			{validationResult && (
				<ValidationResults
					result={validationResult}
					onClose={() => setValidationResult(null)}
				/>
			)}
		</div>
	);
}
