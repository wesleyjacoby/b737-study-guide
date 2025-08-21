// Controls the Reader pane: crumbs, title, summary display, copy button.
import { esc, mdBlock } from "./ui.js";

export function initReader({ crumbsEl, titleEl, contentEl, btnCopy }) {
	let current = null,
		currentPath = [];

	async function copySummary() {
		const txt = contentEl.textContent.trim();
		if (!txt) return;
		await navigator.clipboard.writeText(txt);
		alert("Summary copied.");
	}
	btnCopy.addEventListener("click", copySummary);

	function show(node, path) {
		current = node;
		currentPath = path;
		crumbsEl.innerHTML = path
			.map((t) => `<span class="crumb">${esc(t)}</span>`)
			.join("");
		titleEl.textContent = node.title;
		const s = node.summary_full || node.summary || "";
		contentEl.innerHTML = s
			? mdBlock(s)
			: "<em>No summary saved for this node.</em>";
	}

	return {
		show,
		get current() {
			return current;
		},
		get path() {
			return currentPath;
		},
	};
}
