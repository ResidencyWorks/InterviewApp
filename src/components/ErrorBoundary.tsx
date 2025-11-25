"use client";

import React from "react";
import { captureException } from "@/shared/error/ErrorTrackingService";

interface ErrorBoundaryState {
	hasError: boolean;
}

export class ErrorBoundary extends React.Component<
	React.PropsWithChildren,
	ErrorBoundaryState
> {
	constructor(props: React.PropsWithChildren) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(): ErrorBoundaryState {
		return { hasError: true };
	}

	componentDidCatch(error: Error) {
		captureException(error);
	}

	render() {
		if (this.state.hasError) {
			return null;
		}
		return this.props.children as React.ReactElement;
	}
}
