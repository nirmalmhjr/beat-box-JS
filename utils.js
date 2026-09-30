/**
 * Beat — wraps one audio file.
 */
class Beat {
    constructor(audioSrc) {
        this.audio = new Audio(audioSrc);
        this.audio.preload = "auto";
    }

    play = () => {
        this.audio.currentTime = 0;
        // play() returns a promise that rejects if the browser blocks audio
        this.audio.play().catch(() => {});
    }

    stop = () => {
        this.audio.pause();
        this.audio.currentTime = 0;
    }

    setVolume = (volume, muted) => {
        this.audio.volume = volume;
        this.audio.muted = muted;
    }

    get isPlaying() {
        return !this.audio.paused && !this.audio.ended;
    }

    get progress() {
        const { currentTime, duration } = this.audio;
        return duration ? currentTime / duration : 0;
    }
}

/**
 * Button — the on-screen pad that belongs to one key.
 */
class Button {
    constructor(key) {
        this.element = document.querySelector(`.pad[data-key="${key}"]`);
        this.key = key;
        this.name = this.element.dataset.name;
        this.type = this.element.dataset.type;
        this.createAnimationEndListener();
    }

    createAnimationEndListener = () => {
        this.element.addEventListener("animationend", (event) => {
            if (event.animationName === "pad-hit") this.deselect();
        });
    }

    // Flash the pad. Removing and re-adding the class restarts the
    // animation, so fast repeated hits each get their own flash.
    select = () => {
        this.element.classList.remove("is-hit");
        void this.element.offsetWidth;
        this.element.classList.add("is-hit");
    }

    deselect = () => {
        this.element.classList.remove("is-hit");
    }

    // Held-down state while a key or pointer is pressed
    press = () => this.element.classList.add("is-pressed");
    release = () => this.element.classList.remove("is-pressed");

    setPlaying = (isPlaying) => {
        this.element.classList.toggle("is-playing", isPlaying);
    }

    setProgress = (ratio) => {
        this.element.style.setProperty("--progress", ratio);
    }
}
