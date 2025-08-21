// Simple audio attach/play. (We can add IndexedDB persistence later.)
export function initAudio({ audioInput, player, metaEl }) {
	function clear() {
		player.removeAttribute("src");
		player.load();
		metaEl.textContent = "";
	}
	function setFromNode(node) {
		clear();
		if (node && node.audio && node.audio.url) {
			player.src = node.audio.url;
			metaEl.textContent = "Bundled audio";
		}
	}
	audioInput.addEventListener("change", () => {
		const f = audioInput.files && audioInput.files[0];
		if (!f) return;
		const url = URL.createObjectURL(f);
		player.src = url;
		player.play().catch(() => {});
		metaEl.textContent = `Attached: ${f.name}`;
	});
	return { clear, setFromNode };
}
