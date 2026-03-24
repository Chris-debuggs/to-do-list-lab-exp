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
  
  // Deterministic UI lock for WebAssembly instantiation
  const [isModelReady, setIsModelReady] = useState(false);
  const [displayTodos, setDisplayTodos] = useState<Todo[]>([]);
  
  // Asynchronous RPC mapping for Web Worker promises
  const pendingRequests = useRef(new Map<string, (val: any) => void>());

  // Initial Boot Sequence
  useEffect(() => {
    let mounted = true;
    
    // 1. IndexedDB Async Hydration
    getTodosFromDB().then(storedTodos => {
      if (mounted) {
        dispatch({ type: 'SET_TODOS', payload: storedTodos });
        setIsLoaded(true);
      }
    }).catch(err => {
      console.error('Failed to load DB', err);
      if (mounted) setIsLoaded(true); 
    });

    // 2. Dispatch ping to warm up the tensor pipeline and monitor readiness
    worker.postMessage({ id: 'init', type: 'PING' });
    
    return () => { mounted = false; };
  }, []);

  // Schema Persistence Trigger
  useEffect(() => {
    if (isLoaded) {
      saveTodosToDB(todos).catch(err => console.error('Failed to save to DB', err));
    }
  }, [todos, isLoaded]);

  // RPC Worker Listener
  useEffect(() => {
    worker.onmessage = (e: MessageEvent) => {
      const { id, status, embedding } = e.data;
      
      // Unlock the UI when the pipeline compilation finishes
      if (status === 'READY' || (id === 'init' && status === 'SUCCESS')) {
        setIsModelReady(true);
        return;
      }
      
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
    if (!inputValue.trim() || isEmbedding || !isModelReady) return;
    
    setIsEmbedding(true); // Triggers loading UI preventing double-submission
    try {
      // Offload feature-extraction to WebWorker
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

  // Semantic Search & Filtering
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
      // Sort by semantic similarity descending
      scored.sort((a, b) => b.score - a.score);
      setDisplayTodos(scored);
    });

    return () => { isCancelled = true; };
  }, [todos, filter, searchQuery]);

  return (
    <main className="app" style={{ minHeight: '600px' }}>
      <h1>🧠 Semantic Todo</h1>

      {/* Primary Ingestion Node - Explicit Hierarchy & Flex Alignment */}
      <form className="input-box" style={{ alignItems: 'stretch' }} onSubmit={handleSubmit}>
        <input 
          type="text" 
          placeholder={isEmbedding ? "Extracting features..." : "Add a task..."}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          required 
          disabled={isEmbedding || !isModelReady}
        />
        <select 
          value={priority} 
          onChange={(e) => setPriority(e.target.value as Priority)}
          disabled={isEmbedding || !isModelReady}
          style={{
            padding: '0 10px',
            borderRadius: '12px',
            border: '1px solid rgba(0,0,0,0.1)',
            backgroundColor: 'rgba(255,255,255,0.9)',
            color: 'var(--text-dark)',
            outline: 'none'
          }}
        >
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
        <button type="submit" disabled={isEmbedding || !isModelReady} style={{ display: 'flex', alignItems: 'center' }}>
          {isEmbedding ? '...' : 'Add'}
        </button>
      </form>

      {/* Semantic Search & State Isolation Block */}
      <div style={{ background: 'rgba(255,255,255,0.4)', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid var(--glass-border)' }}>
        
        {/* ML Execution Badge & Query Interface */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
          <input 
            type="text" 
            placeholder={isModelReady ? "Semantic Search (e.g. 'gym stuff')" : "Compiling ML Engine..."} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={!isModelReady}
            style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', border: '1px solid rgba(0,0,0,0.1)' }}
          />
          {!isModelReady && <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>⏳ Init Tensor</span>}
          {isModelReady && <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600, whiteSpace: 'nowrap' }}>✔️ Model Online</span>}
        </div>

        {/* Visibility Filters */}
        <div className="filters" style={{ marginBottom: 0 }}>
          <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
          <button className={`filter-btn ${filter === 'active' ? 'active' : ''}`} onClick={() => setFilter('active')}>Active</button>
          <button className={`filter-btn ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')}>Completed</button>
        </div>

      </div>

      {/* Destructive Batch Mutation Container */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '0 5px' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-gray)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tasks</h3>
        
        <button 
          onClick={purgeCompleted}
          style={{
            background: 'rgba(254, 226, 226, 0.6)',
            color: 'var(--danger-hover)',
            border: '1px solid #fecaca',
            padding: '6px 12px',
            fontSize: '0.8rem',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = 'var(--danger-color)'; e.currentTarget.style.color = '#fff'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(254, 226, 226, 0.6)'; e.currentTarget.style.color = 'var(--danger-hover)'; }}
        >
          Purge Completed
        </button>
      </div>

      {/* Render Tree */}
      <ul>
        {!isLoaded ? (
          // Skeleton Loader pattern for Hydration Phase
          Array.from({ length: 3 }).map((_, i) => (
            <li key={i} style={{ opacity: 0.4 }}>
              <span className="task-text" style={{ background: '#cbd5e1', color: 'transparent', borderRadius: '4px' }}>Loading...</span>
            </li>
          ))
        ) : displayTodos.length === 0 ? (
          <p className="empty-state">{searchQuery ? "No matching semantics." : "Your list is empty."}</p>
        ) : (
          displayTodos.map(todo => (
            <li key={todo.id} className={todo.completed ? 'done' : ''} style={{ borderLeft: `5px solid ${todo.priority === 'High' ? 'var(--danger-color)' : todo.priority === 'Medium' ? '#f59e0b' : '#10b981'}` }}>
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
