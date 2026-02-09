const input = document.getElementById("todo-input");
const list = document.getElementById("todo-list");

function addTodo() {
  const text = input.value.trim();
  if (!text) return;

  const li = document.createElement("li");
  const span = document.createElement("span");
  span.textContent = text;

  span.onclick = () => li.classList.toggle("done");

  const del = document.createElement("button");
  del.textContent = "✖";
  del.onclick = () => li.remove();

  li.appendChild(span);
  li.appendChild(del);
  list.appendChild(li);

  input.value = "";
}

/* ===== SAVE AS PNG ===== */
function saveAsImage() {
  const app = document.getElementById("todo-app");

  html2canvas(app).then(canvas => {
    const link = document.createElement("a");
    link.download = "todo-list.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
}
