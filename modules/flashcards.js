// Flashcards builder/player (prefers prebuilt cards, falls back to summary heuristics).
import { mdInline } from "./ui.js";

export function initFlashcards({
	cardText,
	countChip,
	barEl,
	btnBuild,
	btnShuffle,
	btnReset,
	btnReveal,
	btnAgain,
	btnGood,
	btnEasy,
	getCurrentNode,
}) {
	let deck = [],
		ix = 0,
		revealed = false;

	function shuffle(a) {
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
	}
	function updateUI() {
		if (!deck.length) {
			cardText.textContent = "No cards. Click “Build from Summary”.";
			countChip.textContent = "0 / 0";
			barEl.style.width = "0%";
			return;
		}
		const c = deck[ix];
		cardText.innerHTML = revealed
			? `<div class="small">Answer</div><div>${mdInline(c.a)}</div>`
			: `<div class="small">Prompt</div><div>${mdInline(c.q)}</div>`;
		countChip.textContent = `${ix + 1} / ${deck.length}`;
		barEl.style.width = `${((ix + 1) / deck.length) * 100}%`;
	}
	function reset() {
		deck = [];
		ix = 0;
		revealed = false;
		updateUI();
	}

	function deriveFromSummary(n) {
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

	function build() {
		const n = getCurrentNode();
		if (!n) return alert("Pick a section first.");
		if (Array.isArray(n.flashcards) && n.flashcards.length)
			deck = n.flashcards.map((fc) => ({ q: fc.q, a: fc.a }));
		else deck = deriveFromSummary(n);
		if (deck.length) {
			shuffle(deck);
			ix = 0;
			revealed = false;
		}
		updateUI();
	}

	btnBuild.onclick = build;
	btnShuffle.onclick = () => {
		if (!deck.length) return;
		shuffle(deck);
		ix = 0;
		revealed = false;
		updateUI();
	};
	btnReset.onclick = reset;
	btnReveal.onclick = () => {
		revealed = !revealed;
		updateUI();
	};
	btnAgain.onclick = () => {
		if (!deck.length) return;
		const cur = deck.splice(ix, 1)[0];
		deck.push(cur);
		if (ix >= deck.length) ix = deck.length - 1;
		revealed = false;
		updateUI();
	};
	btnGood.onclick = () => {
		if (!deck.length) return;
		ix = Math.min(ix + 1, deck.length - 1);
		revealed = false;
		updateUI();
	};
	btnEasy.onclick = btnGood.onclick;

	return { reset, rebuild: build };
}
