import React, { useReducer, useEffect, useState } from 'react';
import { todoReducer } from './state/todoReducer';
import { getTodosFromDB, saveTodosToDB } from './db/indexedDB';

function App() {
  const [todos, dispatch] = useReducer(todoReducer, []);
  const [inputValue, setInputValue] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [isLoaded, setIsLoaded] = useState(false);

  // Initial load
  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        const storedTodos = await getTodosFromDB();
        if (mounted) {
          dispatch({ type: 'SET_TODOS', payload: storedTodos });
          setIsLoaded(true);
        }
      } catch (err) {
        console.error('Failed to load DB', err);
        setIsLoaded(true);
      }
    };
    loadData();
    return () => { mounted = false; };
  }, []);

  // Save to DB on change
  useEffect(() => {
    if (isLoaded) {
      saveTodosToDB(todos).catch(err => console.error('Failed to save to DB', err));
    }
  }, [todos, isLoaded]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    dispatch({ type: 'ADD_TODO', payload: inputValue.trim() });
    setInputValue('');
    if (filter === 'completed') setFilter('all');
  };

  const filteredTodos = todos.filter(t => {
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  return (
    <main className="app">
      <h1>📝 Todo List</h1>

      <form className="input-box" onSubmit={handleSubmit}>
        <input 
          type="text" 
          placeholder="Add a task..." 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          required 
        />
        <button type="submit">Add</button>
      </form>

      <div className="filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >All</button>
        <button 
          className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
          onClick={() => setFilter('active')}
        >Active</button>
        <button 
          className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >Completed</button>
      </div>

      <ul>
        {filteredTodos.length === 0 ? (
          <p className="empty-state">
            {filter === 'completed' 
              ? "No completed tasks yet." 
              : filter === 'active' 
                ? "No active tasks right now." 
                : "Your list is empty. Add a task!"}
          </p>
        ) : (
          filteredTodos.map(todo => (
            <li key={todo.id} className={todo.completed ? 'done' : ''}>
              <span 
                className="task-text"
                role="button"
                tabIndex={0}
                onClick={() => dispatch({ type: 'TOGGLE_TODO', payload: todo.id })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    dispatch({ type: 'TOGGLE_TODO', payload: todo.id });
                  }
                }}
              >
                {todo.text}
              </span>
              <button 
                className="delete-btn"
                onClick={() => dispatch({ type: 'DELETE_TODO', payload: todo.id })}
                aria-label={`Delete ${todo.text}`}
              >
                ✖
              </button>
            </li>
          ))
        )}
      </ul>
    </main>
  );
}

export default App;
