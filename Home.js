console.log('Let’s write JS');

let currentSong = new Audio();
let currFolder;
let songs = [];

const play = document.getElementById("play");
const previous = document.getElementById("previous");
const next = document.getElementById("next");

function secondstominutes(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

const playMusic = (track, pause = false) => {
    currentSong.src = `/songs/${currFolder}/${track}`;
    if (!pause) {
        currentSong.play();
        play.src = "svgs/pause.svg";
    } else {
        play.src = "svgs/play.svg";
    }
    document.querySelector(".songinfo").textContent = decodeURI(track.replace(".mp3", ""));
    document.querySelector(".songtime").textContent = "00:00 / 00:00";
};

async function getSongs(folder) {
    try {
        currFolder = folder;
        let res = await fetch(`/songs/${folder}/`);
        let text = await res.text();
        let div = document.createElement("div");
        div.innerHTML = text;
        let links = div.getElementsByTagName("a");

        songs = [];
        for (let link of links) {
            if (link.href.endsWith(".mp3")) {
                let name = link.href.split("/").pop();
                songs.push(name);
            }
        }

        let songUl = document.querySelector(".songList ul");
        songUl.innerHTML = "";

        for (const song of songs) {
            songUl.innerHTML += `
                <li>
                    <img class="invert" src="svgs/music.svg" alt="">
                    <div class="info">
                        <div>${decodeURIComponent(song)}</div>
                    </div>
                    <div class="playNow">
                        <span>Play Now</span>
                        <img class="invert" src="svgs/play.svg" alt="">
                    </div>
                </li>`;
        }

        // Song click events
        Array.from(document.querySelectorAll(".songList li")).forEach(li => {
            li.addEventListener("click", () => {
                const name = li.querySelector(".info").innerText.trim();
                playMusic(name);
            });
        });

    return songs;

    } catch (err) {
        console.error("Error fetching songs:", err);
        alert("Failed to load songs. Check server or folder name.");
    }
}

async function displayAlbums() {
    let res = await fetch(`/songs/`);
    let html = await res.text();
    let div = document.createElement("div");
    div.innerHTML = html;

    let anchors = div.getElementsByTagName("a");
    let array = Array.from(anchors);

    let cardContainer = document.querySelector(".cardContainer");

    for (let a of array) {
        let href = a.getAttribute("href");

        if (!href || href === "/songs/" || href.endsWith("../")) continue;

        let folder = href.replace(/\/$/, "").split("/").pop();
        if (folder.startsWith(".") || folder.toLowerCase().includes(".ds_store")) continue;

        try {
            let meta = await fetch(`/songs/${folder}/info.json`);
            if (!meta.ok) throw new Error("Missing info.json");

            let info = await meta.json();

            cardContainer.innerHTML += `
                <div class="card" data-folder="${folder}">
                    <div class="play">
                        <div class="svg-wrapper">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="black">
                                <path d="M18.89 12.846c-.353 1.343-2.024 2.292-5.365 4.19-3.23 1.835-4.845 2.752-6.146 2.383a3.747 3.747 0 01-1.424-.841C5 17.614 5 15.743 5 12s0-5.614.955-6.579a3.747 3.747 0 011.424-.841c1.302-.368 2.916.55 6.146 2.384 3.34 1.898 5.012 2.847 5.365 4.19.146.554.146 1.137 0 1.691z" stroke="black" stroke-width="1.5" stroke-linejoin="round"/>
                            </svg>
                        </div>
                    </div>
                    <img src="/songs/${folder}/cover.webp" height="200px" alt="${info.title}">
                    <h2>${info.title}</h2>
                    <p>${info.description}</p>
                </div>`;
        } catch (err) {
            console.warn(`Skipping ${folder}:`, err.message);
        }
    }

    // Attach listeners AFTER cards are rendered
    Array.from(document.querySelectorAll(".card")).forEach(card => {
        card.addEventListener("click", async () => {
            const folder = card.dataset.folder;
            const loaded = await getSongs(folder);
            if (loaded.length) playMusic(loaded[0]);
        });
    });
}

async function main() {
    currentSong.volume = 0.5;

    await getSongs("Saiyaara"); // Default load
    playMusic(songs[0], true);

    await displayAlbums(); // Load albums

    // Toggle play/pause
    play.addEventListener("click", () => {
        if (currentSong.paused) {
            currentSong.play();
            play.src = "svgs/pause.svg";
        } else {
            currentSong.pause();
            play.src = "svgs/play.svg";
        }
    });

    // Keyboard spacebar
    document.addEventListener("keydown", (e) => {
        if (e.code === "Space") {
            e.preventDefault();
            play.click();
        }
    });

    // Update song time
    currentSong.addEventListener("timeupdate", () => {
        document.querySelector(".songtime").textContent = `${secondstominutes(currentSong.currentTime)} / ${secondstominutes(currentSong.duration)}`;
        document.querySelector(".circle").style.left = (currentSong.currentTime / currentSong.duration) * 100 + "%";
    });

    // Seek bar click
    document.querySelector(".seekbar").addEventListener("click", (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        document.querySelector(".circle").style.left = `${percent * 100}%`;
        currentSong.currentTime = percent * currentSong.duration;
    });

    // Side menu open/close
    document.querySelector(".hamburger").addEventListener("click", () => {
        document.querySelector(".left").style.left = "0";
    });
    document.querySelector(".close").addEventListener("click", () => {
        document.querySelector(".left").style.left = "-120%";
    });

    // Prev/next
    previous.addEventListener("click", () => {
        let i = songs.indexOf(currentSong.src.split("/").pop());
        if (i > 0) playMusic(songs[i - 1]);
    });
    next.addEventListener("click", () => {
        let i = songs.indexOf(currentSong.src.split("/").pop());
        if (i < songs.length - 1) playMusic(songs[i + 1]);
    });

    document.addEventListener("keydown", (e) => {
        if (e.code === "ArrowRight") {
            let currentSongName = currentSong.src.split("/").pop();
            let index = songs.indexOf(currentSongName);
            if (index !== -1 && index < songs.length - 1) 
            {
                playMusic(songs[index + 1]);
            }
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.code === "ArrowLeft") {
            let currentSongName = currentSong.src.split("/").pop();
            let index = songs.indexOf(currentSongName);
            if (index !== -1 && index > 0) {
                playMusic(songs[index - 1]);
            }
        }
    });


    // Volume slider
    document.querySelector(".range input").addEventListener("change", (e) => {
        currentSong.volume = parseInt(e.target.value) / 100;

    });

    //Add event listener to mute the track

    document.querySelector(".volume>img").addEventListener("click",(e)=>{
        console.log(e.target);
        if(e.target.src.includes("svgs/volume.svg")){
            e.target.src="svgs/mute.svg";
            currentSong.volume=0;
            document.querySelector(".range").getElementsByTagName("input")[0].value=0;
        }
        else{
            e.target.src="svgs/volume.svg"
            currentSong.volume=0.5;
            document.querySelector(".range").getElementsByTagName("input")[0].value=50;
        }
    })
}
main();
