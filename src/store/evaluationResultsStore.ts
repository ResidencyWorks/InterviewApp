import { useSyncExternalStore } from "react";
import type { IEvaluationResult } from "../lib/evaluation/evaluation-schema";

export interface IEvaluationState {
	result?: IEvaluationResult;
	isSubmitting: boolean;
	error?: string;
}

type Subscriber = () => void;

const subscribers = new Set<Subscriber>();

let state: IEvaluationState = {
	isSubmitting: false,
};

function emit(): void {
	subscribers.forEach((cb) => {
		cb();
	});
}

function setState(partial: Partial<IEvaluationState>): void {
	state = { ...state, ...partial };
	emit();
}

export function setSubmitting(isSubmitting: boolean): void {
	setState({ isSubmitting });
}

export function setResult(result: IEvaluationResult): void {
	setState({ result, error: undefined, isSubmitting: false });
}

export function setError(message?: string): void {
	setState({ error: message, isSubmitting: false });
}

export function useEvaluationResultsStore(): IEvaluationState {
	return useSyncExternalStore(
		(callback) => {
			subscribers.add(callback);
			return () => subscribers.delete(callback);
		},
		() => state,
		() => state,
	);
}
