const canvas = document.getElementById("pixelCanvas");
const ctx = canvas.getContext("2d");

/* UI */
const colorPicker = document.getElementById("colorPicker");

const pencilBtn = document.getElementById("pencilBtn");
const eraserBtn = document.getElementById("eraserBtn");
const bucketBtn = document.getElementById("bucketBtn");

const clearBtn = document.getElementById("clearBtn");

const paletteDiv = document.getElementById("palette");
const newColor = document.getElementById("newColor");
const addColorBtn = document.getElementById("addColor");

const layerList = document.getElementById("layerList");
const frameList = document.getElementById("frameList");

const addLayerBtn = document.getElementById("addLayer");
const addFrameBtn = document.getElementById("addFrame");

const exportPNG = document.getElementById("exportPNG");
const exportJPG = document.getElementById("exportJPG");
const exportSheetBtn = document.createElement("button");
exportSheetBtn.textContent = "Export Sprite Sheet";

document.getElementById("toolbar").appendChild(exportSheetBtn);

const refImg = document.getElementById("referenceImage");
const refUpload = document.getElementById("referenceUpload");
const refOpacity = document.getElementById("refOpacity");
const toggleRef = document.getElementById("toggleRef");
const saveBtn = document.createElement("button");
saveBtn.textContent = "Save";

const loadBtn = document.createElement("button");
loadBtn.textContent = "Load";

const exportBtn = document.createElement("button");
exportBtn.textContent = "Export File";

const importInput = document.createElement("input");
importInput.type = "file";
importInput.accept = ".json";
const onionBtn = document.createElement("button");
onionBtn.textContent = "Onion Skin: ON";
document.getElementById("toolbar").appendChild(onionBtn);

onionBtn.onclick = () => {
    onionSkin = !onionSkin;
    onionBtn.textContent = onionSkin ? "Onion Skin: ON" : "Onion Skin: OFF";
    draw();
};
document.getElementById("toolbar").appendChild(saveBtn);
document.getElementById("toolbar").appendChild(loadBtn);
document.getElementById("toolbar").appendChild(exportBtn);
document.getElementById("toolbar").appendChild(importInput);
saveBtn.onclick = saveProject;
loadBtn.onclick = loadProject;
exportBtn.onclick = exportProject;

importInput.onchange = e => {
    const file = e.target.files[0];
    if (file) importProject(file);
};
/* NEW ZOOM CONTROLS (add buttons in HTML if you want later) */
const zoomInBtn = document.createElement("button");
const zoomOutBtn = document.createElement("button");
zoomInBtn.textContent = "Zoom +";
zoomOutBtn.textContent = "Zoom -";
document.getElementById("toolbar").appendChild(zoomInBtn);
document.getElementById("toolbar").appendChild(zoomOutBtn);
const playBtn = document.createElement("button");
playBtn.textContent = "Play";
document.getElementById("toolbar").appendChild(playBtn);
playBtn.onclick = () => {
    isPlaying = !isPlaying;

    if (isPlaying) {
        playBtn.textContent = "Pause";

        playInterval = setInterval(() => {
            currentFrame++;

            const maxFrames = layers[0].frames.length;

            if (currentFrame >= maxFrames) {
                currentFrame = 0;
            }

            renderFrames();
            draw();
        }, 1000 / fps);
    } else {
        playBtn.textContent = "Play";
        clearInterval(playInterval);
    }
};
/* SETTINGS */
let gridSize = 32;
let onionSkin = true;
let onionOpacity = 0.25;

/* THIS FIXES YOUR CANVAS BUG */
let pixelSize = 20; // base zoom size
let zoom = 1;

function resizeCanvas() {
    canvas.width = gridSize * pixelSize;
    canvas.height = gridSize * pixelSize;

    canvas.style.width = (gridSize * pixelSize * zoom) + "px";
    canvas.style.height = (gridSize * pixelSize * zoom) + "px";

    draw();
}
function duplicateFrame() {
    for (let l = 0; l < layers.length; l++) {
        const layer = layers[l];

        const frame = layer.frames[currentFrame];
        const copy = JSON.parse(JSON.stringify(frame));

        layer.frames.splice(currentFrame + 1, 0, copy);
    }

    currentFrame++;
    renderFrames();
    draw();
}
function exportSpriteSheet() {

    const frameCount = layers[0].frames.length;

    const temp = document.createElement("canvas");
    const tctx = temp.getContext("2d");

    temp.width = gridSize * frameCount;
    temp.height = gridSize;

    for (let f = 0; f < frameCount; f++) {

        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {

                let pixel = null;

                for (let l = 0; l < layers.length; l++) {

                    const layer = layers[l];

                    if (!layer.visible) continue;

                    const frame = layer.frames?.[f];
                    if (!frame) continue;

                    const val = frame[y]?.[x];

                    if (val) pixel = val;
                }

                if (pixel) {
                    tctx.fillStyle = pixel;

                    tctx.fillRect(
                        x + (f * gridSize),
                        y,
                        1,
                        1
                    );
                }
            }
        }
    }

    const link = document.createElement("a");

    link.download = "spritesheet.png";
    link.href = temp.toDataURL("image/png");
    link.click();
}
exportSheetBtn.onclick = exportSpriteSheet;
function deleteFrame() {
    if (layers[0].frames.length <= 1) return;

    for (let l = 0; l < layers.length; l++) {
        layers[l].frames.splice(currentFrame, 1);
    }

    currentFrame--;

    if (currentFrame < 0) currentFrame = 0;

    renderFrames();
    draw();
}
const dupBtn = document.createElement("button");
dupBtn.textContent = "Duplicate Frame";

const delBtn = document.createElement("button");
delBtn.textContent = "Delete Frame";

document.getElementById("toolbar").appendChild(dupBtn);
document.getElementById("toolbar").appendChild(delBtn);
dupBtn.onclick = duplicateFrame;
delBtn.onclick = deleteFrame;
function safeSetFrame(index) {
    currentFrame = index;

    for (let l = 0; l < layers.length; l++) {
        clampFrameIndex(layers[l]);
    }

    renderFrames();
    draw();
}
canvas.addEventListener("mousemove", e => {
    if (e.altKey) {
        canvas.style.cursor = "crosshair";
    } else {
        canvas.style.cursor = "default";
    }
});

/* STATE */
let tool = "pencil";
let color = "#000000";
let drawing = false;
let lastPos = null;
let showGrid = true;
let history = [];
let redoStack = [];
let currentFrame = 0;
let isPlaying = false;
let fps = 6;
let playInterval = null;

const MAX_HISTORY = 30;

/* LAYERS */
let layers = [];
let currentLayer = 0;

/* GRID */
function emptyGrid() {
    const grid = [];

    for (let y = 0; y < gridSize; y++) {
        const row = [];
        for (let x = 0; x < gridSize; x++) {
            row.push(null);
        }
        grid.push(row);
    }

    return grid;
}
function saveProject() {
    const data = {
        gridSize,
        pixelSize,
        layers,
        currentLayer,
        currentFrame
    };

    localStorage.setItem("pixelProject", JSON.stringify(data));
    alert("Project saved!");
}
function loadProject() {
    const raw = localStorage.getItem("pixelProject");
    if (!raw) return alert("No saved project found!");

    const data = JSON.parse(raw);

    gridSize = data.gridSize;
    pixelSize = data.pixelSize;
    layers = data.layers;
    currentLayer = data.currentLayer;
    currentFrame = data.currentFrame;

    resizeCanvas();
    renderLayers();
    renderFrames?.();
    draw();

    alert("Project loaded!");
}
function exportProject() {
    const data = {
        gridSize,
        pixelSize,
        layers,
        currentLayer,
        currentFrame
    };

    const blob = new Blob([JSON.stringify(data)], {
        type: "application/json"
    });

    const a = document.createElement("a");
    a.download = "pixel-project.json";
    a.href = URL.createObjectURL(blob);
    a.click();
}
function importProject(file) {
    const reader = new FileReader();

    reader.onload = e => {
        const data = JSON.parse(e.target.result);

        gridSize = data.gridSize;
        pixelSize = data.pixelSize;
        layers = data.layers;
        currentLayer = data.currentLayer;
        currentFrame = data.currentFrame;

        resizeCanvas();
        renderLayers();
        renderFrames?.();
        draw();
    };

    reader.readAsText(file);
}
function getFrame(layerIndex, frameIndex) {
    const layer = layers[layerIndex];

    if (!layer || !layer.frames) return null;

    if (!layer.frames[frameIndex]) {
        layer.frames[frameIndex] = emptyGrid();
    }

    return layer.frames[frameIndex];
}
function ensureFrameExists(layerIndex, frameIndex) {
    const layer = layers[layerIndex];

    if (!layer.frames[frameIndex]) {
        layer.frames[frameIndex] = emptyGrid();
    }
}
function init() {
    layers = [
    {
        name: "Layer 1",
        frames: [emptyGrid()],
        visible: true
    }
];

    currentLayer = 0;
    currentFrame = 0;

    resizeCanvas();
    renderLayers();
    renderFrames();
}
function undo() {
    if (history.length === 0) return;

    redoStack.push(JSON.stringify(layers));
    layers = JSON.parse(history.pop());

    draw();
    renderLayers();
}
function getFrame(layerIndex, frameIndex) {
    const layer = layers[layerIndex];
    if (!layer) return null;

    if (!layer.frames) layer.frames = [];

    if (!layer.frames[frameIndex]) {
        layer.frames[frameIndex] = emptyGrid();
    }

    return layer.frames[frameIndex];
}
function redo() {
    if (redoStack.length === 0) return;

    history.push(JSON.stringify(layers));
    layers = JSON.parse(redoStack.pop());

    draw();
    renderLayers();
}

function saveState() {
    history.push(JSON.stringify(layers));

    if (history.length > MAX_HISTORY) {
        history.shift();
    }

    redoStack = [];
}

/* COORDINATES (ZOOM SAFE FIX) */
function getPixel(e) {
    const rect = canvas.getBoundingClientRect();

    const scaleX = gridSize * pixelSize;
    const scaleY = gridSize * pixelSize;

    const x = Math.floor(((e.clientX - rect.left) / rect.width) * gridSize);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * gridSize);

    return { x, y };
}

/* GET/SET */
function getPixelVal(x, y) {
    const frame = getFrame(currentLayer, currentFrame);
    if (!frame) return null;

    return frame[y]?.[x] ?? null;
}
function setPixel(x, y, val) {
    const frame = getFrame(currentLayer, currentFrame);
    if (!frame) return;

    frame[y][x] = val;
}
function clampFrameIndex(layer) {
    if (layer.frames.length === 0) {
        layer.frames.push(emptyGrid());
    }

    if (currentFrame >= layer.frames.length) {
        currentFrame = layer.frames.length - 1;
    }

    if (currentFrame < 0) {
        currentFrame = 0;
    }
}
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const prevFrameIndex = currentFrame - 1;
    const nextFrameIndex = currentFrame + 1;

    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {

            let finalPixel = null;

            /* =========================
                ONION SKIN (PREV FRAME)
            ========================== */
            if (onionSkin && prevFrameIndex >= 0) {
                for (let l = 0; l < layers.length; l++) {
                    const layer = layers[l];
                    if (!layer?.visible) continue;

                    const frame = layer.frames?.[prevFrameIndex];
                    const val = frame?.[y]?.[x];

                    if (val) {
                        ctx.globalAlpha = onionOpacity;
                        ctx.fillStyle = val;
                        ctx.fillRect(
                            x * pixelSize,
                            y * pixelSize,
                            pixelSize,
                            pixelSize
                        );
                        ctx.globalAlpha = 1;
                    }
                }
            }

            /* =========================
                CURRENT FRAME (REAL)
            ========================== */
            for (let l = 0; l < layers.length; l++) {
                const layer = layers[l];
                if (!layer?.visible) continue;

                const frame = layer.frames?.[currentFrame];
                const val = frame?.[y]?.[x];

                if (val) finalPixel = val;
            }

            if (finalPixel) {
                ctx.fillStyle = finalPixel;
                ctx.fillRect(
                    x * pixelSize,
                    y * pixelSize,
                    pixelSize,
                    pixelSize
                );
            }

            /* =========================
                GRID
            ========================== */
            ctx.strokeStyle = "#333";
            ctx.strokeRect(
                x * pixelSize,
                y * pixelSize,
                pixelSize,
                pixelSize
            );
        }
    }
}
/* PAINT */
function paint(e) {
    const { x, y } = getPixel(e);

    if (x < 0 || y < 0 || x >= gridSize || y >= gridSize) return;

    /*  EYEDROPPER (ALT + CLICK) */
    if (e.altKey) {
        const picked = pickColor(x, y);

        if (picked) {
            color = picked;
            colorPicker.value = picked;
            tool = "pencil";
        }

        return;
    }

    /* DRAWING */
    if (tool === "pencil") {
        setPixel(x, y, color);
    }
    else if (tool === "eraser") {
        setPixel(x, y, null);
    }
    else if (tool === "bucket") {
        floodFill(x, y, getPixelVal(x, y), color);
    }

    draw();
}

/* SMOOTH DRAW */
function drawLine(x0, y0, x1, y1) {
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    let sx = x0 < x1 ? 1 : -1;
    let sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
        setPixel(x0, y0, color);

        if (x0 === x1 && y0 === y1) break;

        let e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x0 += sx; }
        if (e2 < dx) { err += dx; y0 += sy; }
    }
}
/* ---------------- CLEAR GRID ---------------- */
function clearGrid() {
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            layers[currentLayer][y][x] = null;
        }
    }
    draw();
}

/* ---------------- FLOOD FILL (BUCKET FIX) ---------------- */
function floodFill(x, y, target, replacement) {
    if (target === replacement) return;

    const frame = getFrame(currentLayer, currentFrame);
    if (!frame) return;

    const stack = [[x, y]];

    while (stack.length) {
        const [cx, cy] = stack.pop();

        if (
            cx < 0 || cy < 0 ||
            cx >= gridSize || cy >= gridSize
        ) continue;

        if (frame[cy]?.[cx] !== target) continue;

        frame[cy][cx] = replacement;

        stack.push([cx + 1, cy]);
        stack.push([cx - 1, cy]);
        stack.push([cx, cy + 1]);
        stack.push([cx, cy - 1]);
    }

    draw();
}
function pickColor(x, y) {
    // scan from top layer down (like real editors)
    for (let i = layers.length - 1; i >= 0; i--) {
        if (!layers[i].visible) continue;

        const frame = layers[i].frames?.[currentFrame];
        const val = frame?.[y]?.[x];
        if (val) return val;
    }
    return null;
}
/* EVENTS */
canvas.addEventListener("mousedown", e => {
    drawing = true;
    paint(e);
});

canvas.addEventListener("mousemove", e => {
    if (!drawing) return;

    if (lastPos && tool === "pencil") {
        const { x, y } = getPixel(e);
        drawLine(lastPos.x, lastPos.y, x, y);
        draw();
    } else {
        paint(e);
    }

    lastPos = getPixel(e);
});

canvas.addEventListener("mouseup", () => {
    drawing = false;
    lastPos = null;
});

/* TOOLS */
pencilBtn.onclick = () => tool = "pencil";
eraserBtn.onclick = () => tool = "eraser";
bucketBtn.onclick = () => tool = "bucket";
clearBtn.onclick = () => {
    const frame = getFrame(currentLayer, currentFrame);
    if (!frame) return;

    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            frame[y][x] = null;
        }
    }

    draw();
};

colorPicker.oninput = e => color = e.target.value;
function renderFrames() {
    frameList.innerHTML = "";

    const frameCount = layers[0].frames.length;

    for (let i = 0; i < frameCount; i++) {
        const div = document.createElement("div");
        div.className = "frame-item";
        div.textContent = "Frame " + (i + 1);

        div.style.border = i === currentFrame ? "2px solid yellow" : "none";

        div.onclick = () => {
            currentFrame = i;
            renderFrames();
            draw();
        };

        frameList.appendChild(div);
    }
}
addFrameBtn.onclick = () => {
    for (let l = 0; l < layers.length; l++) {
        layers[l].frames.push(emptyGrid());
    }

    currentFrame++;
    renderFrames();
    draw();
};
/* LAYERS */
function renderLayers() {
    layerList.innerHTML = "";

    layers.forEach((layer, i) => {
        const div = document.createElement("div");
        div.className = "layer-item";

        div.textContent =
            (layer.visible ? " " : " ") + layer.name;

        div.style.border = i === currentLayer ? "2px solid yellow" : "none";

        /* select layer */
        div.onclick = () => {
            currentLayer = i;
            renderLayers();
            draw();
        };
        div.ondblclick = () => {
            const newName = prompt("Rename layer:", layer.name);
            if (newName) {
                layer.name = newName;
                renderLayers();
            }
        };

        /* right click = toggle visibility */
        div.oncontextmenu = (e) => {
            e.preventDefault();
            layer.visible = !layer.visible;
            renderLayers();
            draw();
        };

        layerList.appendChild(div);
    });
}

addLayerBtn.onclick = () => {
    const newIndex = layers.length + 1;

    layers.push({
        name: "Layer " + newIndex,
        frames: [emptyGrid()],
        visible: true
    });

    currentLayer = layers.length - 1;
    currentFrame = 0;

    renderLayers();
    renderFrames();
};

/* EXPORT */
function exportImage(type) {
    const temp = document.createElement("canvas");
    const tctx = temp.getContext("2d");

    temp.width = gridSize;
    temp.height = gridSize;

    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            const px = getPixelVal(x, y);
            if (px) {
                tctx.fillStyle = px;
                tctx.fillRect(x, y, 1, 1);
            }
        }
    }

    const a = document.createElement("a");
    a.download = "sprite." + type;
    a.href = temp.toDataURL("image/" + type);
    a.click();
}

exportPNG.onclick = () => exportImage("png");
exportJPG.onclick = () => exportImage("jpeg");

/* ZOOM CONTROLS */
function setZoom(z) {
    zoom = Math.max(0.5, Math.min(5, z));
    resizeCanvas();
}

zoomInBtn.onclick = () => setZoom(zoom + 0.25);
zoomOutBtn.onclick = () => setZoom(zoom - 0.25);

canvas.addEventListener("wheel", e => {
    e.preventDefault();

    setZoom(e.deltaY < 0 ? zoom + 0.1 : zoom - 0.1);
});
/* REFERENCE IMAGE */
refUpload.onchange = e => {
    const f = e.target.files[0];
    if (!f) return;
    refImg.src = URL.createObjectURL(f);
};

refOpacity.oninput = e => {
    refImg.style.opacity = e.target.value;
};

toggleRef.onclick = () => {
    refImg.style.display =
        refImg.style.display === "none" ? "block" : "none";
};

/* START */
init();
document.addEventListener("keydown", e => {
    if (e.ctrlKey && e.key === "z") undo();
    if (e.ctrlKey && e.key === "y") redo();
});
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js");
}
