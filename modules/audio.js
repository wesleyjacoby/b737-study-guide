// /modules/audio.js

// Normalize audio config: accept string or { url, title/label, src }
function unwrapAudio(a) {
	if (!a) return null;
	if (typeof a === "string") return { url: a, label: "" };
	if (typeof a === "object") {
		if (a.url) return { url: a.url, label: a.title || a.label || "" };
		if (a.src) return { url: a.src, label: a.title || a.label || "" };
	}
	return null;
}

// Injects a hidden audio player at the top of the reader/content area
export function mountAudio(containerSelector = "#reader") {
	const container = document.querySelector(containerSelector) || document.body;
	if (document.getElementById("audioWrap")) return; // already mounted

	const wrap = document.createElement("div");
	wrap.id = "audioWrap";
	wrap.hidden = true;
	wrap.style.margin = "10px 0 12px";

	const label = document.createElement("div");
	label.id = "audioMeta";
	label.className = "muted";
	label.style.margin = "0 0 6px";
	label.textContent = "Audio";

	const audio = document.createElement("audio");
	audio.id = "packAudio";
	audio.controls = true;
	audio.preload = "auto";
	audio.style.width = "100%";

	wrap.appendChild(label);
	wrap.appendChild(audio);
	container.prepend(wrap);
}

// Prefers node-level audio, falls back to pack-level. Hides player if none.
export function showAudioFor(node, pack) {
	const wrap = document.getElementById("audioWrap");
	const el = document.getElementById("packAudio");
	const meta = document.getElementById("audioMeta");
	if (!wrap || !el) return;

	const na = unwrapAudio(node && (node.audio ?? node.audioUrl));
	const pa = unwrapAudio(pack && (pack.audio ?? pack.audioUrl));
	const chosen = na || pa;

	if (chosen && chosen.url) {
		if (el.src !== chosen.url) {
			el.src = chosen.url;
			try {
				el.load();
			} catch {}
		}
		wrap.hidden = false;
		if (meta) meta.textContent = chosen.label || "Audio";
	} else {
		wrap.hidden = true;
		el.removeAttribute("src");
		try {
			el.load();
		} catch {}
		if (meta) meta.textContent = "";
	}
}

// Optional helper: lets a <input type="file"> set the player source
export function wireAudioFileInput(
	fileInputSelector = "#audioInput",
	labelElSelector = "#audioMeta"
) {
	const input = document.querySelector(fileInputSelector);
	if (!input) return;
	input.addEventListener("change", () => {
		const f = input.files && input.files[0];
		const wrap = document.getElementById("audioWrap");
		const el = document.getElementById("packAudio");
		const meta = document.querySelector(labelElSelector);
		if (!f || !el) return;
		const url = URL.createObjectURL(f);
		el.src = url;
		if (wrap) wrap.hidden = false;
		if (meta) meta.textContent = `Attached: ${f.name}`;
		el.play?.().catch(() => {});
	});
}

// Back-compat for older pages that used initAudio(...)
export function initAudio({ audioInput, player, metaEl } = {}) {
	if (!player) {
		mountAudio();
		player = document.getElementById("packAudio");
	}
	const wrap = document.getElementById("audioWrap");

	function clear() {
		if (!player) return;
		player.removeAttribute("src");
		try {
			player.load();
		} catch {}
		if (metaEl) metaEl.textContent = "";
		if (wrap) wrap.hidden = true;
	}

	function setFromNode(node, pack) {
		const na = unwrapAudio(node && (node.audio ?? node.audioUrl));
		const pa = unwrapAudio(pack && (pack.audio ?? pack.audioUrl));
		const chosen = na || pa;
		if (chosen && chosen.url) {
			if (player.src !== chosen.url) {
				player.src = chosen.url;
				try {
					player.load();
				} catch {}
			}
			if (wrap) wrap.hidden = false;
			if (metaEl) metaEl.textContent = chosen.label || "Bundled audio";
		} else {
			clear();
		}
	}

	if (audioInput) {
		audioInput.addEventListener("change", () => {
			const f = audioInput.files && audioInput.files[0];
			if (!f || !player) return;
			const url = URL.createObjectURL(f);
			player.src = url;
			try {
				player.play();
			} catch {}
			if (metaEl) metaEl.textContent = `Attached: ${f.name}`;
			if (wrap) wrap.hidden = false;
		});
	}

	return { clear, setFromNode };
}
