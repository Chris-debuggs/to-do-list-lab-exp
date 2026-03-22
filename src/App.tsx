import React, { useReducer, useEffect, useState, useRef } from 'react';
import { todoReducer, Todo, Priority } from './state/todoReducer';
import { getTodosFromDB, saveTodosToDB } from './db/indexedDB';
// @ts-ignore - Vite worker import pattern
import MLWorker from './worker/ml.worker.ts?worker';

// Instantiate the inference worker strictly outside the component lifecycle
const worker = new MLWorker();

// Core O(N) ranking algorithm
function cosineSimilarity(vecA: number[], vecB: number[]) {
  if (!vecA || !vecB) return 0;
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function App() {
  const [todos, dispatch] = useReducer(todoReducer, []);
  
  const [inputValue, setInputValue] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [displayTodos, setDisplayTodos] = useState<Todo[]>([]);
  
  // Asynchronous RPC mapping for Web Worker promises
  const pendingRequests = useRef(new Map<string, (val: any) => void>());

  // Phase 1: IndexedDB Async Hydration
  useEffect(() => {
    let mounted = true;
    getTodosFromDB().then(storedTodos => {
      if (mounted) {
        dispatch({ type: 'SET_TODOS', payload: storedTodos });
        setIsLoaded(true);
      }
    }).catch(err => {
      console.error('Failed to load DB', err);
      if (mounted) setIsLoaded(true); // Don't crash UI, gracefully recover
    });
    return () => { mounted = false; };
  }, []);

  // Phase 2: Schema Persistance Trigger
  useEffect(() => {
    if (isLoaded) {
      saveTodosToDB(todos).catch(err => console.error('Failed to save to DB', err));
    }
  }, [todos, isLoaded]);

  // Phase 3: RPC Worker Listener
  useEffect(() => {
    worker.onmessage = (e: MessageEvent) => {
      const { id, status, embedding } = e.data;
      if (status === 'SUCCESS' && pendingRequests.current.has(id)) {
        pendingRequests.current.get(id)!(embedding);
        pendingRequests.current.delete(id);
      }
    };
  }, []);

  const getEmbedding = async (text: string): Promise<number[]> => {
    return new Promise((resolve) => {
      const id = Date.now().toString() + Math.random();
      pendingRequests.current.set(id, resolve);
      worker.postMessage({ id, text, type: 'EMBED' });
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isEmbedding) return;
    
    setIsEmbedding(true); // Triggers loading UI preventing double-submission
    try {
      // Offload to WebWorker
      const embedding = await getEmbedding(inputValue.trim());
      
      const newTodo: Todo = {
        id: Date.now().toString(),
        text: inputValue.trim(),
        completed: false,
        createdAt: Date.now(),
        priority,
        embedding,
      };
      
      dispatch({ type: 'ADD_TODO', payload: newTodo });
      setInputValue('');
      setPriority('Medium');
      if (filter === 'completed') setFilter('all');
    } catch (err) {
      console.error("Embedding inference engine failed:", err);
    } finally {
      setIsEmbedding(false);
    }
  };

  const purgeCompleted = () => dispatch({ type: 'PURGE_COMPLETED' });

  // Semantic Search & Rendering Pipeline
  useEffect(() => {
    const activeTodos = todos.filter(t => {
      if (filter === 'active') return !t.completed;
      if (filter === 'completed') return t.completed;
      return true;
    });

    if (!searchQuery.trim()) {
      // Default: sort chronologically descending
      setDisplayTodos(activeTodos.sort((a,b) => b.createdAt - a.createdAt));
      return;
    }

    let isCancelled = false;
    getEmbedding(searchQuery).then(queryEmb => {
      if (isCancelled) return;
      const scored = activeTodos.map(todo => ({
        ...todo,
        score: todo.embedding ? cosineSimilarity(queryEmb, todo.embedding) : 0
      }));
      // Sort by inference semantic similarity descending
      scored.sort((a, b) => b.score - a.score);
      setDisplayTodos(scored);
    });

    return () => { isCancelled = true; };
  }, [todos, filter, searchQuery]);

  return (
    <main className="app">
      <h1>🧠 Semantic Todo</h1>

      <div className="search-box" style={{ marginBottom: '15px' }}>
        <input 
          type="text" 
          placeholder="Semantic Search (e.g. 'gym stuff')" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <form className="input-box" onSubmit={handleSubmit}>
        <input 
          type="text" 
          placeholder={isEmbedding ? "Extracting features..." : "Add a task..."}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          required 
          disabled={isEmbedding}
        />
        <select 
          value={priority} 
          onChange={(e) => setPriority(e.target.value as Priority)}
          disabled={isEmbedding}
          style={{ padding: '0 10px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)' }}
        >
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
        <button type="submit" disabled={isEmbedding}>
          {isEmbedding ? '...' : 'Add'}
        </button>
      </form>

      <div className="filters">
        <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
        <button className={`filter-btn ${filter === 'active' ? 'active' : ''}`} onClick={() => setFilter('active')}>Active</button>
        <button className={`filter-btn ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')}>Completed</button>
        <button className="filter-btn" style={{ color: 'var(--danger-color)', marginLeft: '10px' }} onClick={purgeCompleted}>Purge</button>
      </div>

      <ul>
        {!isLoaded ? (
          // Skeleton Loader pattern for Hydration Phase
          Array.from({ length: 3 }).map((_, i) => (
            <li key={i} style={{ opacity: 0.4 }}>
              <span className="task-text" style={{ background: '#cbd5e1', color: 'transparent', borderRadius: '4px' }}>Loading...</span>
            </li>
          ))
        ) : displayTodos.length === 0 ? (
          <p className="empty-state">No matching tasks.</p>
        ) : (
          displayTodos.map(todo => (
            <li key={todo.id} className={todo.completed ? 'done' : ''} style={{ borderLeft: `6px solid ${todo.priority === 'High' ? 'var(--danger-color)' : todo.priority === 'Medium' ? '#f59e0b' : '#10b981'}` }}>
              <span 
                className="task-text"
                role="button"
                tabIndex={0}
                onClick={() => dispatch({ type: 'TOGGLE_TODO', payload: todo.id })}
              >
                {todo.text}
              </span>
              <button className="delete-btn" onClick={() => dispatch({ type: 'DELETE_TODO', payload: todo.id })}>✖</button>
            </li>
          ))
        )}
      </ul>
    </main>
  );
}

export default App;
