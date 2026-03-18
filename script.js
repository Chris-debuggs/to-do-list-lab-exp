// State
let todos = [];
let currentFilter = 'all';

// DOM Elements
const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const list = document.getElementById("todo-list");
const filters = document.querySelectorAll(".filter-btn");

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  const savedTodos = localStorage.getItem('todos');
  if (savedTodos) {
    todos = JSON.parse(savedTodos);
  }
  renderTodos();
});

// Add Todo
form.addEventListener("submit", (e) => {
  e.preventDefault();
  
  const text = input.value.trim();
  if (!text) return;

  const newTodo = {
    id: Date.now().toString(),
    text,
    completed: false
  };

  todos.push(newTodo);
  saveTodos();
  input.value = "";
  
  // If we're viewing 'completed', switch to 'all' so we can see the new item
  if (currentFilter === 'completed') {
    setFilter('all');
  } else {
    renderTodos();
  }
});

// Delete Todo
function deleteTodo(id) {
  const element = document.getElementById(`todo-${id}`);
  
  // Add fade out animation class before removing
  if (element) {
    element.classList.add('fade-out');
    
    // Wait for animation to finish before updating state and re-rendering
    setTimeout(() => {
      todos = todos.filter(t => t.id !== id);
      saveTodos();
      renderTodos();
    }, 300); // 300ms matches the CSS animation duration
  } else {
    todos = todos.filter(t => t.id !== id);
    saveTodos();
    renderTodos();
  }
}

// Toggle Todo Completed
function toggleTodo(id) {
  todos = todos.map(t => {
    if (t.id === id) {
      return { ...t, completed: !t.completed };
    }
    return t;
  });
  saveTodos();
  renderTodos();
}

// Filter Logic
filters.forEach(btn => {
  btn.addEventListener('click', () => {
    setFilter(btn.dataset.filter);
  });
});

function setFilter(filterType) {
  currentFilter = filterType;
  
  // Update active state on buttons
  filters.forEach(btn => {
    if (btn.dataset.filter === filterType) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  renderTodos();
}

// Save to LocalStorage
function saveTodos() {
  localStorage.setItem('todos', JSON.stringify(todos));
}

// Render Logic
function renderTodos() {
  list.innerHTML = "";

  const filteredTodos = todos.filter(t => {
    if (currentFilter === 'active') return !t.completed;
    if (currentFilter === 'completed') return t.completed;
    return true;
  });

  if (filteredTodos.length === 0) {
    const emptyMsg = document.createElement("p");
    emptyMsg.className = "empty-state";
    if (currentFilter === 'completed') {
      emptyMsg.textContent = "No completed tasks yet.";
    } else if (currentFilter === 'active') {
      emptyMsg.textContent = "No active tasks right now.";
    } else {
      emptyMsg.textContent = "Your list is empty. Add a task!";
    }
    list.appendChild(emptyMsg);
    return;
  }

  filteredTodos.forEach(todo => {
    const li = document.createElement("li");
    li.id = `todo-${todo.id}`;
    if (todo.completed) {
      li.classList.add("done");
    }

    const span = document.createElement("span");
    span.className = "task-text";
    span.textContent = todo.text;
    span.onclick = () => toggleTodo(todo.id);
    
    // Accessibility: make it clear it's clickable
    span.setAttribute('role', 'button');
    span.setAttribute('tabindex', '0');
    // Allow enter key to toggle completion as well
    span.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleTodo(todo.id);
      }
    };

    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.textContent = "✖";
    delBtn.setAttribute('aria-label', `Delete ${todo.text}`);
    delBtn.onclick = () => deleteTodo(todo.id);

    li.appendChild(span);
    li.appendChild(delBtn);
    list.appendChild(li);
  });
}

/* ===== SAVE AS PNG ===== */
function saveAsImage() {
  const app = document.getElementById("todo-app");

  // We temporarily modify some styles to ensure html2canvas captures cleanly
  const originalBoxShadow = app.style.boxShadow;
  // Sometime glassmorphism doesn't render well in canvas so we make it solid
  app.style.background = "#ffffff"; 
  app.style.boxShadow = "none";
  
  html2canvas(app, {
    scale: 2, // Higher resolution
    backgroundColor: null
  }).then(canvas => {
    // Restore original styles
    app.style.background = "";
    app.style.boxShadow = originalBoxShadow;
    
    const link = document.createElement("a");
    link.download = "todo-list.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
}
