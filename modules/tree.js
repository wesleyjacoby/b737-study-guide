// Renders the chapters/sections tree and manages open/close state.
import { esc } from "./ui.js";

export function renderTree({ data, container, openSet, onSelect }) {
	container.innerHTML = "";
	if (!data) return;
	const ul = document.createElement("ul");
	ul.className = "tree";
	data.nodes.forEach((n) => ul.appendChild(renderNode(n, [n.title])));
	container.appendChild(ul);

	function renderNode(node, path) {
		const li = document.createElement("li");
		const row = document.createElement("div");
		row.className = "node-row row";

		const has = node.children && node.children.length;
		const tog = document.createElement("div");
		tog.className = "toggle";
		tog.textContent = has ? (openSet.has(node.id) ? "–" : "+") : "•";
		if (!has) tog.style.opacity = 0.5;
		tog.onclick = () => {
			if (!has) return;
			openSet.has(node.id) ? openSet.delete(node.id) : openSet.add(node.id);
			renderTree({ data, container, openSet, onSelect });
		};

		const title = document.createElement("div");
		title.className = "title";
		title.textContent = node.title;
		title.onclick = () => onSelect(node, path);

		row.appendChild(tog);
		row.appendChild(title);
		li.appendChild(row);

		if (has && openSet.has(node.id)) {
			const kids = document.createElement("div");
			kids.className = "children";
			const inner = document.createElement("ul");
			inner.className = "tree";
			node.children.forEach((c) =>
				inner.appendChild(renderNode(c, path.concat(c.title)))
			);
			kids.appendChild(inner);
			li.appendChild(kids);
		}
		return li;
	}
}

// Utility to make a filtered “view” of the pack by title matches (non-destructive)
export function filteredPack(data, query) {
	if (!data || !query) return data;
	const q = query.toLowerCase();
	const out = JSON.parse(JSON.stringify(data));
	function filt(n) {
		const self = (n.title || "").toLowerCase().includes(q);
		if (n.children) {
			const kids = n.children.map(filt).filter(Boolean);
			if (self || kids.length) return { ...n, children: kids };
			return null;
		}
		return self ? n : null;
	}
	out.nodes = (data.nodes || []).map(filt).filter(Boolean);
	return out;
}
