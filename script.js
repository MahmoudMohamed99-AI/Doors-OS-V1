
const $ = (selector) => document.querySelector(selector);
const byId = (id) => document.getElementById(id);

let currentTheme = "dark";
let highestWindowLayer = 1002;
let scanInProgress = false;

const openWindows = new Set();

function toggleStartMenu() {
  const menu = byId("startMenu");
  menu.style.display =
    menu.style.display === "block" ? "none" : "block";
}

function openApp(windowId) {
  const win = byId(windowId);

  if (!win) {
    console.error(`Window not found: ${windowId}`);
    return;
  }

  win.style.display = "block";
  win.style.zIndex = ++highestWindowLayer;

  addToTaskbar(windowId);
  makeWindowDraggable(win);
  openWindows.add(windowId);
}

function closeWindow(windowId) {
  const win = byId(windowId);
  if (!win) return;

  win.style.display = "none";
  openWindows.delete(windowId);
  removeFromTaskbar(windowId);
}

function addToTaskbar(windowId) {
  const taskbar = byId("taskbar");
  const win = byId(windowId);

  if (!taskbar || !win || byId(`taskbar-${windowId}`)) return;

  const item = document.createElement("button");
  item.id = `taskbar-${windowId}`;
  item.className = "taskbar-item";
  item.type = "button";
  item.textContent = win.querySelector(".title-bar").textContent
    .replace("X", "")
    .trim();

  item.addEventListener("click", () => {
    if (win.style.display === "none") {
      openApp(windowId);
    } else {
      win.style.zIndex = ++highestWindowLayer;
    }
  });

  taskbar.appendChild(item);
}

function removeFromTaskbar(windowId) {
  byId(`taskbar-${windowId}`)?.remove();
}

function makeWindowDraggable(win) {
  if (win.dataset.draggable === "true") return;
  win.dataset.draggable = "true";

  const titleBar = win.querySelector(".title-bar");
  if (!titleBar) return;

  titleBar.addEventListener("mousedown", (event) => {
    if (event.target.closest("button")) return;

    win.style.zIndex = ++highestWindowLayer;

    const rect = win.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;

    win.style.transform = "none";

    function moveWindow(e) {
      const maxLeft = window.innerWidth - win.offsetWidth;
      const maxTop = window.innerHeight - win.offsetHeight;

      win.style.left = `${Math.max(
        0, Math.min(e.clientX - offsetX, maxLeft)
      )}px`;

      win.style.top = `${Math.max(
        0, Math.min(e.clientY - offsetY, maxTop)
      )}px`;
    }

    function stopDragging() {
      document.removeEventListener("mousemove", moveWindow);
      document.removeEventListener("mouseup", stopDragging);
    }

    document.addEventListener("mousemove", moveWindow);
    document.addEventListener("mouseup", stopDragging);
  });
}

function handleTerminalInput(event) {
  if (event.key !== "Enter") return;

  const input = byId("terminalInput");
  const output = byId("terminalOutput");
  const command = input.value.trim();

  input.value = "";
  if (!command) return;

  const line = document.createElement("div");
  line.style.color = "#00ff00";
  line.textContent = `$ ${command}`;
  output.appendChild(line);

  const [cmd, ...args] = command.split(/\s+/);
  const result = document.createElement("div");

  switch (cmd.toLowerCase()) {
    case "help":
      result.textContent =
        "Commands: help, clear, about, date, echo [text], color [color]";
      break;

    case "clear":
      output.replaceChildren();
      return;

    case "about":
      result.textContent =
        "Doors OS V10.0 — A browser-based desktop simulation.";
      break;

    case "date":
      result.textContent = new Date().toLocaleString();
      break;

    case "echo":
      result.textContent = args.join(" ");
      break;

    case "color": {
      const allowedColors = [
        "red", "green", "blue", "white", "yellow",
        "cyan", "orange", "lime", "magenta"
      ];

      if (allowedColors.includes(args[0]?.toLowerCase())) {
        output.style.color = args[0];
        result.textContent = `Text color changed to ${args[0]}.`;
      } else {
        result.textContent =
          "Usage: color red | green | blue | white | yellow | cyan";
      }
      break;
    }

    default:
      result.textContent = `Command not found: ${command}`;
  }

  output.appendChild(result);
  output.scrollTop = output.scrollHeight;
}

function appendToInput(value) {
  const input = byId("calcInput");
  input.value += value;
}

function clearInput() {
  byId("calcInput").value = "";
}

function deleteLast() {
  const input = byId("calcInput");
  input.value = input.value.slice(0, -1);
}

function calculate() {
  const input = byId("calcInput");
  const expression = input.value.replace(/\s/g, "");

  if (!expression || !/^[\d.+*/()\-]+$/.test(expression)) {
    input.value = "Error";
    return;
  }

  try {
    const tokens = expression.match(
      /\d*\.?\d+|[()+*/-]/g
    );

    if (!tokens || tokens.join("") !== expression) {
      throw new Error("Invalid expression");
    }

    let position = 0;

    function factor() {
      const token = tokens[position++];

      if (token === "+") return factor();
      if (token === "-") return -factor();

      if (token === "(") {
        const value = expressionValue();
        if (tokens[position++] !== ")") throw new Error();
        return value;
      }

      const number = Number(token);
      if (!Number.isFinite(number)) throw new Error();
      return number;
    }

    function term() {
      let value = factor();

      while (tokens[position] === "*" || tokens[position] === "/") {
        const operator = tokens[position++];
        const next = factor();

        if (operator === "/" && next === 0) throw new Error();
        value = operator === "*" ? value * next : value / next;
      }

      return value;
    }

    function expressionValue() {
      let value = term();

      while (tokens[position] === "+" || tokens[position] === "-") {
        const operator = tokens[position++];
        const next = term();
        value = operator === "+" ? value + next : value - next;
      }

      return value;
    }

    const result = expressionValue();

    if (position !== tokens.length || !Number.isFinite(result)) {
      throw new Error("Invalid expression");
    }

    input.value = String(Number(result.toPrecision(12)));
  } catch {
    input.value = "Error";
  }
}

function changeTheme() {
  const calculator = $(".calculator");

  currentTheme = currentTheme === "dark" ? "light" : "dark";
  calculator.style.backgroundColor =
    currentTheme === "dark" ? "#444" : "#f0f0f0";
  calculator.style.color =
    currentTheme === "dark" ? "#fff" : "#000";
}

function startScan() {
  if (scanInProgress) return;

  const progressBar = byId("scanProgress");
  const filesScanned = byId("filesScanned");
  const threatsFound = byId("threatsFound");
  const lastScan = byId("lastScan");

  if (!progressBar || !filesScanned || !threatsFound || !lastScan) return;

  scanInProgress = true;
  let progress = 0;
  let scannedFiles = 0;
  let threats = 0;

  progressBar.style.width = "0%";
  filesScanned.textContent = "0";
  threatsFound.textContent = "0";

  const interval = setInterval(() => {
    progress = Math.min(100, progress + Math.random() * 5);
    scannedFiles += Math.floor(Math.random() * 200) + 20;

    progressBar.style.width = `${progress}%`;
    filesScanned.textContent = scannedFiles.toLocaleString();

    if (progress >= 100) {
      clearInterval(interval);
      scanInProgress = false;
      lastScan.textContent = new Date().toLocaleString();
      showScanResult(threats);
    }
  }, 100);
}

function showScanResult(threats) {
  const notification = document.createElement("div");
  notification.className = "scan-notification";
  notification.textContent =
    `Simulation complete: ${threats} threats detected.`;
  document.body.appendChild(notification);

  setTimeout(() => notification.remove(), 4000);
}

function toggleRealTimeProtection() {
  const status = byId("realTimeStatus");
  const indicator = byId("statusIndicator");

  if (!status || !indicator) return;

  const enabled = status.textContent.trim() !== "Enabled";
  status.textContent = enabled ? "Enabled" : "Disabled";
  status.style.color = enabled ? "#28a745" : "#dc3545";
  indicator.style.backgroundColor = enabled ? "#28a745" : "#dc3545";
}

function openVipApp() {
  let message = byId("vipMessage");

  if (!message) {
    message = document.createElement("div");
    message.id = "vipMessage";
    message.className = "vip-message";
    message.textContent = "VIP Apps — coming soon!";
    document.body.appendChild(message);
  }

  message.style.display = "block";
  setTimeout(() => {
    message.style.display = "none";
  }, 3000);
}

function shutdown() {
  document.body.replaceChildren();

  const message = document.createElement("h1");
  message.textContent = "Doors OS V10.0 — Shut down.";
  document.body.appendChild(message);
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".window").forEach((win) => {
    makeWindowDraggable(win);
  });

  document.querySelectorAll(".close-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const win = button.closest(".window");
      if (win) closeWindow(win.id);
    });
  });
});
