import { describe, it, expect } from 'vitest';
import { todoReducer, Todo } from './todoReducer';

describe('todoReducer', () => {
  const dummyTask: Todo = {
    id: '1',
    text: 'Test',
    completed: false,
    createdAt: Date.now(),
    priority: 'Medium',
    embedding: [0.1, 0.2, 0.3]
  };

  it('should set todos', () => {
    const initialState: Todo[] = [];
    const payload = [dummyTask];
    const nextState = todoReducer(initialState, { type: 'SET_TODOS', payload });
    expect(nextState).toEqual(payload);
  });

  it('should add a todo', () => {
    const initialState: Todo[] = [];
    const nextState = todoReducer(initialState, { type: 'ADD_TODO', payload: dummyTask });
    expect(nextState.length).toBe(1);
    expect(nextState[0].text).toBe('Test');
    expect(nextState[0].priority).toBe('Medium');
  });

  it('should toggle a todo completion status', () => {
    const initialState: Todo[] = [dummyTask];
    const nextState = todoReducer(initialState, { type: 'TOGGLE_TODO', payload: '1' });
    expect(nextState[0].completed).toBe(true);
  });

  it('should delete a todo', () => {
    const initialState: Todo[] = [dummyTask];
    const nextState = todoReducer(initialState, { type: 'DELETE_TODO', payload: '1' });
    expect(nextState.length).toBe(0);
  });

  it('should purge completed todos', () => {
    const initialState: Todo[] = [
      dummyTask,
      { ...dummyTask, id: '2', text: 'Done Task', completed: true }
    ];
    const nextState = todoReducer(initialState, { type: 'PURGE_COMPLETED' });
    expect(nextState.length).toBe(1);
    expect(nextState[0].id).toBe('1');
  });
});
