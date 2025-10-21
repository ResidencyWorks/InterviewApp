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
import { useDropzone } from "react-dropzone";
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

interface UploadStatus {
	status: "idle" | "uploading" | "validating" | "completed" | "failed";
	progress: number;
	error?: string;
	uploadId?: string;
	contentPackId?: string;
}

interface ValidationResult {
	isValid: boolean;
	errors: Array<{
		path: string;
		message: string;
		code: string;
		severity: "error" | "warning";
	}>;
	warnings: Array<{
		path: string;
		message: string;
		code: string;
		suggestion?: string;
	}>;
}

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
		useState<ValidationResult | null>(null);
	const [dragActive, setDragActive] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileUpload = useCallback(
		async (file: File) => {
			setUploadStatus({ status: "uploading", progress: 0 });
			setValidationResult(null);

			try {
				// Create form data
				const formData = new FormData();
				formData.append("file", file);
				formData.append("name", file.name.replace(".json", ""));
				formData.append("description", `Uploaded content pack: ${file.name}`);

				// Upload file
				const response = await fetch("/api/content-packs", {
					method: "POST",
					body: formData,
				});

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.message || "Upload failed");
				}

				const result = await response.json();

				setUploadStatus({
					status: "completed",
					progress: 100,
					uploadId: result.uploadId,
					contentPackId: result.data.id,
				});

				// If validation failed, show validation results
				if (result.data.status === "invalid") {
					setValidationResult({
						isValid: false,
						errors: result.validation?.errors || [],
						warnings: result.validation?.warnings || [],
					});
				}

				onUploadComplete?.(result.data.id);
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Upload failed";
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
		},
		maxFiles: 1,
		maxSize: maxFileSize,
		onDragEnter: () => setDragActive(true),
		onDragLeave: () => setDragActive(false),
		onDropAccepted: () => setDragActive(false),
		onDropRejected: (fileRejections: any[]) => {
			setDragActive(false);
			const rejection = fileRejections[0];
			const error = rejection.errors[0];
			let errorMessage = "File upload failed";

			switch (error.code) {
				case "file-too-large":
					errorMessage = `File is too large. Maximum size is ${Math.round(maxFileSize / 1024 / 1024)}MB`;
					break;
				case "file-invalid-type":
					errorMessage = "File must be a JSON file";
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
				return <Upload className="h-8 w-8 animate-pulse text-blue-500" />;
			case "completed":
				return <CheckCircle className="h-8 w-8 text-green-500" />;
			case "failed":
				return <AlertCircle className="h-8 w-8 text-red-500" />;
			default:
				return <FileText className="h-8 w-8 text-gray-400" />;
		}
	};

	const getStatusMessage = () => {
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
						Upload a JSON file containing your content pack configuration
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div
						{...getRootProps()}
						className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${
								isDragActive || dragActive
									? "border-blue-500 bg-blue-50"
									: "border-gray-300 hover:border-gray-400"
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
							accept=".json,application/json"
							onChange={handleFileInputChange}
							className="hidden"
						/>

						<div className="space-y-4">
							<div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
								{getStatusIcon()}
							</div>

							<div>
								<p className="text-lg font-medium text-gray-900">
									{getStatusMessage()}
								</p>
								<p className="text-sm text-gray-500 mt-1">
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

					{/* Upload Progress */}
					{(uploadStatus.status === "uploading" ||
						uploadStatus.status === "validating") && (
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
