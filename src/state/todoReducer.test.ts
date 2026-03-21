import { describe, it, expect } from 'vitest';
import { todoReducer, Todo } from './todoReducer';

describe('todoReducer', () => {
  it('should set todos', () => {
    const initialState: Todo[] = [];
    const payload = [{ id: '1', text: 'Test', completed: false }];
    const nextState = todoReducer(initialState, { type: 'SET_TODOS', payload });
    expect(nextState).toEqual(payload);
  });

  it('should add a todo', () => {
    const initialState: Todo[] = [];
    const nextState = todoReducer(initialState, { type: 'ADD_TODO', payload: 'New Task' });
    expect(nextState.length).toBe(1);
    expect(nextState[0].text).toBe('New Task');
    expect(nextState[0].completed).toBe(false);
  });

  it('should toggle a todo completion status', () => {
    const initialState: Todo[] = [{ id: '1', text: 'Task 1', completed: false }];
    const nextState = todoReducer(initialState, { type: 'TOGGLE_TODO', payload: '1' });
    expect(nextState[0].completed).toBe(true);
    
    const finalState = todoReducer(nextState, { type: 'TOGGLE_TODO', payload: '1' });
    expect(finalState[0].completed).toBe(false);
  });

  it('should delete a todo', () => {
    const initialState: Todo[] = [
      { id: '1', text: 'Task 1', completed: false },
      { id: '2', text: 'Task 2', completed: true },
    ];
    const nextState = todoReducer(initialState, { type: 'DELETE_TODO', payload: '1' });
    expect(nextState.length).toBe(1);
    expect(nextState[0].id).toBe('2');
  });
});
