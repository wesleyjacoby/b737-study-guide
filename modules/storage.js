// Keeps a library of packs in memory, with optional localStorage persistence.
const KEY = "b737LIB";

export const LIB = {}; // title -> pack

export function loadLibrary() {
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return;
		const obj = JSON.parse(raw);
		for (const [k, v] of Object.entries(obj)) LIB[k] = v;
	} catch {}
}

export function saveLibrary() {
	try {
		localStorage.setItem(KEY, JSON.stringify(LIB));
	} catch {}
}

export async function addPacksFromFiles(fileList) {
	let added = 0;
	for (const f of fileList) {
		try {
			const j = JSON.parse(await f.text());
			if (j && j.title && Array.isArray(j.nodes)) {
				LIB[j.title] = j;
				added++;
			}
		} catch {}
	}
	if (added) saveLibrary();
	return added;
}

export const listTitles = () => Object.keys(LIB);
export const getPack = (title) => LIB[title] || null;
