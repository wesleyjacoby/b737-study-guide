// DOM + markdown helpers (tiny, no dependencies)
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const esc = (s = "") =>
	String(s).replace(
		/[&<>]/g,
		(c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])
	);

export const mdInline = (s) =>
	esc(String(s)).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

export const mdBlock = (text = "") => {
	let t = esc(text.trim()).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
	const lines = t.split(/\n+/);
	let out = "",
		ul = false;
	for (const ln of lines) {
		const m = ln.match(/^[-•]\s*(.*)$/);
		if (m) {
			if (!ul) {
				out += "<ul>";
				ul = true;
			}
			out += `<li>${m[1]}</li>`;
		} else {
			if (ul) {
				out += "</ul>";
				ul = false;
			}
			if (ln.trim()) out += `<p>${ln}</p>`;
		}
	}
	if (ul) out += "</ul>";
	return out || "—";
};
