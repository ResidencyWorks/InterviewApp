"use client";

type Item = {
	title: string;
	type: string;
	priority: string;
	effort: string;
	impact: string;
};

export function RecommendationDisplay({ items }: { items: Item[] }) {
	return (
		<table className="w-full text-left">
			<thead>
				<tr>
					<th>Title</th>
					<th>Type</th>
					<th>Priority</th>
					<th>Effort</th>
					<th>Impact</th>
				</tr>
			</thead>
			<tbody>
				{items.map((i) => (
					<tr key={i.title}>
						<td>{i.title}</td>
						<td>{i.type}</td>
						<td>{i.priority}</td>
						<td>{i.effort}</td>
						<td>{i.impact}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}
