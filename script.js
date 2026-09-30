// All the sounds live here. To add or change a sound, edit one line:
// key = keyboard key, group = pad colour (drums / hats / chords)
const SOUNDS = [
    { key: "a", name: "Kick",     group: "drums",  file: "./assets/kit/kick.mp3" },
    { key: "s", name: "Snare",    group: "drums",  file: "./assets/kit/snare.mp3" },
    { key: "d", name: "Clap",     group: "drums",  file: "./assets/kit/clap.mp3" },
    { key: "f", name: "Tom",      group: "drums",  file: "./assets/kit/tom.mp3" },
    { key: "g", name: "Hi-hat",   group: "hats",   file: "./assets/kit/hihat.mp3" },
    { key: "h", name: "Open hat", group: "hats",   file: "./assets/kit/openhat.mp3" },
    { key: "j", name: "A minor",  group: "chords", file: "./assets/kit/chord-am.mp3" },
    { key: "k", name: "F major",  group: "chords", file: "./assets/kit/chord-f.mp3" },
    { key: "l", name: "G major",  group: "chords", file: "./assets/kit/chord-g.mp3" },
];

// Build one pad <button> for each sound
const beatbox = document.getElementById("beatbox");
for (const sound of SOUNDS) {
    beatbox.insertAdjacentHTML("beforeend", `
        <button class="pad pad--${sound.group}" data-key="${sound.key}"
                data-name="${sound.name}" data-type="${sound.group}">
            <span class="pad__key">${sound.key.toUpperCase()}</span>
            <span class="pad__name">${sound.name}</span>
            <span class="pad__type">${sound.group}</span>
            <span class="pad__progress" aria-hidden="true"></span>
        </button>`);
}

const beats = {};
for (const sound of SOUNDS) {
    beats[sound.key] = {
        beat: new Beat(sound.file),
        button: new Button(sound.key),
    };
}

const ui = {
    display: document.getElementById("display"),
    displayKey: document.getElementById("displayKey"),
    displayName: document.getElementById("displayName"),
    displayType: document.getElementById("displayType"),
    displayCount: document.getElementById("displayCount"),
    volume: document.getElementById("volume"),
    volumeValue: document.getElementById("volumeValue"),
    muteBtn: document.getElementById("muteBtn"),
    stopBtn: document.getElementById("stopBtn"),
};

const defaultDisplay = {
    name: ui.displayName.textContent,
    type: ui.displayType.textContent,
};

/* ---------- Volume & mute ---------- */

const mixer = { volume: 0.8, muted: false };

// Restore the last volume setting (storage may be unavailable, so guard it)
try {
    const saved = JSON.parse(localStorage.getItem("beatbox-mixer"));
    if (saved) Object.assign(mixer, saved);
} catch (e) {}

const applyMixer = () => {
    for (const key in beats) beats[key].beat.setVolume(mixer.volume, mixer.muted);

    const percent = Math.round(mixer.volume * 100);
    ui.volume.value = percent;
    ui.volume.style.setProperty("--fill", `${percent}%`);
    ui.volumeValue.textContent = mixer.muted ? "Muted" : `${percent}%`;
    ui.muteBtn.setAttribute("aria-pressed", mixer.muted);
    ui.muteBtn.setAttribute("aria-label", mixer.muted ? "Unmute" : "Mute");
    document.body.classList.toggle("is-muted", mixer.muted);

    try {
        localStorage.setItem("beatbox-mixer", JSON.stringify(mixer));
    } catch (e) {}
};

const toggleMute = () => {
    mixer.muted = !mixer.muted;
    applyMixer();
};

ui.volume.addEventListener("input", () => {
    mixer.volume = ui.volume.value / 100;
    mixer.muted = false;
    applyMixer();
});

ui.muteBtn.addEventListener("click", toggleMute);

/* ---------- Now-playing display ---------- */

const showNowPlaying = (key) => {
    const { button } = beats[key];
    ui.displayKey.textContent = key.toUpperCase();
    ui.displayName.textContent = button.name;
    ui.displayType.textContent = button.type;
    ui.display.dataset.group = button.element.classList[1].replace("pad--", "");

    // Restart the small "bump" animation on each hit
    ui.display.classList.remove("is-bumped");
    void ui.display.offsetWidth;
    ui.display.classList.add("is-bumped");
};

const resetDisplay = () => {
    ui.displayKey.textContent = "—";
    ui.displayName.textContent = defaultDisplay.name;
    ui.displayType.textContent = defaultDisplay.type;
    delete ui.display.dataset.group;
};

/* ---------- Playback progress ---------- */

// One animation loop updates every pad's progress bar while anything plays
let frameId = null;

const updateProgress = () => {
    let playing = 0;
    for (const key in beats) {
        const { beat, button } = beats[key];
        const isPlaying = beat.isPlaying;
        button.setPlaying(isPlaying);
        button.setProgress(isPlaying ? beat.progress : 0);
        if (isPlaying) playing++;
    }

    ui.display.classList.toggle("is-active", playing > 0);
    ui.displayCount.textContent = playing === 0 ? "Ready"
        : playing === 1 ? "1 playing" : `${playing} playing`;

    frameId = playing > 0 ? requestAnimationFrame(updateProgress) : null;
};

const startProgressLoop = () => {
    if (frameId === null) frameId = requestAnimationFrame(updateProgress);
};

/* ---------- Triggering sounds ---------- */

const triggerBeat = (key) => {
    const { beat, button } = beats[key];
    beat.play();
    button.select();
    showNowPlaying(key);
    startProgressLoop();
};

const stopAll = () => {
    for (const key in beats) {
        beats[key].beat.stop();
        beats[key].button.release();
    }
    updateProgress();
    resetDisplay();
};

ui.stopBtn.addEventListener("click", stopAll);

/* ---------- Keyboard ---------- */

document.addEventListener("keydown", (event) => {
    // Leave browser shortcuts like Cmd+S / Ctrl+D alone
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    const key = event.key.toLowerCase();

    if (key in beats) {
        event.preventDefault(); // stops Firefox's find-as-you-type etc.
        beats[key].button.press();
        if (!event.repeat) triggerBeat(key); // holding a key won't machine-gun
    } else if (key === "m" && !event.repeat) {
        toggleMute();
    } else if (key === "escape") {
        stopAll();
    }
});

document.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();
    if (key in beats) beats[key].button.release();
});

// If the window loses focus mid-press, keyup never arrives
window.addEventListener("blur", () => {
    for (const key in beats) beats[key].button.release();
});

/* ---------- Mouse & touch ---------- */

for (const key in beats) {
    const { button } = beats[key];
    const pad = button.element;

    // pointerdown fires immediately, which feels snappier than click
    pad.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;
        button.press();
        triggerBeat(key);
    });

    ["pointerup", "pointerleave", "pointercancel"].forEach((type) =>
        pad.addEventListener(type, button.release)
    );

    // Keyboard activation of a focused pad (Enter / Space) arrives as a
    // click with detail 0; pointer clicks were already handled above.
    pad.addEventListener("click", (event) => {
        if (event.detail === 0) triggerBeat(key);
    });
}

applyMixer();
