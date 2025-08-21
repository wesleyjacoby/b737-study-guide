// app.js
import { $, mdBlock } from "./modules/ui.js";
import {
	LIB,
	loadLibrary,
	saveLibrary,
	addPacksFromFiles,
	listTitles,
	getPack,
} from "./modules/storage.js";
import { renderTree, filteredPack } from "./modules/tree.js";
import { initReader } from "./modules/reader.js";
import { initFlashcards } from "./modules/flashcards.js";
import { mountAudio, showAudioFor } from "./modules/audio.js";

// ---------------- State ----------------
let DATA = null; // current pack object
const openSet = new Set(); // expanded node ids in the tree
let selectedNode = null; // currently selected node
let selectedPath = []; // breadcrumbs path

// ---------------- DOM ----------------
const manyInput = $("#manyInput");
const datasetSelect = $("#datasetSelect");
const treeEl = $("#tree");
const searchEl = $("#search");
const packMetaEl = $("#packMeta");

// Reader panel (summary text, breadcrumbs, copy button)
const reader = initReader({
	crumbsEl: $("#crumbs"),
	titleEl: $("#title"),
	contentEl: $("#content"),
	btnCopy: $("#btnCopy"),
});

// Flashcards toolbar
const flashcards = initFlashcards({
	cardText: $("#cardText"),
	countChip: $("#countChip"),
	barEl: $("#bar"),
	btnBuild: $("#btnBuild"),
	btnShuffle: $("#btnShuffle"),
	btnReset: $("#btnReset"),
	btnReveal: $("#btnReveal"),
	btnAgain: $("#btnAgain"),
	btnGood: $("#btnGood"),
	btnEasy: $("#btnEasy"),
	getCurrentNode: () => selectedNode,
});

// Mount the audio player once (it injects a <audio> element into the reader side)
mountAudio("#flashPanel");

// --------------- Library + dataset selection ---------------
function refreshDatasetSelect() {
	const titles = listTitles();
	datasetSelect.innerHTML = titles
		.map((t) => `<option value="${t}">${t}</option>`)
		.join("");

	// Prefer last-used pack if still present
	const lastTitle = localStorage.getItem("lastPackTitle");
	if (lastTitle && titles.includes(lastTitle)) {
		datasetSelect.value = lastTitle;
	}

	datasetSelect.onchange = () => {
		const chosen = getPack(datasetSelect.value);
		if (chosen) setPack(chosen);
	};

	if (datasetSelect.options.length && !DATA) {
		datasetSelect.onchange(); // load first (or last) pack
	}
}

async function onLoadFiles(e) {
	const files = [...e.target.files];
	const addedCount = await addPacksFromFiles(files);
	if (!addedCount) {
		alert("No valid JSON packs were found.");
		return;
	}
	saveLibrary();
	refreshDatasetSelect();
}
manyInput?.addEventListener("change", onLoadFiles);

// Central setter for a new pack
function setPack(pack) {
	DATA = pack;
	localStorage.setItem("lastPackTitle", pack.title);
	openSet.clear();
	selectedNode = null;
	selectedPath = [];

	packMetaEl.textContent = `${pack.title} — v${pack.version || "local"}`;

	renderTree({ data: DATA, container: treeEl, openSet, onSelect });

	// Reset right panel
	reader.show({ title: "Select a section…", summary_full: "" }, []);
	flashcards.reset?.();

	// Show pack-level audio (if present) until a node is selected
	showAudioFor(null, DATA);
}

// --------------- Node selection ---------------
function onSelect(node, path) {
	selectedNode = node;
	selectedPath = path;

	reader.show(node, path);
	flashcards.reset?.();

	// Prefer node-level audio; fall back to pack-level
	showAudioFor(node, DATA);
}

// --------------- Search ---------------
searchEl?.addEventListener("input", () => {
	if (!DATA) return;
	const view = filteredPack(DATA, searchEl.value);
	renderTree({ data: view, container: treeEl, openSet, onSelect });
});

// --------------- Catalog auto-load ---------------
async function loadCatalog() {
	try {
		const res = await fetch("./data/catalog.json", { cache: "no-cache" });
		if (!res.ok) return; // catalog is optional
		const cat = await res.json();
		if (!Array.isArray(cat.packs)) return;

		for (const p of cat.packs) {
			try {
				const r = await fetch(p.file, { cache: "no-cache" });
				if (!r.ok) continue;
				const pack = await r.json();
				if (pack && pack.title && Array.isArray(pack.nodes)) {
					// Replace any existing entry with the same title
					LIB[pack.title] = pack;
				}
			} catch {
				// ignore one-pack failure
			}
		}
		saveLibrary(); // persist to localStorage
		refreshDatasetSelect();
	} catch {
		// no catalog present; ignore
	}
}

// --------------- Bootstrap ---------------
loadLibrary(); // restore previously loaded packs from localStorage
refreshDatasetSelect(); // populate dropdown (selects last-used if available)
loadCatalog(); // optionally auto-load packs listed in /data/catalog.json
