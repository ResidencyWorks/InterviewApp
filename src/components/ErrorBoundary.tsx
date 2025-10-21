"use client";

import * as Sentry from "@sentry/nextjs";
import React from "react";

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
		Sentry.captureException(error);
	}

	render() {
		if (this.state.hasError) {
			return null;
		}
		return this.props.children as React.ReactElement;
	}
}
