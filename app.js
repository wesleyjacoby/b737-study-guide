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
import { initAudio } from "./modules/audio.js";

// Global-ish state
let DATA = null; // current pack object
const openSet = new Set(); // expanded node ids
let selectedNode = null; // currently selected node
let selectedPath = []; // crumbs path

// DOM
const manyInput = $("#manyInput");
const datasetSelect = $("#datasetSelect");
const treeEl = $("#tree");
const searchEl = $("#search");
const packMetaEl = $("#packMeta");

const reader = initReader({
	crumbsEl: $("#crumbs"),
	titleEl: $("#title"),
	contentEl: $("#content"),
	btnCopy: $("#btnCopy"),
});

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

const audioCtl = initAudio({
	audioInput: $("#audioInput"),
	player: $("#player"),
	metaEl: $("#audioMeta"),
});

// ---------- Library + dataset selection ----------
function refreshDatasetSelect() {
	datasetSelect.innerHTML = listTitles()
		.map((t) => `<option value="${t}">${t}</option>`)
		.join("");
	datasetSelect.onchange = () => setPack(getPack(datasetSelect.value));
	if (datasetSelect.options.length && !DATA) {
		datasetSelect.value = datasetSelect.options[0].value;
		datasetSelect.onchange();
	}
}

async function onLoadFiles(e) {
	const files = [...e.target.files];
	const added = await addPacksFromFiles(files);
	if (!added) return alert("No valid JSON packs.");
	refreshDatasetSelect();
}
manyInput.addEventListener("change", onLoadFiles);

function setPack(pack) {
	DATA = pack;
	openSet.clear();
	selectedNode = null;
	selectedPath = [];
	packMetaEl.textContent = `${pack.title} — v${pack.version || "local"}`;
	renderTree({ data: DATA, container: treeEl, openSet, onSelect });
	// reset right side
	reader.show({ title: "Select a section…", summary_full: "" }, []);
	flashcards.reset?.();
	audioCtl.clear();
}

// Node selection
function onSelect(node, path) {
	selectedNode = node;
	selectedPath = path;
	reader.show(node, path);
	flashcards.reset?.();
	audioCtl.setFromNode(node);
}

// ---------- Search ----------
searchEl.addEventListener("input", () => {
	if (!DATA) return;
	const view = filteredPack(DATA, searchEl.value);
	renderTree({ data: view, container: treeEl, openSet, onSelect });
});

// ---------- Bootstrap ----------
loadLibrary(); // restore any previously loaded packs
refreshDatasetSelect(); // auto-select the first if present
