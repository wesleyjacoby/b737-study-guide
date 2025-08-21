// Minimal scaffold: loads multiple packs via file picker; basic tree/reader/flashcards/audio.

const LIB = {}; // title -> pack {title, version, nodes}
let DATA = null; // current pack
const state = {
	open: new Set(),
	selected: null,
	cards: [],
	cardIx: 0,
	revealed: false,
};

// DOM
const manyInput = document.getElementById("manyInput");
const datasetSelect = document.getElementById("datasetSelect");
const treeEl = document.getElementById("tree");
const searchEl = document.getElementById("search");
const crumbsEl = document.getElementById("crumbs");
const titleEl = document.getElementById("title");
const contentEl = document.getElementById("content");
const packMetaEl = document.getElementById("packMeta");

// Flashcards DOM
const btnBuild = document.getElementById("btnBuild");
const btnShuffle = document.getElementById("btnShuffle");
const btnReset = document.getElementById("btnReset");
const btnReveal = document.getElementById("btnReveal");
const btnAgain = document.getElementById("btnAgain");
const btnGood = document.getElementById("btnGood");
const btnEasy = document.getElementById("btnEasy");
const cardText = document.getElementById("cardText");
const countChip = document.getElementById("countChip");
const barEl = document.getElementById("bar");

// Audio DOM
const audioInput = document.getElementById("audioInput");
const player = document.getElementById("player");
const audioMeta = document.getElementById("audioMeta");

// --- Helpers
const esc = (s = "") =>
	String(s).replace(
		/[&<>]/g,
		(c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])
	);
const mdInline = (s) =>
	esc(String(s)).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
const mdBlock = (text = "") => {
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

// --- Multi pack loader
manyInput.addEventListener("change", async (e) => {
	const files = [...e.target.files];
	let added = 0;
	for (const f of files) {
		try {
			const j = JSON.parse(await f.text());
			if (j && j.title && Array.isArray(j.nodes)) {
				LIB[j.title] = j;
				added++;
			}
		} catch {}
	}
	if (!added) return alert("No valid JSON packs.");
	refreshDatasetSelect();
});

function refreshDatasetSelect() {
	datasetSelect.innerHTML = Object.keys(LIB)
		.map((t) => `<option value="${t}">${t}</option>`)
		.join("");
	datasetSelect.onchange = () => {
		setPack(LIB[datasetSelect.value]);
	};
	if (datasetSelect.options.length && !DATA) {
		datasetSelect.value = datasetSelect.options[0].value;
		datasetSelect.onchange();
	}
}

function setPack(pack) {
	DATA = pack;
	state.open.clear();
	state.selected = null;
	packMetaEl.textContent = `${pack.title} — v${pack.version || "local"}`;
	renderTree();
	crumbsEl.innerHTML = "";
	titleEl.textContent = "Select a section…";
	contentEl.innerHTML = "—";
	resetFlashcards();
}

// --- Tree render
function renderTree() {
	treeEl.innerHTML = "";
	if (!DATA) return;
	const ul = document.createElement("ul");
	ul.className = "tree";
	DATA.nodes.forEach((n, i) => ul.appendChild(renderNode(n, [n.title])));
	treeEl.appendChild(ul);
}
function renderNode(node, path) {
	const li = document.createElement("li");
	const row = document.createElement("div");
	row.className = "node-row row";
	const has = node.children && node.children.length;
	const tw = document.createElement("div");
	tw.className = "toggle";
	tw.textContent = has ? (state.open.has(node.id) ? "–" : "+") : "•";
	if (!has) tw.style.opacity = 0.5;
	tw.onclick = () => {
		if (!has) return;
		state.open.has(node.id)
			? state.open.delete(node.id)
			: state.open.add(node.id);
		renderTree();
	};
	const title = document.createElement("div");
	title.className = "title";
	title.textContent = node.title;
	title.onclick = () => selectNode(node, path);
	row.appendChild(tw);
	row.appendChild(title);
	li.appendChild(row);
	if (has && state.open.has(node.id)) {
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

// --- Reader
function selectNode(node, path) {
	state.selected = node;
	crumbsEl.innerHTML = path
		.map((t) => `<span class="crumb">${esc(t)}</span>`)
		.join("");
	titleEl.textContent = node.title;
	const summary = node.summary_full || node.summary || "";
	contentEl.innerHTML =
		mdBlock(summary) || "<em>No summary saved for this node.</em>";
	// load any bundled audio url if present; clear attached one
	player.removeAttribute("src");
	player.load();
	audioMeta.textContent = "";
	if (node.audio && node.audio.url) {
		player.src = node.audio.url;
		audioMeta.textContent = "Bundled audio";
	}
	resetFlashcards(); // reset deck when switching sections
}

document.getElementById("btnCopy").onclick = async () => {
	const txt = contentEl.textContent.trim();
	if (!txt) return;
	await navigator.clipboard.writeText(txt);
	alert("Summary copied.");
};

// --- Flashcards
function buildDeckFromNode() {
	const n = state.selected;
	if (!n) return [];
	// 1) Prefer prebuilt
	if (Array.isArray(n.flashcards) && n.flashcards.length) {
		return n.flashcards.map((fc) => ({ q: fc.q, a: fc.a }));
	}
	// 2) Derive from summary as fallback
	const s = n.summary_full || n.summary || "";
	if (!s) return [];
	const lines = s
		.split(/\n+/)
		.map((x) => x.trim())
		.filter(Boolean);
	const out = [];
	for (const ln of lines) {
		let m = ln.match(/^\*\*(.+?)\*\*\s*[—:-]\s*(.+)$/);
		if (m) {
			out.push({ q: m[1].trim(), a: m[2].trim() });
			continue;
		}
		m = ln.match(/^[-•]\s*(.+)$/);
		if (m) {
			out.push({ q: n.title + ":", a: m[1] });
			continue;
		}
		if (/\.$/.test(ln)) {
			out.push({ q: ln.split(/\s+/).slice(0, 5).join(" ") + " …", a: ln });
		}
	}
	return out;
}

function shuffle(a) {
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
}
function updateCardUI() {
	if (!state.cards.length) {
		cardText.textContent = "No cards. Click “Build from Summary”.";
		countChip.textContent = "0 / 0";
		barEl.style.width = "0%";
		return;
	}
	const c = state.cards[state.cardIx];
	cardText.innerHTML = state.revealed
		? `<div class="small">Answer</div><div>${mdInline(c.a)}</div>`
		: `<div class="small">Prompt</div><div>${mdInline(c.q)}</div>`;
	countChip.textContent = `${state.cardIx + 1} / ${state.cards.length}`;
	barEl.style.width = `${((state.cardIx + 1) / state.cards.length) * 100}%`;
}
function resetFlashcards() {
	state.cards = [];
	state.cardIx = 0;
	state.revealed = false;
	updateCardUI();
}

btnBuild.onclick = () => {
	if (!state.selected) return alert("Pick a section first.");
	state.cards = buildDeckFromNode();
	if (state.cards.length) {
		shuffle(state.cards);
		state.cardIx = 0;
		state.revealed = false;
	}
	updateCardUI();
};
btnShuffle.onclick = () => {
	if (!state.cards.length) return;
	shuffle(state.cards);
	state.cardIx = 0;
	state.revealed = false;
	updateCardUI();
};
btnReset.onclick = resetFlashcards;
btnReveal.onclick = () => {
	state.revealed = !state.revealed;
	updateCardUI();
};
btnAgain.onclick = () => {
	if (!state.cards.length) return;
	const cur = state.cards.splice(state.cardIx, 1)[0];
	state.cards.push(cur);
	if (state.cardIx >= state.cards.length) state.cardIx = state.cards.length - 1;
	state.revealed = false;
	updateCardUI();
};
btnGood.onclick = () => {
	if (!state.cards.length) return;
	state.cardIx = Math.min(state.cardIx + 1, state.cards.length - 1);
	state.revealed = false;
	updateCardUI();
};
btnEasy.onclick = btnGood.onclick;

// --- Audio attach (no persistence yet; we can add IndexedDB later)
audioInput.addEventListener("change", () => {
	const f = audioInput.files && audioInput.files[0];
	if (!f) return;
	const url = URL.createObjectURL(f);
	player.src = url;
	player.play().catch(() => {});
	audioMeta.textContent = `Attached: ${f.name}`;
});
document.getElementById("btnRemoveAudio").onclick = () => {
	player.removeAttribute("src");
	player.load();
	audioMeta.textContent = "Removed";
};

// --- Search filter (client-side, temporary render)
searchEl.addEventListener("input", () => {
	if (!DATA) return;
	const q = searchEl.value.toLowerCase();
	const pruned = JSON.parse(JSON.stringify(DATA));
	function filter(node) {
		if (!node) return null;
		const self = (node.title || "").toLowerCase().includes(q);
		if (node.children) {
			const kids = node.children.map(filter).filter(Boolean);
			if (self || kids.length) return { ...node, children: kids };
			return null;
		}
		return self ? node : null;
	}
	pruned.nodes = (DATA.nodes || []).map(filter).filter(Boolean);
	const save = DATA;
	DATA = pruned;
	renderTree();
	DATA = save;
});
